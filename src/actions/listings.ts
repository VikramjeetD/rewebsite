"use server";

import { auth } from "@/lib/auth";
import {
  createListing,
  createListingWithStatus,
  updateListing,
  updateListingStatus,
  addStatusChange,
  getListingById,
  getBuildingAmenities,
  saveBuildingAmenities,
} from "@/lib/firestore";
import { listingFormSchema } from "@/lib/validations";
import { slugify, generateTitle } from "@/lib/utils";
import { geocodeAddress } from "@/lib/geocoding";
import { revalidateListingPaths } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { lookupPluto } from "@/lib/pluto";
import type { ListingPhoto, ListingStatus } from "@/types";
import type { PlutoResult } from "@/lib/pluto";
import {
  isTerminalStatus,
  cleanupListingAssets,
  cleanupListingFull,
} from "@/lib/cleanup";

/** Save building amenities for an address if none exist yet. */
async function ensureBuildingAmenities(
  address: string,
  amenities: string[]
): Promise<void> {
  if (!address.trim() || amenities.length === 0) return;
  const existing = await getBuildingAmenities(address);
  if (existing) return; // already exists — don't overwrite
  await saveBuildingAmenities(address, amenities);
}

function parseFormDataToRaw(raw: Record<string, FormDataEntryValue>) {
  return {
    ...raw,
    title: raw.title || "",
    featured: raw.featured === "on",
    noFee: raw.noFee === "on",
    estimatedUtilities: raw.estimatedUtilities || null,
    petPolicy: raw.petPolicy || null,
    petPolicyDetails: raw.petPolicyDetails || null,
    parking: raw.parking || null,
    sqft: raw.sqft || null,
    unit: raw.unit || null,
    city: raw.city || "New York",
    state: raw.state || "NY",
    freeMonths: raw.freeMonths || null,
    leaseDuration: raw.leaseDuration || null,
    op: raw.op || null,
    zipCode: raw.zipCode || null,
    sourceUrl: raw.sourceUrl || null,
    availableDate: raw.availableDate || null,
  };
}

