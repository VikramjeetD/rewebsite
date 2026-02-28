import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface BuildingSyncDoneProps {
  syncResult: { removed: number; created: number };
  onReset: () => void;
}

export function BuildingSyncDone({
  syncResult,
  onReset,
}: BuildingSyncDoneProps) {
  return (
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
          <Button onClick={onReset}>Sync Another Building</Button>
        </div>
      </CardContent>
    </Card>
  );
}
