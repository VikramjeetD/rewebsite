"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractFromContent } from "@/actions/extraction";
import { Loader2, Check, AlertCircle } from "lucide-react";
import type { ExtractionResult } from "@/types";

interface UrlExtractorProps {
  onPopulateForm?: (data: ExtractionResult) => void;
}

export function UrlExtractor({ onPopulateForm }: UrlExtractorProps) {
  const [pastedContent, setPastedContent] = useState("");
  const [sourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState("");

  async function handleExtract() {
    if (!pastedContent.trim()) return;
    setLoading(true);
    setError("");
    setExtracted(null);

    const result = await extractFromContent(
      pastedContent,
      sourceUrl || undefined
    );

    setLoading(false);

    if (result.success && result.data) {
      setExtracted(result.data);
    } else {
      setError(result.error ?? "Extraction failed");
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={pastedContent}
        onChange={(e) => setPastedContent(e.target.value)}
        placeholder="Paste the listing page content here..."
        rows={10}
        className="w-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
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

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {extracted && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">
              Data extracted successfully
            </span>
          </div>
          <pre className="max-h-64 overflow-auto rounded bg-black/30 p-3 text-xs text-white/80">
            {JSON.stringify(extracted, null, 2)}
          </pre>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                onPopulateForm?.(extracted);
                setExtracted(null);
                setPastedContent("");
              }}
            >
              Populate Form Below
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
