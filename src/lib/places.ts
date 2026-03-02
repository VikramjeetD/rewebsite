import { unstable_cache } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export type PlaceCategory =
  | "groceries"
  | "restaurants"
  | "nightlife"
  | "parks"
  | "schools"
  | "healthcare"
  | "shopping"
  | "parking"
  | "gyms"
  | "pharmacies"
  | "attractions";

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  distanceMi: number;
  walkMinutes: number;
  photoRef: string | null; // Google Places photo resource name
}

// ── Category Config ──────────────────────────────────────────────────────────

export interface CategoryConfig {
  label: string;
  icon: string; // lucide icon name
  color: string;
  includedTypes: string[];
}

export const PLACE_CATEGORIES: Record<PlaceCategory, CategoryConfig> = {
  groceries: {
    label: "Groceries",
    icon: "ShoppingCart",
    color: "#22c55e",
    includedTypes: ["grocery_store", "supermarket"],
  },
  restaurants: {
    label: "Restaurants",
    icon: "UtensilsCrossed",
    color: "#f97316",
    includedTypes: ["restaurant"],
  },
  nightlife: {
    label: "Nightlife",
    icon: "Wine",
    color: "#a855f7",
    includedTypes: ["bar", "night_club"],
  },
  parks: {
    label: "Parks",
    icon: "Trees",
    color: "#10b981",
    includedTypes: ["park"],
  },
  schools: {
    label: "Schools",
    icon: "GraduationCap",
    color: "#3b82f6",
    includedTypes: ["school", "primary_school", "secondary_school"],
  },
  healthcare: {
    label: "Healthcare",
    icon: "Heart",
    color: "#ef4444",
    includedTypes: ["hospital", "pharmacy", "doctor"],
  },
  shopping: {
    label: "Shopping",
    icon: "ShoppingBag",
    color: "#f59e0b",
    includedTypes: ["shopping_mall", "department_store", "clothing_store"],
  },
  parking: {
    label: "Parking",
    icon: "CircleParking",
    color: "#6366f1",
    includedTypes: ["parking"],
  },
  gyms: {
    label: "Gyms",
    icon: "Dumbbell",
    color: "#f43f5e",
    includedTypes: ["gym"],
  },
  pharmacies: {
    label: "Pharmacies",
    icon: "Pill",
    color: "#14b8a6",
    includedTypes: ["pharmacy"],
  },
  attractions: {
    label: "Attractions",
    icon: "Landmark",
    color: "#d946ef",
    includedTypes: ["tourist_attraction"],
  },
};

export const PLACE_CATEGORY_KEYS = Object.keys(
  PLACE_CATEGORIES
) as PlaceCategory[];

// ── Distance Helpers ─────────────────────────────────────────────────────────

const EARTH_RADIUS_MI = 3958.8;

function haversineDistanceMi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

function estimateWalkMinutes(distanceMi: number): number {
  return Math.round(distanceMi * 20); // ~3 mph walking speed
}

// ── Google Places API (New) — Nearby Search ──────────────────────────────────

interface GooglePlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string; widthPx?: number; heightPx?: number }[];
}

const MI_METERS = 1609.344;
const MIN_RESULTS = 5;
const MIN_RADIUS_MI = 1; // always search at least 1 mile
// Expanding radii in miles: 1 → 2 → 4 → 8 → 16 → 32 → 64 → 128
const RADIUS_STEPS = [1, 2, 4, 8, 16, 32, 64, 128].map((mi) => mi * MI_METERS);

async function searchAtRadius(
  apiKey: string,
  lat: number,
  lng: number,
  includedTypes: string[],
  radiusMeters: number
): Promise<GooglePlaceResult[]> {
  const body = {
    includedTypes,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    rankPreference: "DISTANCE",
  };

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.rating,places.userRatingCount,places.photos",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[places] Google Places API error ${res.status}: ${text}`);
    return [];
  }

  const data = await res.json();
  return data.places ?? [];
}

function toNearbyPlaces(
  results: GooglePlaceResult[],
  lat: number,
  lng: number
): NearbyPlace[] {
  return results
    .filter((p) => p.location)
    .map((p) => {
      const dist = haversineDistanceMi(
        lat,
        lng,
        p.location!.latitude,
        p.location!.longitude
      );
      return {
        id: p.id,
        name: p.displayName?.text ?? "Unknown",
        address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
        lat: p.location!.latitude,
        lng: p.location!.longitude,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        distanceMi: Math.round(dist * 100) / 100,
        walkMinutes: estimateWalkMinutes(dist),
        photoRef: p.photos?.[0]?.name ?? null,
      };
    })
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

async function _fetchNearbyPlaces(
  lat: number,
  lng: number,
  category: PlaceCategory
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[places] GOOGLE_MAPS_API_KEY not set");
    return [];
  }

  const config = PLACE_CATEGORIES[category];
  if (!config) return [];

  // Search each included type separately so we aren't capped by Google's
  // per-request limit, then merge and deduplicate.
  const allResults: GooglePlaceResult[] = [];
  const seenIds = new Set<string>();

  for (const type of config.includedTypes) {
    // Expand radius until we have at least MIN_RESULTS for this type
    // (or have covered MIN_RADIUS_MI), then keep everything found.
    for (const radius of RADIUS_STEPS) {
      let results: GooglePlaceResult[];
      try {
        results = await searchAtRadius(apiKey, lat, lng, [type], radius);
      } catch (err) {
        console.error(`[places] Google Places fetch failed for ${type}:`, err);
        break; // skip this type
      }

      const radiusMi = radius / MI_METERS;
      const isLastStep = radius === RADIUS_STEPS[RADIUS_STEPS.length - 1];

      if ((radiusMi >= MIN_RADIUS_MI && results.length >= MIN_RESULTS) || isLastStep) {
        for (const r of results) {
          if (!seenIds.has(r.id)) {
            seenIds.add(r.id);
            allResults.push(r);
          }
        }
        break;
      }
    }
  }

  return toNearbyPlaces(allResults, lat, lng);
}

export const fetchNearbyPlaces = unstable_cache(
  _fetchNearbyPlaces,
  ["nearby-places"],
  { revalidate: 86400 } // 24 hours
);
