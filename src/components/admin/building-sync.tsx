"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  extractBuildingFromContent,
  compareBuildingListings,
  executeBuildingSync,
} from "@/actions/building-sync";
import {
  Loader2,
  Check,
  AlertCircle,
  Minus,
  Plus,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type {
  BuildingExtractionResult,
  BuildingSyncComparison,
  BuildingUnit,
} from "@/types";

type Phase = "input" | "review" | "done";

export function BuildingSync() {
  const [phase, setPhase] = useState<Phase>("input");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Extraction result
  const [extraction, setExtraction] = useState<BuildingExtractionResult | null>(
    null
  );

  // Comparison result
  const [comparison, setComparison] = useState<BuildingSyncComparison | null>(
    null
  );

  // User selections
  const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(
    new Set()
  );
  const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(
    new Set()
  );

  // Sync results
  const [syncResult, setSyncResult] = useState<{
    removed: number;
    created: number;
  } | null>(null);

  async function handleExtract() {
    setLoading(true);
    setError("");

    const result = await extractBuildingFromContent(
      content,
      sourceUrl || undefined
    );

    if (!result.success || !result.data) {
      setError(result.error ?? "Extraction failed");
      setLoading(false);
      return;
    }

    setExtraction(result.data);

    // Immediately compare
    const compResult = await compareBuildingListings(result.data);
    setLoading(false);

    if (!compResult.success || !compResult.data) {
      setError(compResult.error ?? "Comparison failed");
      return;
    }

    setComparison(compResult.data);

    // Pre-select all removals and additions
    setSelectedRemovals(
      new Set(compResult.data.removed.map((r) => r.listing.id))
    );
    setSelectedAdditions(
      new Set(compResult.data.added.map((a) => a.unit.unit))
    );

    setPhase("review");
  }

  async function handleSync() {
    if (!extraction || !comparison) return;
    setLoading(true);
    setError("");

    const addUnits = comparison.added
      .filter((a) => selectedAdditions.has(a.unit.unit))
      .map((a) => a.unit);

    const result = await executeBuildingSync({
      extraction,
      removeListingIds: Array.from(selectedRemovals),
      addUnits,
      sourceUrl: sourceUrl || undefined,
    });

    setLoading(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "Sync failed");
      return;
    }

    setSyncResult(result.data);
    setPhase("done");
  }

  function handleReset() {
    setPhase("input");
    setContent("");
    setSourceUrl("");
    setExtraction(null);
    setComparison(null);
    setSelectedRemovals(new Set());
    setSelectedAdditions(new Set());
    setSyncResult(null);
    setError("");
  }

  function toggleRemoval(id: string) {
    setSelectedRemovals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAddition(unit: string) {
    setSelectedAdditions((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });
  }

  function formatUnitPrice(unit: BuildingUnit) {
    if (!unit.price) return "Price TBD";
    return formatPrice(unit.price, "month");
  }

  function formatUnitDetails(unit: BuildingUnit) {
    const parts: string[] = [];
    if (unit.bedrooms !== null) {
      parts.push(unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms}BR`);
    }
    if (unit.bathrooms !== null) parts.push(`${unit.bathrooms}BA`);
    if (unit.sqft !== null) parts.push(`${unit.sqft.toLocaleString()} sqft`);
    return parts.join(" / ");
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Phase 1: Input */}
      {phase === "input" && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              Paste Building Availability
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Open the building&apos;s availability page in your browser,
                select all text (Cmd+A), copy it (Cmd+C), and paste it below.
                The AI will extract all listed units.
              </p>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Source URL (optional — for reference)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the building availability page content here..."
                rows={12}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <Button
                onClick={handleExtract}
                disabled={loading || !content.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting & Comparing...
                  </>
                ) : (
                  "Extract Units"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Review */}
      {phase === "review" && comparison && extraction && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {extraction.address}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {extraction.neighborhood}
                    {extraction.borough ? `, ${extraction.borough}` : ""}
                    {" — "}
                    {extraction.units.length} unit
                    {extraction.units.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Removed (no longer listed) */}
          {comparison.removed.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-red-700">
                  <Minus className="h-4 w-4" />
                  <h3 className="font-semibold">
                    No Longer Listed ({comparison.removed.length})
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  These units exist in your database but are not on the
                  availability page. Selected units will be marked OFF_MARKET.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.removed.map(({ listing, unit }) => (
                    <label
                      key={listing.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 hover:bg-red-100"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRemovals.has(listing.id)}
                        onChange={() => toggleRemoval(listing.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <span className="font-medium">Unit {unit}</span>
                        <span className="ml-3 text-sm text-gray-600">
                          {formatPrice(listing.price, listing.priceUnit)} —{" "}
                          {listing.bedrooms === 0
                            ? "Studio"
                            : `${listing.bedrooms}BR`}
                          /{listing.bathrooms}BA
                        </span>
                      </div>
                      <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
                        {listing.status}
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Added (new units) */}
          {comparison.added.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-green-700">
                  <Plus className="h-4 w-4" />
                  <h3 className="font-semibold">
                    New Units ({comparison.added.length})
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  These units are on the availability page but not in your
                  database. Selected units will be created as DRAFT listings.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.added.map(({ unit }) => (
                    <label
                      key={unit.unit}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-green-100 bg-green-50 p-3 hover:bg-green-100"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAdditions.has(unit.unit)}
                        onChange={() => toggleAddition(unit.unit)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <span className="font-medium">Unit {unit.unit}</span>
                        <span className="ml-3 text-sm text-gray-600">
                          {formatUnitPrice(unit)}
                          {formatUnitDetails(unit)
                            ? ` — ${formatUnitDetails(unit)}`
                            : ""}
                        </span>
                      </div>
                      <span className="rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                        NEW
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unchanged */}
          {comparison.unchanged.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-gray-600">
                  <Check className="h-4 w-4" />
                  <h3 className="font-semibold">
                    Unchanged ({comparison.unchanged.length})
                  </h3>
                </div>
                <p className="text-sm text-gray-500">
                  These units exist in both. No action will be taken.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.unchanged.map(({ listing, unit }) => {
                    const priceChanged =
                      unit.price !== null && unit.price !== listing.price;
                    return (
                      <div
                        key={listing.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                      >
                        <div className="flex-1">
                          <span className="font-medium">
                            Unit {listing.unit}
                          </span>
                          <span className="ml-3 text-sm text-gray-600">
                            {formatPrice(listing.price, listing.priceUnit)}
                            {priceChanged && (
                              <span className="ml-2 inline-flex items-center text-amber-600">
                                <ArrowRight className="mx-1 h-3 w-3" />
                                {formatUnitPrice(unit)}
                              </span>
                            )}
                          </span>
                        </div>
                        {priceChanged && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Price changed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No changes */}
          {comparison.removed.length === 0 && comparison.added.length === 0 && (
            <Card>
              <CardContent>
                <p className="py-4 text-center text-gray-500">
                  Everything is already in sync. No changes needed.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(comparison.removed.length > 0 || comparison.added.length > 0) && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSync}
                disabled={
                  loading ||
                  (selectedRemovals.size === 0 && selectedAdditions.size === 0)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    Sync {selectedRemovals.size + selectedAdditions.size} change
                    {selectedRemovals.size + selectedAdditions.size !== 1
                      ? "s"
                      : ""}
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-500">
                {selectedRemovals.size > 0 &&
                  `${selectedRemovals.size} removed`}
                {selectedRemovals.size > 0 &&
                  selectedAdditions.size > 0 &&
                  ", "}
                {selectedAdditions.size > 0 &&
                  `${selectedAdditions.size} created`}
              </span>
            </div>
          )}
        </>
      )}

      {/* Phase 3: Done */}
      {phase === "done" && syncResult && (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">Sync Complete</h2>
              <div className="text-center text-sm text-gray-600">
                {syncResult.removed > 0 && (
                  <p>
                    {syncResult.removed} listing
                    {syncResult.removed !== 1 ? "s" : ""} marked as OFF_MARKET
                  </p>
                )}
                {syncResult.created > 0 && (
                  <p>
                    {syncResult.created} new listing
                    {syncResult.created !== 1 ? "s" : ""} created
                  </p>
                )}
              </div>
              <Button onClick={handleReset}>Sync Another Building</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
