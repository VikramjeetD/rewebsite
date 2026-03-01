import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import type { Listing } from "@/types";

interface FeaturedListingsProps {
  listings: Listing[];
}

export function FeaturedListings({ listings }: FeaturedListingsProps) {
  if (listings.length === 0) return null;

  const display = listings.slice(0, 20);

  return (
    <section className="py-16">
      <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Featured Listings</h2>
          <Link
            href="/listings"
            className="flex items-center gap-1 text-sm font-medium text-white/60 hover:text-white"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {display.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
