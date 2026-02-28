"use server";

import { auth } from "@/lib/auth";
import { fetchAndCleanPage } from "@/lib/extraction/fetcher";
import {
  extractListingFromHtml,
  extractListingFromText,
} from "@/lib/extraction/extractor";
import {
  createListing,
  addStatusChange,
} from "@/lib/firestore";
import { slugify } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { revalidatePath } from "next/cache";
import type { ExtractionResult } from "@/types";

export async function extractFromUrl(url: string): Promise<{
  success: boolean;
  data?: ExtractionResult;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const fetchResult = await fetchAndCleanPage(url);

    if (fetchResult.httpStatus !== 200) {
      return {
        success: false,
        error: `Page returned HTTP ${fetchResult.httpStatus}. If this is StreetEasy or another protected site, use "Paste Content" mode instead.`,
      };
    }

    const extracted = await extractListingFromHtml(
      fetchResult.cleanedHtml,
      url
    );

    return { success: true, data: extracted };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Extraction failed",
    };
  }
}

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
      return { success: false, error: "Content too short — paste the full page text" };

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
    const neighborhood = data.neighborhood ?? "Unknown";
    const borough = data.borough ?? "Manhattan";
    const slug = slugify(`${address} ${neighborhood}`);
    const coords = await geocodeAddress(address, neighborhood, borough);

    const listingId = await createListing({
      slug,
      title: data.title ?? `Listing at ${address}`,
      description: data.description ?? "",
      type: data.type ?? "RENTAL",
      status: data.status ?? "ACTIVE",
      price: data.price ?? 0,
      priceUnit: data.priceUnit ?? null,
      bedrooms: data.bedrooms ?? 0,
      bathrooms: data.bathrooms ?? 1,
      sqft: data.sqft ?? null,
      address,
      unit: data.unit ?? null,
      neighborhood,
      borough,
      zipCode: null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      sourceUrl: sourceUrl ?? null,
      featured: false,
      amenities: data.amenities,
      photos: [],
      availableDate: null,
      listedDate: new Date(),
    });

    await addStatusChange(listingId, {
      fromStatus: null,
      toStatus: data.status ?? "ACTIVE",
      source: "IMPORT",
      notes: sourceUrl ? `Imported from ${sourceUrl}` : "Imported from pasted content",
    });

    revalidatePath("/admin/listings");
    revalidatePath("/listings");
    revalidatePath("/");

    return { success: true, listingId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save listing",
    };
  }
}
