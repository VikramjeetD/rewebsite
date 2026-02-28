"use server";

import { auth } from "@/lib/auth";
import {
  createListing,
  createListingWithStatus,
  updateListing,
  updateListingStatus,
  addStatusChange,
  getListings,
  getListingById,
} from "@/lib/firestore";
import { listingFormSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { revalidateListingPaths } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import type { ListingPhoto, ListingStatus } from "@/types";
import {
  isTerminalStatus,
  cleanupListingAssets,
  cleanupListingFull,
} from "@/lib/cleanup";

function parseFormDataToRaw(raw: Record<string, FormDataEntryValue>) {
  return {
    ...raw,
    featured: raw.featured === "on",
    sqft: raw.sqft || null,
    priceUnit: raw.priceUnit || null,
    unit: raw.unit || null,
    zipCode: raw.zipCode || null,
    sourceUrl: raw.sourceUrl || null,
    availableDate: raw.availableDate || null,
  };
}

export async function autosaveDraftAction(
  draftId: string | null,
  data: Record<string, string>
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    // Relaxed parsing — fall back to defaults for missing/invalid fields
    const title = data.title || "Untitled Draft";
    const description = data.description || "";
    const type = data.type === "SALE" ? "SALE" : "RENTAL";
    const status = (data.status as ListingStatus) || "DRAFT";
    const priceNum = Number(data.price) || 0;
    const price = Math.round(priceNum * 100);
    const priceUnit = data.priceUnit || null;
    const bedrooms = Number(data.bedrooms) || 0;
    const bathrooms = Number(data.bathrooms) || 1;
    const sqft = data.sqft ? Number(data.sqft) || null : null;
    const address = data.address || "";
    const unit = data.unit || null;
    const neighborhood = data.neighborhood || "";
    const borough = data.borough || "Manhattan";
    const zipCode = data.zipCode || null;
    const sourceUrl = data.sourceUrl || null;
    const featured = data.featured === "on";
    const amenities = (data.amenities || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const availableDate = data.availableDate
      ? new Date(data.availableDate)
      : null;

    const slug = slugify(`${address || "draft"} ${neighborhood || "unknown"}`);

    if (draftId) {
      await updateListing(draftId, {
        slug,
        title,
        description,
        type,
        status,
        price,
        priceUnit,
        bedrooms,
        bathrooms,
        sqft,
        address,
        unit,
        neighborhood,
        borough,
        zipCode,
        sourceUrl,
        featured,
        amenities,
        availableDate,
      });
      revalidateListingPaths();
      return { success: true, draftId };
    } else {
      const id = await createListing({
        slug,
        title,
        description,
        type,
        status: "DRAFT",
        price,
        priceUnit,
        bedrooms,
        bathrooms,
        sqft,
        address,
        unit,
        neighborhood,
        borough,
        zipCode,
        latitude: null,
        longitude: null,
        sourceUrl,
        featured,
        amenities,
        photos: [],
        availableDate,
        listedDate: new Date(),
      });

      await addStatusChange(id, {
        fromStatus: null,
        toStatus: "DRAFT",
        source: "MANUAL",
        notes: "Draft autosaved",
      });

      revalidateListingPaths();
      return { success: true, draftId: id };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Autosave failed",
    };
  }
}

export async function createListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse(parseFormDataToRaw(raw));

  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);
  const coords = await geocodeAddress(
    parsed.address,
    parsed.neighborhood,
    parsed.borough
  );

  const id = await createListingWithStatus(
    {
      slug,
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status,
      price: parsed.price,
      priceUnit: parsed.priceUnit ?? null,
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      sqft: parsed.sqft ?? null,
      address: parsed.address,
      unit: parsed.unit ?? null,
      neighborhood: parsed.neighborhood,
      borough: parsed.borough,
      zipCode: parsed.zipCode ?? null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      sourceUrl: parsed.sourceUrl || null,
      featured: parsed.featured,
      amenities: parsed.amenities,
      photos: [],
      availableDate: parsed.availableDate
        ? new Date(parsed.availableDate)
        : null,
      listedDate: new Date(),
    },
    {
      fromStatus: null,
      toStatus: parsed.status,
      source: "MANUAL",
      notes: "Listing created",
    }
  );

  revalidateListingPaths();
  redirect(`/admin/listings/${id}/edit`);
}

export async function updateListingAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse(parseFormDataToRaw(raw));

  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);

  // Skip geocoding if address fields haven't changed
  const existing = await getListingById(id);
  let lat = existing?.latitude ?? null;
  let lng = existing?.longitude ?? null;

  const addressChanged =
    !existing ||
    existing.address !== parsed.address ||
    existing.neighborhood !== parsed.neighborhood ||
    existing.borough !== parsed.borough;

  if (addressChanged) {
    const coords = await geocodeAddress(
      parsed.address,
      parsed.neighborhood,
      parsed.borough
    );
    lat = coords?.lat ?? null;
    lng = coords?.lng ?? null;
  }

  await updateListing(id, {
    slug,
    title: parsed.title,
    description: parsed.description,
    type: parsed.type,
    status: parsed.status,
    price: parsed.price,
    priceUnit: parsed.priceUnit ?? null,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    sqft: parsed.sqft ?? null,
    address: parsed.address,
    unit: parsed.unit ?? null,
    neighborhood: parsed.neighborhood,
    borough: parsed.borough,
    zipCode: parsed.zipCode ?? null,
    latitude: lat,
    longitude: lng,
    sourceUrl: parsed.sourceUrl || null,
    featured: parsed.featured,
    amenities: parsed.amenities,
    availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
  });

  revalidateListingPaths(slug);
  redirect("/admin/listings");
}

export async function deleteListingAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await cleanupListingFull(id);

  revalidateListingPaths();
}

export async function updateListingStatusAction(
  id: string,
  newStatus: ListingStatus,
  oldStatus: ListingStatus
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateListingStatus(id, newStatus, {
    fromStatus: oldStatus,
    toStatus: newStatus,
    source: "MANUAL",
    notes: null,
  });

  if (isTerminalStatus(newStatus)) {
    await cleanupListingAssets(id);
  }

  revalidateListingPaths();
}

export async function updateListingPhotosAction(
  id: string,
  photos: ListingPhoto[]
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateListing(id, { photos });

  revalidateListingPaths();
}

export async function geocodeAllListingsAction(): Promise<{
  geocoded: number;
  total: number;
}> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const allListings = await getListings();
  const needsGeocoding = allListings.filter((l) => l.latitude == null);

  let geocoded = 0;

  // Process in batches of 5 for ~5x speedup
  for (let i = 0; i < needsGeocoding.length; i += 5) {
    const batch = needsGeocoding.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (listing) => {
        const coords = await geocodeAddress(
          listing.address,
          listing.neighborhood,
          listing.borough
        );
        return { listing, coords };
      })
    );

    for (const { listing, coords } of results) {
      if (coords) {
        await updateListing(listing.id, {
          latitude: coords.lat,
          longitude: coords.lng,
        });
        geocoded++;
      }
    }

    // Delay between batches to respect rate limits
    if (i + 5 < needsGeocoding.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  revalidateListingPaths();

  return { geocoded, total: needsGeocoding.length };
}
