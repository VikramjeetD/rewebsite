import { NextResponse } from "next/server";
import { getNearbyBusStops } from "@/lib/transit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const radius = radiusStr ? parseFloat(radiusStr) : 0.5;

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "invalid lat/lng" },
      { status: 400 }
    );
  }

  if (isNaN(radius) || radius <= 0 || radius > 5) {
    return NextResponse.json(
      { error: "radius must be between 0 and 5 miles" },
      { status: 400 }
    );
  }

  const stops = await getNearbyBusStops(lat, lng, radius);

  return NextResponse.json({ stops });
}
