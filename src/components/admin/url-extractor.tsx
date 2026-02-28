"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractFromUrl, saveExtractedListing } from "@/actions/extraction";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import type { ExtractionResult } from "@/types";

export function UrlExtractor() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState("");

  async function handleExtract() {
    if (!url) return;
    setLoading(true);
    setError("");
    setExtracted(null);

    const result = await extractFromUrl(url);
    setLoading(false);

    if (result.success && result.data) {
      setExtracted(result.data);
    } else {
      setError(result.error ?? "Extraction failed");
    }
  }

  async function handleSave() {
    if (!extracted) return;
    setSaving(true);

    const result = await saveExtractedListing(extracted, url);
    setSaving(false);

    if (result.success && result.listingId) {
      router.push(`/admin/listings/${result.listingId}/edit`);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://streeteasy.com/building/..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <Button onClick={handleExtract} disabled={loading || !url}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            "Extract"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {extracted && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-green-700">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">
              Data extracted successfully
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {extracted.title && (
              <>
                <dt className="font-medium text-gray-600">Title</dt>
                <dd>{extracted.title}</dd>
              </>
            )}
            {extracted.price !== null && (
              <>
                <dt className="font-medium text-gray-600">Price</dt>
                <dd>
                  ${(extracted.price / 100).toLocaleString()}
                  {extracted.priceUnit ? `/${extracted.priceUnit}` : ""}
                </dd>
              </>
            )}
            {extracted.bedrooms !== null && (
              <>
                <dt className="font-medium text-gray-600">Bedrooms</dt>
                <dd>
                  {extracted.bedrooms === 0 ? "Studio" : extracted.bedrooms}
                </dd>
              </>
            )}
            {extracted.bathrooms !== null && (
              <>
                <dt className="font-medium text-gray-600">Bathrooms</dt>
                <dd>{extracted.bathrooms}</dd>
              </>
            )}
            {extracted.address && (
              <>
                <dt className="font-medium text-gray-600">Address</dt>
                <dd>{extracted.address}</dd>
              </>
            )}
            {extracted.neighborhood && (
              <>
                <dt className="font-medium text-gray-600">Neighborhood</dt>
                <dd>{extracted.neighborhood}</dd>
              </>
            )}
            {extracted.type && (
              <>
                <dt className="font-medium text-gray-600">Type</dt>
                <dd>{extracted.type}</dd>
              </>
            )}
            {extracted.amenities.length > 0 && (
              <>
                <dt className="font-medium text-gray-600">Amenities</dt>
                <dd>{extracted.amenities.join(", ")}</dd>
              </>
            )}
            {extracted.photoUrls.length > 0 && (
              <>
                <dt className="font-medium text-gray-600">Photos found</dt>
                <dd>{extracted.photoUrls.length}</dd>
              </>
            )}
          </dl>
          <div className="mt-4 flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save & Edit Listing"}
            </Button>
            <Button variant="outline" onClick={() => setExtracted(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
