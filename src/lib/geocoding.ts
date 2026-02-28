export async function geocodeAddress(
  address: string,
  neighborhood: string,
  borough: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[geocode] GOOGLE_MAPS_API_KEY not set, skipping geocoding");
    return null;
  }

  const fullAddress = `${address}, ${neighborhood}, ${borough}, New York, NY`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results?.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      console.log(`[geocode] "${fullAddress}" → ${lat}, ${lng}`);
      return { lat, lng };
    }

    console.warn(`[geocode] No results for "${fullAddress}" (status: ${data.status})`);
    return null;
  } catch (error) {
    console.error("[geocode] Error:", error);
    return null;
  }
}
