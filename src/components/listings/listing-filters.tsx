"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface ListingFiltersProps {
  neighborhoods: string[];
}

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

  return (
    <div className="flex flex-wrap gap-4">
      <select
        value={currentType}
        onChange={(e) => handleFilterChange("type", e.target.value)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <option value="">All Types</option>
        <option value="RENTAL">Rentals</option>
        <option value="SALE">Sales</option>
      </select>

      <select
        value={currentBeds}
        onChange={(e) => handleFilterChange("beds", e.target.value)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <option value="">All Bedrooms</option>
        <option value="0">Studio</option>
        <option value="1">1 Bedroom</option>
        <option value="2">2 Bedrooms</option>
        <option value="3">3+ Bedrooms</option>
      </select>

      <select
        value={currentNeighborhood}
        onChange={(e) => handleFilterChange("neighborhood", e.target.value)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <option value="">All Neighborhoods</option>
        {neighborhoods.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
