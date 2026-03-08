import { del } from "@vercel/blob";
import { getDb } from "./firebase";
import { getListingById } from "./firestore";
import { TERMINAL_STATUSES } from "@/lib/constants";
import type { ListingStatus } from "@/types";

export { TERMINAL_STATUSES };

export function isTerminalStatus(status: ListingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Finds which URLs from the given set are referenced by other listings
 * (excluding the specified listing). Returns only the URLs safe to delete.
 */
async function getOrphanedUrls(
  urls: string[],
  excludeListingId: string
): Promise<string[]> {
  if (urls.length === 0) return [];

  const db = getDb();
  const snapshot = await db
    .collection("listings")
    .where("__name__", "!=", excludeListingId)
    .get();

  const referencedUrls = new Set<string>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const photos = (data.photos as { url: string }[]) ?? [];
    const floorPlans = (data.floorPlans as { url: string }[]) ?? [];
    for (const p of photos) referencedUrls.add(p.url);
    for (const p of floorPlans) referencedUrls.add(p.url);
  }

  return urls.filter((url) => !referencedUrls.has(url));
}

/**
 * Deletes all photos from Vercel Blob for a listing.
 * Returns the number of photos deleted.
 */
export async function deleteListingPhotos(
  photoUrls: string[]
): Promise<number> {
  if (photoUrls.length === 0) return 0;

  // Vercel Blob `del` accepts an array of URLs
  await del(photoUrls);
  return photoUrls.length;
}

/**
 * Deletes all documents in a Firestore subcollection (batched).
 * Firestore doesn't auto-delete subcollections when the parent is deleted.
 */
export async function deleteSubcollection(
  listingId: string,
  subcollection: string
): Promise<number> {
  const db = getDb();
  const ref = db
    .collection("listings")
    .doc(listingId)
    .collection(subcollection);
  const snapshot = await ref.get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}

/**
 * Full cleanup of a listing's stored assets:
 * 1. Deletes photos from Vercel Blob (only if no other listing uses them)
 * 2. Deletes statusChanges subcollection
 * 3. Deletes the listing document itself
 */
export async function cleanupListingFull(listingId: string): Promise<{
  photosDeleted: number;
  statusChangesDeleted: number;
}> {
  const listing = await getListingById(listingId);

  let photosDeleted = 0;
  if (listing) {
    const allUrls = [
      ...listing.photos.map((p) => p.url),
      ...listing.floorPlans.map((p) => p.url),
    ];
    const safeToDelete = await getOrphanedUrls(allUrls, listingId);
    if (safeToDelete.length > 0) {
      photosDeleted = await deleteListingPhotos(safeToDelete);
    }
  }

  const statusChangesDeleted = await deleteSubcollection(
    listingId,
    "statusChanges"
  );

  // Delete the listing document
  const db = getDb();
  await db.collection("listings").doc(listingId).delete();

  return { photosDeleted, statusChangesDeleted };
}

/**
 * Cleans up only the billable assets (photos) but keeps
 * the listing document so it still appears in admin history.
 * Only deletes blobs not referenced by any other listing.
 * Clears the photos array on the listing.
 */
export async function cleanupListingAssets(listingId: string): Promise<{
  photosDeleted: number;
}> {
  const listing = await getListingById(listingId);

  let photosDeleted = 0;
  if (listing) {
    const allUrls = [
      ...listing.photos.map((p) => p.url),
      ...listing.floorPlans.map((p) => p.url),
    ];
    const safeToDelete = await getOrphanedUrls(allUrls, listingId);
    if (safeToDelete.length > 0) {
      photosDeleted = await deleteListingPhotos(safeToDelete);
    }
  }

  // Clear photos/floorPlans arrays on the listing so stale URLs aren't referenced
  const db = getDb();
  await db.collection("listings").doc(listingId).update({
    photos: [],
    floorPlans: [],
    featured: false,
  });

  return { photosDeleted };
}