export async function autosaveDraftAction(
  draftId: string | null,
  data: Record<string, string>,
  photos?: ListingPhoto[],
  floorPlans?: ListingPhoto[]
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    // Relaxed parsing — fall back to defaults for missing/invalid fields
    const description = data.description || "";
    const type = data.type === "SALE" ? "SALE" : "RENTAL";
    const priceNum = Number(data.price) || 0;
    const price = Math.round(priceNum * 100);
    const bedrooms = Number(data.bedrooms) || 0;
    const bathrooms = Number(data.bathrooms) || 1;
    const sqft = data.sqft ? Number(data.sqft) || null : null;
    const address = data.address || "";
    const unit = data.unit || null;
    const city = data.city || "New York";
    const state = data.state || "NY";
    const neighborhood = data.neighborhood || "";
    const borough = data.borough || "Manhattan";
    const zipCode = data.zipCode || null;
    const sourceUrl = data.sourceUrl || null;
    const featured = data.featured === "on";
    const noFee = data.noFee === "on";
    const estimatedUtilities = data.estimatedUtilities || null;
    const petPolicy = data.petPolicy || null;
    const petPolicyDetails = data.petPolicyDetails || null;
    const parking = data.parking || null;
    const op = data.op ? Number(data.op) || null : null;
    const freeMonths = data.freeMonths ? Number(data.freeMonths) || null : null;
    const leaseDuration = data.leaseDuration
      ? Number(data.leaseDuration) || null
      : null;
    const amenities = (data.amenities || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const availableDate = data.availableDate
      ? new Date(data.availableDate)
      : null;
    const title = (data.title || "").trim() || generateTitle(address, unit); // drafts: fallback for autosave

    const slug = slugify(`${address || "draft"} ${neighborhood || "unknown"}`);

    if (draftId) {
      await updateListing(draftId, {
        slug,
        title,
        description,
        type,
        price,
        freeMonths,
        leaseDuration,
        bedrooms,
        bathrooms,
        sqft,
        address,
        unit,
        city,
        state,
        neighborhood,
        borough,
        zipCode,
        sourceUrl,
        op,
        noFee,
        estimatedUtilities,
        petPolicy,
        petPolicyDetails,
        parking,
        featured,
        amenities,
        availableDate,
        ...(photos !== undefined && { photos }),
        ...(floorPlans !== undefined && { floorPlans }),
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
        freeMonths,
        leaseDuration,
        bedrooms,
        bathrooms,
        sqft,
        address,
        unit,
        city,
        state,
        neighborhood,
        borough,
        zipCode,
        latitude: null,
        longitude: null,
        sourceUrl,
        op,
        noFee,
        estimatedUtilities,
        petPolicy,
        petPolicyDetails,
        parking,
        featured,
        amenities,
        photos: photos ?? [],
        floorPlans: floorPlans ?? [],
        availableDate,
        listedDate: new Date(),
      });

      await addStatusChange(id, {
        fromStatus: null,
        toStatus: "DRAFT",
        source: "MANUAL",
        notes: "Draft autosaved",
      });

      await ensureBuildingAmenities(address, amenities);

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

  const title = parsed.title;
  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);
  const coords = await geocodeAddress(
    parsed.address,
    parsed.neighborhood,
    parsed.borough
  );

  const id = await createListingWithStatus(
    {
      slug,
      title,
      description: parsed.description,
      type: parsed.type,
      status: "DRAFT",
      price: parsed.price,
      freeMonths: parsed.freeMonths ?? null,
      leaseDuration: parsed.leaseDuration ?? null,
      bedrooms: parsed.bedrooms,
      bathrooms: parsed.bathrooms,
      sqft: parsed.sqft ?? null,
      address: parsed.address,
      unit: parsed.unit ?? null,
      city: parsed.city,
      state: parsed.state,
      neighborhood: parsed.neighborhood,
      borough: parsed.borough,
      zipCode: parsed.zipCode ?? null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      sourceUrl: parsed.sourceUrl || null,
      op: parsed.op ?? null,
      noFee: parsed.noFee,
      estimatedUtilities: parsed.estimatedUtilities ?? null,
      petPolicy: parsed.petPolicy ?? null,
      petPolicyDetails: parsed.petPolicyDetails ?? null,
      parking: parsed.parking ?? null,
      featured: parsed.featured,
      amenities: parsed.amenities,
      photos: [],
      floorPlans: [],
      availableDate: parsed.availableDate
        ? new Date(parsed.availableDate)
        : null,
      listedDate: new Date(),
    },
    {
      fromStatus: null,
      toStatus: "DRAFT",
      source: "MANUAL",
      notes: "Listing created",
    }
  );

  await ensureBuildingAmenities(parsed.address, parsed.amenities);

  revalidateListingPaths();
  redirect(`/admin/listings/${id}/edit`);
}

export async function updateListingAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse(parseFormDataToRaw(raw));

  const title = parsed.title;
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

  if (addressChanged || lat == null) {
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
    title,
    description: parsed.description,
    type: parsed.type,
    price: parsed.price,
    freeMonths: parsed.freeMonths ?? null,
    leaseDuration: parsed.leaseDuration ?? null,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    sqft: parsed.sqft ?? null,
    address: parsed.address,
    unit: parsed.unit ?? null,
    city: parsed.city,
    state: parsed.state,
    neighborhood: parsed.neighborhood,
    borough: parsed.borough,
    zipCode: parsed.zipCode ?? null,
    latitude: lat,
    longitude: lng,
    sourceUrl: parsed.sourceUrl || null,
    op: parsed.op ?? null,
    noFee: parsed.noFee,
    estimatedUtilities: parsed.estimatedUtilities ?? null,
    petPolicy: parsed.petPolicy ?? null,
    petPolicyDetails: parsed.petPolicyDetails ?? null,
    parking: parsed.parking ?? null,
    featured: parsed.featured,
    amenities: parsed.amenities,
    availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
  });

  await ensureBuildingAmenities(parsed.address, parsed.amenities);

  revalidateListingPaths(slug);
  redirect("/admin/listings");
}

