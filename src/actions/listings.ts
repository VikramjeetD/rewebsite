"use server";

import { auth } from "@/lib/auth";
import { createListing, updateListing, addStatusChange, getListings } from "@/lib/firestore";
import { listingFormSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ListingPhoto, ListingStatus } from "@/types";
import {
  isTerminalStatus,
  cleanupListingAssets,
  cleanupListingFull,
} from "@/lib/cleanup";

export async function createListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse({
    ...raw,
    featured: raw.featured === "on",
    sqft: raw.sqft || null,
    priceUnit: raw.priceUnit || null,
    unit: raw.unit || null,
    zipCode: raw.zipCode || null,
    sourceUrl: raw.sourceUrl || null,
    availableDate: raw.availableDate || null,
  });

  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);
  const coords = await geocodeAddress(parsed.address, parsed.neighborhood, parsed.borough);

  const id = await createListing({
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
    availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
    listedDate: new Date(),
  });

  await addStatusChange(id, {
    fromStatus: null,
    toStatus: parsed.status,
    source: "MANUAL",
    notes: "Listing created",
  });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
  redirect(`/admin/listings/${id}/edit`);
}

export async function updateListingAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse({
    ...raw,
    featured: raw.featured === "on",
    sqft: raw.sqft || null,
    priceUnit: raw.priceUnit || null,
    unit: raw.unit || null,
    zipCode: raw.zipCode || null,
    sourceUrl: raw.sourceUrl || null,
    availableDate: raw.availableDate || null,
  });

  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);
  const coords = await geocodeAddress(parsed.address, parsed.neighborhood, parsed.borough);

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
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    sourceUrl: parsed.sourceUrl || null,
    featured: parsed.featured,
    amenities: parsed.amenities,
    availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
  });

  revalidatePath("/admin/listings");
  revalidatePath(`/listings/${slug}`);
  revalidatePath("/listings");
  revalidatePath("/");
  redirect("/admin/listings");
}

export async function deleteListingAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Full cleanup: photos from Blob, subcollections, and the document
  await cleanupListingFull(id);

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
}

export async function updateListingStatusAction(
  id: string,
  newStatus: ListingStatus,
  oldStatus: ListingStatus
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateListing(id, { status: newStatus });
  await addStatusChange(id, {
    fromStatus: oldStatus,
    toStatus: newStatus,
    source: "MANUAL",
    notes: null,
  });

  // Auto-cleanup assets when listing reaches a terminal status
  if (isTerminalStatus(newStatus)) {
    await cleanupListingAssets(id);
  }

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
}

export async function updateListingPhotosAction(
  id: string,
  photos: ListingPhoto[]
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateListing(id, { photos });

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
}

export async function geocodeAllListingsAction(): Promise<{ geocoded: number; total: number }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const allListings = await getListings();
  const needsGeocoding = allListings.filter((l) => l.latitude == null);

  let geocoded = 0;
  for (const listing of needsGeocoding) {
    const coords = await geocodeAddress(listing.address, listing.neighborhood, listing.borough);
    if (coords) {
      await updateListing(listing.id, { latitude: coords.lat, longitude: coords.lng });
      geocoded++;
    }
    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");

  return { geocoded, total: needsGeocoding.length };
}
