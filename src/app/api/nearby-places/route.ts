import { NextResponse } from "next/server";
import {
  fetchNearbyPlaces,
  PLACE_CATEGORIES,
  type PlaceCategory,
} from "@/lib/places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const category = searchParams.get("category") as PlaceCategory | null;

  if (!latStr || !lngStr || !category) {
    return NextResponse.json(
      { error: "lat, lng, and category are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: "invalid lat/lng" }, { status: 400 });
  }

  if (!(category in PLACE_CATEGORIES)) {
    return NextResponse.json(
      { error: `invalid category: ${category}` },
      { status: 400 }
    );
  }

  const places = await fetchNearbyPlaces(lat, lng, category);

  return NextResponse.json({ category, places });
}
