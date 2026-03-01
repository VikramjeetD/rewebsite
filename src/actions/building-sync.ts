"use server";

import { auth } from "@/lib/auth";
import { extractBuildingFromText } from "@/lib/extraction/extractor";
import {
  getListingsByAddress,
  updateListing,
  addStatusChange,
  saveBuildingAmenities,
} from "@/lib/firestore";
import { getDb } from "@/lib/firebase";
import { slugify, normalizeUnit, generateTitle } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { cleanupListingAssets } from "@/lib/cleanup";
import { revalidateListingPaths } from "@/lib/revalidate";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  BuildingExtractionResult,
  BuildingSyncComparison,
  BuildingUnit,
  Listing,
} from "@/types";

export async function extractBuildingFromContent(
  content: string,
  sourceUrl?: string
): Promise<{
  success: boolean;
  data?: BuildingExtractionResult;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: "No content provided" };

    const extracted = await extractBuildingFromText(trimmed, sourceUrl);

    if (!extracted.units.length) {
      return { success: false, error: "No units found in the content" };
    }

    return { success: true, data: extracted };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Extraction failed",
    };
  }
}

export async function compareBuildingListings(
  extraction: BuildingExtractionResult
): Promise<{
  success: boolean;
  data?: BuildingSyncComparison;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const existingListings = await getListingsByAddress(extraction.address);

    const activeListings = existingListings.filter((l) =>
      ACTIVE_STATUSES.includes(l.status)
    );

    const existingByUnit = new Map<string, Listing>();
    for (const listing of activeListings) {
      if (listing.unit) {
        const key = normalizeUnit(listing.unit);
        existingByUnit.set(key, listing);
      }
    }

    const extractedUnitKeys = new Set<string>();
    for (const unit of extraction.units) {
      extractedUnitKeys.add(normalizeUnit(unit.unit));
    }

    const removed: BuildingSyncComparison["removed"] = [];
    const added: BuildingSyncComparison["added"] = [];
    const unchanged: BuildingSyncComparison["unchanged"] = [];

    for (const [unitKey, listing] of existingByUnit) {
      if (!extractedUnitKeys.has(unitKey)) {
        removed.push({ listing, unit: listing.unit! });
      }
    }

    for (const unit of extraction.units) {
      const unitKey = normalizeUnit(unit.unit);
      const existingListing = existingByUnit.get(unitKey);

      if (existingListing) {
        unchanged.push({ listing: existingListing, unit });
      } else {
        added.push({ unit });
      }
    }

    return {
      success: true,
      data: {
        address: extraction.address,
        removed,
        added,
        unchanged,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Comparison failed",
    };
  }
}

export async function executeBuildingSync(params: {
  extraction: BuildingExtractionResult;
  removeListingIds: string[];
  addUnits: BuildingUnit[];
  sourceUrl?: string;
}): Promise<{
  success: boolean;
  data?: { removed: number; created: number };
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const { extraction, removeListingIds, addUnits, sourceUrl } = params;

    // Mark selected listings as OFF_MARKET (sequential — involves external Blob cleanup)
    for (const listingId of removeListingIds) {
      await updateListing(listingId, { status: "OFF_MARKET" });
      await addStatusChange(listingId, {
        fromStatus: "ACTIVE",
        toStatus: "OFF_MARKET",
        source: "IMPORT",
        notes: "Building sync: unit no longer listed",
      });
      await cleanupListingAssets(listingId);
    }

    // Geocode once for the building
    const neighborhood = extraction.neighborhood ?? "Unknown";
    const borough = extraction.borough ?? "Manhattan";
    const coords = await geocodeAddress(
      extraction.address,
      neighborhood,
      borough
    );

    // Batch create new listings + status changes
    const db = getDb();
    const batch = db.batch();
    const now = new Date();

    for (const unit of addUnits) {
      const title = generateTitle(extraction.address, unit.unit);
      const slug = slugify(
        `${extraction.address} ${unit.unit} ${neighborhood}`
      );
      const amenities = [...extraction.buildingAmenities, ...unit.amenities];

      const listingRef = db.collection("listings").doc();
      batch.set(listingRef, {
        slug,
        title,
        description: unit.description ?? "",
        type: extraction.type ?? "RENTAL",
        status: "DRAFT",
        price: unit.price ?? 0,
        freeMonths: null,
        leaseDuration: null,
        bedrooms: unit.bedrooms ?? 0,
        bathrooms: unit.bathrooms ?? 1,
        sqft: unit.sqft ?? null,
        address: extraction.address,
        unit: unit.unit,
        city: extraction.city ?? "New York",
        state: extraction.state ?? "NY",
        neighborhood,
        borough,
        zipCode: null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        sourceUrl: sourceUrl ?? null,
        featured: false,
        amenities,
        photos: [],
        floorPlans: [],
        availableDate: null,
        listedDate: Timestamp.fromDate(now),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const statusRef = listingRef.collection("statusChanges").doc();
      batch.set(statusRef, {
        fromStatus: null,
        toStatus: "DRAFT",
        source: "IMPORT",
        notes: sourceUrl
          ? `Building sync from ${sourceUrl}`
          : "Building sync from pasted content",
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // Save building amenities + building info
    if (extraction.buildingAmenities.length > 0) {
      await saveBuildingAmenities(
        extraction.address,
        extraction.buildingAmenities,
        {
          yearBuilt: extraction.yearBuilt ?? null,
          numFloors: extraction.numFloors ?? null,
          totalUnits: extraction.totalUnits ?? null,
        }
      );
    }

    revalidateListingPaths();

    return {
      success: true,
      data: { removed: removeListingIds.length, created: addUnits.length },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Sync failed",
    };
  }
}
