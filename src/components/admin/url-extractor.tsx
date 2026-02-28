"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  extractFromUrl,
  extractFromContent,
  saveExtractedListing,
} from "@/actions/extraction";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  AlertCircle,
  Link,
  ClipboardPaste,
} from "lucide-react";
import type { ExtractionResult } from "@/types";

type Mode = "url" | "paste";

export function UrlExtractor() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState("");

  async function handleExtract() {
    setLoading(true);
    setError("");
    setExtracted(null);

    let result;
    if (mode === "url") {
      if (!url) return setLoading(false);
      result = await extractFromUrl(url);
    } else {
      if (!pastedContent.trim()) return setLoading(false);
      result = await extractFromContent(pastedContent, sourceUrl || undefined);
    }

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

    const effectiveUrl = mode === "url" ? url : sourceUrl;
    const result = await saveExtractedListing(extracted, effectiveUrl);
    setSaving(false);

    if (result.success && result.listingId) {
      router.push(`/admin/listings/${result.listingId}/edit`);
    } else {
      setError(result.error ?? "Failed to save");
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("url");
            setExtracted(null);
            setError("");
          }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "url"
              ? "bg-[var(--primary)] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Link className="h-4 w-4" />
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("paste");
            setExtracted(null);
            setError("");
          }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "paste"
              ? "bg-[var(--primary)] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste Content
        </button>
      </div>

      {mode === "url" ? (
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
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Open the listing page in your browser, select all text (Cmd+A), copy
            it (Cmd+C), and paste it below. This works even for sites that block
            automated access like StreetEasy.
          </p>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="Source URL (optional — for reference)"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            placeholder="Paste the listing page content here..."
            rows={10}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <Button
            onClick={handleExtract}
            disabled={loading || !pastedContent.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              "Extract from Content"
            )}
          </Button>
        </div>
      )}

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
            {extracted.sqft !== null && (
              <>
                <dt className="font-medium text-gray-600">Sqft</dt>
                <dd>{extracted.sqft.toLocaleString()}</dd>
              </>
            )}
            {extracted.address && (
              <>
                <dt className="font-medium text-gray-600">Address</dt>
                <dd>{extracted.address}</dd>
              </>
            )}
            {extracted.unit && (
              <>
                <dt className="font-medium text-gray-600">Unit</dt>
                <dd>{extracted.unit}</dd>
              </>
            )}
            {extracted.neighborhood && (
              <>
                <dt className="font-medium text-gray-600">Neighborhood</dt>
                <dd>{extracted.neighborhood}</dd>
              </>
            )}
            {extracted.borough && (
              <>
                <dt className="font-medium text-gray-600">Borough</dt>
                <dd>{extracted.borough}</dd>
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
