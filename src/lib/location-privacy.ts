/**
 * Location privacy utilities — offset exact coordinates for public display.
 * Each listing gets a deterministic random offset so the approximate location
 * is consistent across page loads but never reveals the exact address.
 */

/** Radius of the approximate-area circle shown on maps (meters). */
export const APPROXIMATE_CIRCLE_RADIUS_METERS = 600;

/**
 * Simple deterministic hash of a string → number in [0, 1).
 * Uses FNV-1a-inspired mixing so every listing ID produces a stable value.
 */
function hashToUnit(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [0, 1)
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Returns offset coordinates for public-facing maps.
 *
 * - Offset distance: 150–300 m (roughly 2–4 NYC blocks)
 * - Direction: pseudo-random angle based on listingId
 * - The actual location is always inside the displayed circle
 *   (worst case: 300 m offset vs 400 m radius)
 */
export function getApproximateLocation(
  lat: number,
  lng: number,
  listingId: string
): { lat: number; lng: number } {
  const angle = hashToUnit(listingId, 1) * 2 * Math.PI; // 0–2π
  const distance = 150 + hashToUnit(listingId, 2) * 150; // 150–300 m

  // Approximate metres → degrees at this latitude
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((lat * Math.PI) / 180);

  const dLat = (distance * Math.cos(angle)) / metersPerDegreeLat;
  const dLng = (distance * Math.sin(angle)) / metersPerDegreeLng;

  return { lat: lat + dLat, lng: lng + dLng };
}
