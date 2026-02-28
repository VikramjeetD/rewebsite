"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  extractBuildingFromContent,
  compareBuildingListings,
  executeBuildingSync,
} from "@/actions/building-sync";
import { BuildingSyncInput } from "./building-sync-input";
import { BuildingSyncReview } from "./building-sync-review";
import { BuildingSyncDone } from "./building-sync-done";
import type { BuildingExtractionResult, BuildingSyncComparison } from "@/types";

type Phase = "input" | "review" | "done";

export function BuildingSync() {
  const [phase, setPhase] = useState<Phase>("input");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [extraction, setExtraction] = useState<BuildingExtractionResult | null>(
    null
  );
  const [comparison, setComparison] = useState<BuildingSyncComparison | null>(
    null
  );
  const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(
    new Set()
  );
  const [selectedAdditions, setSelectedAdditions] = useState<Set<string>>(
    new Set()
  );
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

    const compResult = await compareBuildingListings(result.data);
    setLoading(false);

    if (!compResult.success || !compResult.data) {
      setError(compResult.error ?? "Comparison failed");
      return;
    }

    setComparison(compResult.data);
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {phase === "input" && (
        <BuildingSyncInput
          content={content}
          sourceUrl={sourceUrl}
          loading={loading}
          onContentChange={setContent}
          onSourceUrlChange={setSourceUrl}
          onExtract={handleExtract}
        />
      )}

      {phase === "review" && comparison && extraction && (
        <BuildingSyncReview
          extraction={extraction}
          comparison={comparison}
          selectedRemovals={selectedRemovals}
          selectedAdditions={selectedAdditions}
          loading={loading}
          onToggleRemoval={toggleRemoval}
          onToggleAddition={toggleAddition}
          onSync={handleSync}
          onReset={handleReset}
        />
      )}

      {phase === "done" && syncResult && (
        <BuildingSyncDone syncResult={syncResult} onReset={handleReset} />
      )}
    </div>
  );
}
