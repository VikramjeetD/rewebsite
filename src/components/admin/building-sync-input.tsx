import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BuildingSyncInputProps {
  content: string;
  sourceUrl: string;
  loading: boolean;
  onContentChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onExtract: () => void;
}

export function BuildingSyncInput({
  content,
  sourceUrl,
  loading,
  onContentChange,
  onSourceUrlChange,
  onExtract,
}: BuildingSyncInputProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Paste Building Availability</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Open the building&apos;s availability page in your browser, select
            all text (Cmd+A), copy it (Cmd+C), and paste it below. The AI will
            extract all listed units.
          </p>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => onSourceUrlChange(e.target.value)}
            placeholder="Source URL (optional — for reference)"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Paste the building availability page content here..."
            rows={12}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <Button onClick={onExtract} disabled={loading || !content.trim()}>
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
  );
}
