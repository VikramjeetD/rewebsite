import { getDb } from "./firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  Listing,
  StatusChange,
  Testimonial,
  ContactSubmission,
  SiteSettings,
  ListingStatus,
} from "@/types";

// --- Helpers ---

function toDate(val: Timestamp | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function docToListing(id: string, data: Record<string, unknown>): Listing {
  return {
    id,
    slug: data.slug as string,
    title: data.title as string,
    description: data.description as string,
    type: data.type as Listing["type"],
    status: data.status as Listing["status"],
    price: data.price as number,
    priceUnit: (data.priceUnit as string) ?? null,
    bedrooms: data.bedrooms as number,
    bathrooms: data.bathrooms as number,
    sqft: (data.sqft as number) ?? null,
    address: data.address as string,
    unit: (data.unit as string) ?? null,
    neighborhood: data.neighborhood as string,
    borough: data.borough as string,
    zipCode: (data.zipCode as string) ?? null,
    latitude: (data.latitude as number) ?? null,
    longitude: (data.longitude as number) ?? null,
    sourceUrl: (data.sourceUrl as string) ?? null,
    featured: (data.featured as boolean) ?? false,
    amenities: (data.amenities as string[]) ?? [],
    photos: (data.photos as Listing["photos"]) ?? [],
    availableDate: toDate(data.availableDate as Timestamp),
    listedDate: toDate(data.listedDate as Timestamp) ?? new Date(),
    createdAt: toDate(data.createdAt as Timestamp) ?? new Date(),
    updatedAt: toDate(data.updatedAt as Timestamp) ?? new Date(),
  };
}

// --- Listings ---

export async function getListings(filters?: {
  status?: ListingStatus;
  type?: string;
  neighborhood?: string;
  featured?: boolean;
  limit?: number;
}): Promise<Listing[]> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("listings");

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }
  if (filters?.type) {
    query = query.where("type", "==", filters.type);
  }
  if (filters?.neighborhood) {
    query = query.where("neighborhood", "==", filters.neighborhood);
  }
  if (filters?.featured !== undefined) {
    query = query.where("featured", "==", filters.featured);
  }

  query = query.orderBy("createdAt", "desc");

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) =>
    docToListing(doc.id, doc.data() as Record<string, unknown>)
  );
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = getDb();
  const doc = await db.collection("listings").doc(id).get();
  if (!doc.exists) return null;
  return docToListing(doc.id, doc.data() as Record<string, unknown>);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const db = getDb();
  const snapshot = await db
    .collection("listings")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return docToListing(doc.id, doc.data() as Record<string, unknown>);
}

export async function createListing(
  data: Omit<Listing, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = getDb();
  const ref = await db.collection("listings").add({
    ...data,
    availableDate: data.availableDate
      ? Timestamp.fromDate(data.availableDate)
      : null,
    listedDate: Timestamp.fromDate(data.listedDate),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateListing(
  id: string,
  data: Partial<Omit<Listing, "id" | "createdAt">>
): Promise<void> {
  const db = getDb();
  const updateData: Record<string, unknown> = { ...data };

  if (data.availableDate !== undefined) {
    updateData.availableDate = data.availableDate
      ? Timestamp.fromDate(data.availableDate)
      : null;
  }
  if (data.listedDate) {
    updateData.listedDate = Timestamp.fromDate(data.listedDate);
  }

  updateData.updatedAt = FieldValue.serverTimestamp();
  await db.collection("listings").doc(id).update(updateData);
}

export async function deleteListing(id: string): Promise<void> {
  const db = getDb();
  await db.collection("listings").doc(id).delete();
}

// --- Status Changes ---

export async function addStatusChange(
  listingId: string,
  data: Omit<StatusChange, "id" | "listingId" | "createdAt">
): Promise<string> {
  const db = getDb();
  const ref = await db
    .collection("listings")
    .doc(listingId)
    .collection("statusChanges")
    .add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

export async function getStatusChanges(
  listingId: string
): Promise<StatusChange[]> {
  const db = getDb();
  const snapshot = await db
    .collection("listings")
    .doc(listingId)
    .collection("statusChanges")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      listingId,
      fromStatus: data.fromStatus ?? null,
      toStatus: data.toStatus,
      source: data.source,
      notes: data.notes ?? null,
      createdAt: toDate(data.createdAt) ?? new Date(),
    };
  });
}

// --- Testimonials ---

export async function getTestimonials(
  featured?: boolean
): Promise<Testimonial[]> {
  const db = getDb();
  let query: FirebaseFirestore.Query = db.collection("testimonials");
  if (featured !== undefined) {
    query = query.where("featured", "==", featured);
  }
  query = query.orderBy("order", "asc");
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      text: data.text,
      role: data.role ?? null,
      rating: data.rating,
      featured: data.featured ?? false,
      order: data.order ?? 0,
      createdAt: toDate(data.createdAt) ?? new Date(),
    };
  });
}

// --- Contact Submissions ---

export async function createContactSubmission(
  data: Omit<ContactSubmission, "id" | "read" | "createdAt">
): Promise<string> {
  const db = getDb();
  const ref = await db.collection("contactSubmissions").add({
    ...data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getContactSubmissions(): Promise<ContactSubmission[]> {
  const db = getDb();
  const snapshot = await db
    .collection("contactSubmissions")
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
      listingId: data.listingId ?? null,
      read: data.read ?? false,
      createdAt: toDate(data.createdAt) ?? new Date(),
    };
  });
}

// --- Site Settings ---

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = getDb();
  const doc = await db.collection("siteSettings").doc("default").get();
  if (!doc.exists) {
    return {
      agentName: "Brandy Culp",
      agentTitle: "Licensed Real Estate Agent",
      agentBio: "",
      agentPhoto: null,
      phone: "(212) 555-0100",
      email: "agent@example.com",
      license: null,
      heroTitle: "Find Your Dream Home in NYC",
      heroSubtitle:
        "Expert guidance for buying, selling, and renting in New York City",
      heroImage: null,
      updatedAt: new Date(),
    };
  }
  const data = doc.data()!;
  return {
    agentName: data.agentName,
    agentTitle: data.agentTitle,
    agentBio: data.agentBio ?? "",
    agentPhoto: data.agentPhoto ?? null,
    phone: data.phone,
    email: data.email,
    license: data.license ?? null,
    heroTitle: data.heroTitle ?? "Find Your Dream Home in NYC",
    heroSubtitle:
      data.heroSubtitle ??
      "Expert guidance for buying, selling, and renting in New York City",
    heroImage: data.heroImage ?? null,
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

export async function updateSiteSettings(
  data: Partial<SiteSettings>
): Promise<void> {
  const db = getDb();
  await db
    .collection("siteSettings")
    .doc("default")
    .set(
      {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

// --- Building queries ---

export async function getListingsByAddress(
  address: string
): Promise<Listing[]> {
  const db = getDb();
  const snapshot = await db
    .collection("listings")
    .where("address", "==", address)
    .get();
  return snapshot.docs.map((doc) =>
    docToListing(doc.id, doc.data() as Record<string, unknown>)
  );
}

// --- Neighborhoods (derived) ---

export async function getNeighborhoods(): Promise<string[]> {
  const listings = await getListings({ status: "ACTIVE" });
  const neighborhoods = new Set(listings.map((l) => l.neighborhood));
  return Array.from(neighborhoods).sort();
}
