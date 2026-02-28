import { getListings, getNeighborhoods } from "@/lib/firestore";
import { ListingGrid } from "@/components/listings/listing-grid";
import { ListingFilters } from "@/components/listings/listing-filters";
import type { Metadata } from "next";
import type { ListingStatus } from "@/types";
import { Suspense } from "react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Listings",
  description:
    "Browse available apartments and homes for rent and sale in New York City.",
};

interface ListingsPageProps {
  searchParams: Promise<{
    type?: string;
    neighborhood?: string;
    beds?: string;
  }>;
}

export default async function ListingsPage({
  searchParams,
}: ListingsPageProps) {
  const params = await searchParams;
  const [allListings, neighborhoods] = await Promise.all([
    getListings({ status: "ACTIVE" as ListingStatus }),
    getNeighborhoods(),
  ]);

  let filtered = allListings;

  if (params.type) {
    filtered = filtered.filter((l) => l.type === params.type);
  }
  if (params.neighborhood) {
    filtered = filtered.filter((l) => l.neighborhood === params.neighborhood);
  }
  if (params.beds) {
    const beds = parseInt(params.beds);
    if (beds === 3) {
      filtered = filtered.filter((l) => l.bedrooms >= 3);
    } else {
      filtered = filtered.filter((l) => l.bedrooms === beds);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--primary)]">
          Available Listings
        </h1>
        <p className="mt-2 text-gray-600">
          {filtered.length} {filtered.length === 1 ? "property" : "properties"}{" "}
          available
        </p>
      </div>

      <div className="mb-8">
        <Suspense>
          <ListingFilters neighborhoods={neighborhoods} />
        </Suspense>
      </div>

      <ListingGrid listings={filtered} />
    </div>
  );
}
