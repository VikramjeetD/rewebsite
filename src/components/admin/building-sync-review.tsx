import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Check, Minus, Plus, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type {
  BuildingExtractionResult,
  BuildingSyncComparison,
  BuildingUnit,
} from "@/types";

interface BuildingSyncReviewProps {
  extraction: BuildingExtractionResult;
  comparison: BuildingSyncComparison;
  selectedRemovals: Set<string>;
  selectedAdditions: Set<string>;
  loading: boolean;
  onToggleRemoval: (id: string) => void;
  onToggleAddition: (unit: string) => void;
  onSync: () => void;
  onReset: () => void;
}

function formatUnitPrice(unit: BuildingUnit) {
  if (!unit.price) return "Price TBD";
  return formatPrice(unit.price, "RENTAL");
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

export function BuildingSyncReview({
  extraction,
  comparison,
  selectedRemovals,
  selectedAdditions,
  loading,
  onToggleRemoval,
  onToggleAddition,
  onSync,
  onReset,
}: BuildingSyncReviewProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{extraction.address}</h2>
              <p className="text-sm text-gray-500">
                {extraction.neighborhood}
                {extraction.borough ? `, ${extraction.borough}` : ""}
                {" — "}
                {extraction.units.length} unit
                {extraction.units.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <Button variant="outline" onClick={onReset}>
              Start Over
            </Button>
          </div>
        </CardHeader>
      </Card>

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
              These units exist in your database but are not on the availability
              page. Selected units will be marked OFF_MARKET.
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
                    onChange={() => onToggleRemoval(listing.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Unit {unit}</span>
                    <span className="ml-3 text-sm text-gray-600">
                      {formatPrice(listing.price, listing.type)} —{" "}
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
              These units are on the availability page but not in your database.
              Selected units will be created as DRAFT listings.
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
                    onChange={() => onToggleAddition(unit.unit)}
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
                      <span className="font-medium">Unit {listing.unit}</span>
                      <span className="ml-3 text-sm text-gray-600">
                        {formatPrice(listing.price, listing.type)}
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

      {comparison.removed.length === 0 && comparison.added.length === 0 && (
        <Card>
          <CardContent>
            <p className="py-4 text-center text-gray-500">
              Everything is already in sync. No changes needed.
            </p>
          </CardContent>
        </Card>
      )}

      {(comparison.removed.length > 0 || comparison.added.length > 0) && (
        <div className="flex items-center gap-3">
          <Button
            onClick={onSync}
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
            {selectedRemovals.size > 0 && `${selectedRemovals.size} removed`}
            {selectedRemovals.size > 0 && selectedAdditions.size > 0 && ", "}
            {selectedAdditions.size > 0 && `${selectedAdditions.size} created`}
          </span>
        </div>
      )}
    </>
  );
}
