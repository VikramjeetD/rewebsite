"use server";

import { auth } from "@/lib/auth";
import { extractBuildingFromText } from "@/lib/extraction/extractor";
import {
  getListingsByAddress,
  createListing,
  updateListing,
  addStatusChange,
} from "@/lib/firestore";
import { slugify, normalizeAddress, normalizeUnit } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { cleanupListingAssets } from "@/lib/cleanup";
import { revalidatePath } from "next/cache";
import type {
  BuildingExtractionResult,
  BuildingSyncComparison,
  BuildingUnit,
  Listing,
  ListingStatus,
} from "@/types";

const ACTIVE_STATUSES: ListingStatus[] = ["ACTIVE", "IN_CONTRACT", "DRAFT"];

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
    // Get all existing listings at this address
    const existingListings = await getListingsByAddress(extraction.address);

    // Filter to only active-ish listings (ignore already-resolved ones)
    const activeListings = existingListings.filter((l) =>
      ACTIVE_STATUSES.includes(l.status)
    );

    const normalizedExtractedAddress = normalizeAddress(extraction.address);

    // Build a map of existing listings by normalized unit
    const existingByUnit = new Map<string, Listing>();
    for (const listing of activeListings) {
      if (listing.unit) {
        const key = normalizeUnit(listing.unit);
        existingByUnit.set(key, listing);
      }
    }

    // Also check for listings with matching normalized address (fuzzy)
    // that weren't caught by the exact Firestore query
    // This handles cases where the address was stored slightly differently

    // Build a set of extracted unit keys
    const extractedUnitKeys = new Set<string>();
    for (const unit of extraction.units) {
      extractedUnitKeys.add(normalizeUnit(unit.unit));
    }

    // Categorize
    const removed: BuildingSyncComparison["removed"] = [];
    const added: BuildingSyncComparison["added"] = [];
    const unchanged: BuildingSyncComparison["unchanged"] = [];

    // Find removed: existing listings whose unit is NOT in extracted list
    for (const [unitKey, listing] of existingByUnit) {
      if (!extractedUnitKeys.has(unitKey)) {
        removed.push({ listing, unit: listing.unit! });
      }
    }

    // Find added and unchanged
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

    // Mark selected listings as OFF_MARKET
    let removedCount = 0;
    for (const listingId of removeListingIds) {
      await updateListing(listingId, { status: "OFF_MARKET" });
      await addStatusChange(listingId, {
        fromStatus: "ACTIVE",
        toStatus: "OFF_MARKET",
        source: "IMPORT",
        notes: "Building sync: unit no longer listed",
      });
      await cleanupListingAssets(listingId);
      removedCount++;
    }

    // Geocode once for the building
    const neighborhood = extraction.neighborhood ?? "Unknown";
    const borough = extraction.borough ?? "Manhattan";
    const coords = await geocodeAddress(extraction.address, neighborhood, borough);

    // Create new listings
    let createdCount = 0;
    for (const unit of addUnits) {
      const title = `${extraction.address} #${unit.unit}`;
      const slug = slugify(`${extraction.address} ${unit.unit} ${neighborhood}`);
      const amenities = [...extraction.buildingAmenities, ...unit.amenities];

      const listingId = await createListing({
        slug,
        title,
        description: unit.description ?? "",
        type: extraction.type ?? "RENTAL",
        status: "DRAFT",
        price: unit.price ?? 0,
        priceUnit: extraction.type === "SALE" ? null : "month",
        bedrooms: unit.bedrooms ?? 0,
        bathrooms: unit.bathrooms ?? 1,
        sqft: unit.sqft ?? null,
        address: extraction.address,
        unit: unit.unit,
        neighborhood,
        borough,
        zipCode: null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        sourceUrl: sourceUrl ?? null,
        featured: false,
        amenities,
        photos: [],
        availableDate: null,
        listedDate: new Date(),
      });

      await addStatusChange(listingId, {
        fromStatus: null,
        toStatus: "DRAFT",
        source: "IMPORT",
        notes: sourceUrl
          ? `Building sync from ${sourceUrl}`
          : "Building sync from pasted content",
      });

      createdCount++;
    }

    revalidatePath("/admin/listings");
    revalidatePath("/listings");
    revalidatePath("/");

    return {
      success: true,
      data: { removed: removedCount, created: createdCount },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Sync failed",
    };
  }
}
