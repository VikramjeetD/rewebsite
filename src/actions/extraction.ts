"use server";

import { auth } from "@/lib/auth";
import { extractListingFromText } from "@/lib/extraction/extractor";
import { createListingWithStatus } from "@/lib/firestore";
import { slugify, generateTitle } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { revalidateListingPaths } from "@/lib/revalidate";
import type { ExtractionResult } from "@/types";

export async function extractFromContent(
  content: string,
  sourceUrl?: string
): Promise<{
  success: boolean;
  data?: ExtractionResult;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: "No content provided" };
    if (trimmed.length < 50)
      return {
        success: false,
        error: "Content too short — paste the full page text",
      };

    const extracted = await extractListingFromText(trimmed, sourceUrl);
    return { success: true, data: extracted };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Extraction failed",
    };
  }
}

export async function saveExtractedListing(
  data: ExtractionResult,
  sourceUrl: string | undefined
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const address = data.address ?? "Unknown Address";
    const unit = data.unit ?? null;
    const neighborhood = data.neighborhood ?? "Unknown";
    const borough = data.borough ?? "Manhattan";
    const slug = slugify(`${address} ${neighborhood}`);
    const coords = await geocodeAddress(address, neighborhood, borough);

    const listingId = await createListingWithStatus(
      {
        slug,
        title: generateTitle(address, unit),
        description: data.description ?? "",
        type: data.type ?? "RENTAL",
        status: "ACTIVE",
        price: data.price ?? 0,
        freeMonths: data.freeMonths ?? null,
        leaseDuration: data.leaseDuration ?? null,
        bedrooms: data.bedrooms ?? 0,
        bathrooms: data.bathrooms ?? 1,
        sqft: data.sqft ?? null,
        address,
        unit,
        city: data.city ?? "New York",
        state: data.state ?? "NY",
        neighborhood,
        borough,
        zipCode: data.zipCode ?? null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        sourceUrl: sourceUrl ?? null,
        op: data.op ?? null,
        noFee: false,
        estimatedUtilities: null,
        petPolicy: null,
        petPolicyDetails: null,
        parking: null,
        featured: false,
        amenities: data.amenities,
        photos: [],
        floorPlans: [],
        availableDate: data.availableDate ? new Date(data.availableDate) : null,
        listedDate: new Date(),
      },
      {
        fromStatus: null,
        toStatus: "ACTIVE",
        source: "IMPORT",
        notes: sourceUrl
          ? `Imported from ${sourceUrl}`
          : "Imported from pasted content",
      }
    );

    revalidateListingPaths();

    return { success: true, listingId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save listing",
    };
  }
}
