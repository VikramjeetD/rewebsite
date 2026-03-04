"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { AmenityFilterDropdown } from "@/components/listings/amenity-filter-dropdown";

interface ListingFiltersProps {
  neighborhoods: string[];
}

const TYPE_OPTIONS = [
  { value: "RENTAL", label: "Rentals" },
  { value: "SALE", label: "Sales" },
];

const BEDROOM_OPTIONS = [
  { value: "0", label: "Studio" },
  { value: "1", label: "1 Bedroom" },
  { value: "2", label: "2 Bedrooms" },
  { value: "3", label: "3+ Bedrooms" },
];

const BATHROOM_OPTIONS = [
  { value: "1", label: "1 Bath" },
  { value: "2", label: "2 Baths" },
  { value: "3", label: "3+ Baths" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "sqft", label: "Largest First" },
];

export function ListingFilters({ neighborhoods }: ListingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  function handleFilterChange(name: string, value: string) {
    router.push(`/listings?${createQueryString(name, value)}`);
  }

  function handleDebouncedFilterChange(name: string, value: string) {
    if (debounceTimers.current[name]) {
      clearTimeout(debounceTimers.current[name]);
    }
    debounceTimers.current[name] = setTimeout(() => {
      handleFilterChange(name, value);
    }, 300);
  }

  const currentType = searchParams.get("type") ?? "";
  const currentNeighborhood = searchParams.get("neighborhood") ?? "";
  const currentBeds = searchParams.get("beds") ?? "";
  const currentBaths = searchParams.get("baths") ?? "";
  const currentSort = searchParams.get("sort") ?? "";
  const currentNoFee = searchParams.get("noFee") === "true";
  const currentAmenities = searchParams.get("amenities")
    ? searchParams.get("amenities")!.split(",")
    : [];
  const currentPriceMin = searchParams.get("priceMin") ?? "";
  const currentPriceMax = searchParams.get("priceMax") ?? "";

  const neighborhoodOptions = neighborhoods.map((n) => ({
    value: n,
    label: n,
  }));

  return (
    <div className="flex flex-wrap items-end gap-4">
      <Dropdown
        value={currentType}
        onValueChange={(v) => handleFilterChange("type", v)}
        options={TYPE_OPTIONS}
        placeholder="All Types"
      />

      <Dropdown
        value={currentBeds}
        onValueChange={(v) => handleFilterChange("beds", v)}
        options={BEDROOM_OPTIONS}
        placeholder="All Bedrooms"
      />

      <Dropdown
        value={currentBaths}
        onValueChange={(v) => handleFilterChange("baths", v)}
        options={BATHROOM_OPTIONS}
        placeholder="All Bathrooms"
      />

      <Dropdown
        value={currentNeighborhood}
        onValueChange={(v) => handleFilterChange("neighborhood", v)}
        options={neighborhoodOptions}
        placeholder="All Neighborhoods"
      />

      <AmenityFilterDropdown
        value={currentAmenities}
        onValueChange={(keys) =>
          handleFilterChange("amenities", keys.join(","))
        }
      />

      {/* Price range */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
            $
          </span>
          <input
            type="number"
            placeholder="Min"
            defaultValue={currentPriceMin}
            onChange={(e) =>
              handleDebouncedFilterChange("priceMin", e.target.value)
            }
            className="w-28 border border-white/10 bg-white/5 py-2 pl-6 pr-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
        <span className="text-white/40">–</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/40">
            $
          </span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={currentPriceMax}
            onChange={(e) =>
              handleDebouncedFilterChange("priceMax", e.target.value)
            }
            className="w-28 border border-white/10 bg-white/5 py-2 pl-6 pr-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      {/* No Fee toggle */}
      <button
        type="button"
        onClick={() => handleFilterChange("noFee", currentNoFee ? "" : "true")}
        className={`border px-4 py-2 text-sm transition-colors ${
          currentNoFee
            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
        }`}
      >
        No Fee
      </button>

      {/* Sort — push to the right */}
      <div className="ml-auto">
        <Dropdown
          value={currentSort}
          onValueChange={(v) => handleFilterChange("sort", v)}
          options={SORT_OPTIONS}
          placeholder="Sort: Newest"
        />
      </div>
    </div>
  );
}
