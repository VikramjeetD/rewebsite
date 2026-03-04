import { getListings, getNeighborhoods } from "@/lib/firestore";
import { ListingGrid } from "@/components/listings/listing-grid";
import { ListingFilters } from "@/components/listings/listing-filters";
import type { Metadata } from "next";
import type { ListingStatus } from "@/types";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Listings",
  description:
    "Browse available apartments and homes for rent and sale in New York.",
};

interface ListingsPageProps {
  searchParams: Promise<{
    type?: string;
    neighborhood?: string;
    beds?: string;
    baths?: string;
    priceMin?: string;
    priceMax?: string;
    amenities?: string;
    sort?: string;
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
  if (params.baths) {
    const baths = parseInt(params.baths);
    if (baths === 3) {
      filtered = filtered.filter((l) => l.bathrooms >= 3);
    } else {
      filtered = filtered.filter(
        (l) => l.bathrooms >= baths && l.bathrooms < baths + 1
      );
    }
  }
  if (params.priceMin) {
    const min = parseInt(params.priceMin) * 100;
    if (!isNaN(min)) {
      filtered = filtered.filter((l) => l.price >= min);
    }
  }
  if (params.priceMax) {
    const max = parseInt(params.priceMax) * 100;
    if (!isNaN(max)) {
      filtered = filtered.filter((l) => l.price <= max);
    }
  }
  if (params.amenities) {
    const keys = params.amenities.split(",").filter(Boolean);
    if (keys.length > 0) {
      filtered = filtered.filter((l) =>
        keys.every((k) => l.amenities?.includes(k))
      );
    }
  }

  // Sorting
  const sort = params.sort ?? "newest";
  switch (sort) {
    case "price-low":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "sqft":
      filtered.sort((a, b) => (b.sqft ?? 0) - (a.sqft ?? 0));
      break;
    case "newest":
    default:
      filtered.sort(
        (a, b) => b.createdAt!.getTime() - a.createdAt!.getTime()
      );
      break;
  }

  return (
    <div className="py-8">
      <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Available Listings</h1>
        <p className="mt-2 text-white/60">
          {filtered.length} {filtered.length === 1 ? "property" : "properties"}{" "}
          available
        </p>
      </div>

      <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Suspense>
          <ListingFilters neighborhoods={neighborhoods} />
        </Suspense>
      </div>

      <ListingGrid listings={filtered} />
    </div>
  );
}
