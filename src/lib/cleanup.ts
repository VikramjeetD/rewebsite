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
 * 1. Deletes photos from Vercel Blob
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
    const urls = [
      ...listing.photos.map((p) => p.url),
      ...listing.floorPlans.map((p) => p.url),
    ];
    if (urls.length > 0) {
      photosDeleted = await deleteListingPhotos(urls);
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
 * Clears the photos array on the listing.
 */
export async function cleanupListingAssets(listingId: string): Promise<{
  photosDeleted: number;
}> {
  const listing = await getListingById(listingId);

  let photosDeleted = 0;
  if (listing) {
    const urls = [
      ...listing.photos.map((p) => p.url),
      ...listing.floorPlans.map((p) => p.url),
    ];
    if (urls.length > 0) {
      photosDeleted = await deleteListingPhotos(urls);
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
