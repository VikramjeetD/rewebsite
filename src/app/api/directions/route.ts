import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "routes.distanceMeters",
          "routes.duration",
          "routes.polyline.encodedPolyline",
          "routes.legs.steps.travelMode",
          "routes.legs.steps.polyline.encodedPolyline",
          "routes.legs.steps.transitDetails.stopCount",
          "routes.legs.steps.transitDetails.transitLine.name",
          "routes.legs.steps.transitDetails.transitLine.nameShort",
          "routes.legs.steps.transitDetails.transitLine.color",
          "routes.legs.steps.transitDetails.transitLine.textColor",
          "routes.legs.steps.transitDetails.transitLine.vehicle.type",
          "routes.legs.steps.localizedValues.staticDuration",
          "routes.legs.steps.staticDuration",
        ].join(","),
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Routes API error:", JSON.stringify(data));
  }

  return NextResponse.json(data);
}