export async function activateDraftAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const raw = Object.fromEntries(formData.entries());
  const parsed = listingFormSchema.parse(parseFormDataToRaw(raw));

  const title = parsed.title;
  const slug = slugify(`${parsed.address} ${parsed.neighborhood}`);

  const existing = await getListingById(id);
  let lat = existing?.latitude ?? null;
  let lng = existing?.longitude ?? null;

  const addressChanged =
    !existing ||
    existing.address !== parsed.address ||
    existing.neighborhood !== parsed.neighborhood ||
    existing.borough !== parsed.borough;

  if (addressChanged || lat == null) {
    const coords = await geocodeAddress(
      parsed.address,
      parsed.neighborhood,
      parsed.borough
    );
    lat = coords?.lat ?? null;
    lng = coords?.lng ?? null;
  }

  await updateListingStatus(id, "ACTIVE", {
    fromStatus: existing?.status ?? "DRAFT",
    toStatus: "ACTIVE",
    source: "MANUAL",
    notes: "Draft activated",
  });

  await updateListing(id, {
    slug,
    title,
    description: parsed.description,
    type: parsed.type,
    status: "ACTIVE",
    price: parsed.price,
    freeMonths: parsed.freeMonths ?? null,
    leaseDuration: parsed.leaseDuration ?? null,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    sqft: parsed.sqft ?? null,
    address: parsed.address,
    unit: parsed.unit ?? null,
    city: parsed.city,
    state: parsed.state,
    neighborhood: parsed.neighborhood,
    borough: parsed.borough,
    zipCode: parsed.zipCode ?? null,
    latitude: lat,
    longitude: lng,
    sourceUrl: parsed.sourceUrl || null,
    op: parsed.op ?? null,
    noFee: parsed.noFee,
    estimatedUtilities: parsed.estimatedUtilities ?? null,
    petPolicy: parsed.petPolicy ?? null,
    petPolicyDetails: parsed.petPolicyDetails ?? null,
    parking: parsed.parking ?? null,
    featured: parsed.featured,
    amenities: parsed.amenities,
    availableDate: parsed.availableDate ? new Date(parsed.availableDate) : null,
  });

  await ensureBuildingAmenities(parsed.address, parsed.amenities);

  revalidateListingPaths(slug);
  redirect("/admin/listings");
}

export async function deleteListingAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await cleanupListingFull(id);

  revalidateListingPaths();
}

export async function bulkDeleteListingsAction(ids: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  for (const id of ids) {
    await cleanupListingFull(id);
  }

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

export async function updateListingFloorPlansAction(
  id: string,
  floorPlans: ListingPhoto[]
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await updateListing(id, { floorPlans });

  revalidateListingPaths();
}

export async function loadBuildingAmenitiesAction(
  address: string
): Promise<{
  success: boolean;
  amenities?: string[];
  yearBuilt?: number | null;
  numFloors?: number | null;
  totalUnits?: number | null;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const record = await getBuildingAmenities(address);
    return {
      success: true,
      amenities: record?.amenities,
      yearBuilt: record?.yearBuilt ?? null,
      numFloors: record?.numFloors ?? null,
      totalUnits: record?.totalUnits ?? null,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to load amenities",
    };
  }
}

export async function saveBuildingAmenitiesAction(
  address: string,
  amenities: string[],
  buildingInfo?: {
    yearBuilt: number | null;
    numFloors: number | null;
    totalUnits: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!address.trim()) {
    return { success: false, error: "Address is required" };
  }

  try {
    await saveBuildingAmenities(address, amenities, buildingInfo);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to save amenities",
    };
  }
}

export async function lookupPlutoAction(
  address: string
): Promise<{ success: boolean; data?: PlutoResult; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  try {
    const result = await lookupPluto(address);
    if (!result) {
      return { success: false, error: "No PLUTO data found for this address" };
    }
    return { success: true, data: result };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "PLUTO lookup failed",
    };
  }
}

