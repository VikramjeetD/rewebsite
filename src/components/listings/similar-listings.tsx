import { getSimilarListings } from "@/lib/firestore";
import { ListingCard } from "./listing-card";
import type { Listing } from "@/types";

interface SimilarListingsProps {
  listing: Listing;
}

export async function SimilarListings({ listing }: SimilarListingsProps) {
  const similar = await getSimilarListings(listing);

  if (similar.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-white">Similar Listings</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {similar.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}
