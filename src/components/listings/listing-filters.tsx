"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Dropdown } from "@/components/ui/dropdown";

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

export function ListingFilters({ neighborhoods }: ListingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const currentType = searchParams.get("type") ?? "";
  const currentNeighborhood = searchParams.get("neighborhood") ?? "";
  const currentBeds = searchParams.get("beds") ?? "";

  const neighborhoodOptions = neighborhoods.map((n) => ({
    value: n,
    label: n,
  }));

  return (
    <div className="flex flex-wrap gap-4">
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
        value={currentNeighborhood}
        onValueChange={(v) => handleFilterChange("neighborhood", v)}
        options={neighborhoodOptions}
        placeholder="All Neighborhoods"
      />
    </div>
  );
}
