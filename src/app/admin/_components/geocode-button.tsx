"use client";

import { useState } from "react";
import { geocodeAllListingsAction } from "@/actions/listings";
import { MapPin } from "lucide-react";

export function GeocodeButton({
  ungeocodedCount,
}: {
  ungeocodedCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const { geocoded, total } = await geocodeAllListingsAction();
      setResult(`Geocoded ${geocoded} of ${total} listings`);
    } catch {
      setResult("Geocoding failed");
    } finally {
      setLoading(false);
    }
  }

  if (ungeocodedCount === 0 && !result) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading || ungeocodedCount === 0}
        className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
      >
        <MapPin className="h-4 w-4" />
        {loading ? "Geocoding..." : `Geocode All (${ungeocodedCount})`}
      </button>
      {result && <span className="text-sm text-white/60">{result}</span>}
    </div>
  );
}
