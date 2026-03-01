import { getListings } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ListingsTable } from "@/components/admin/listings-table";

export default async function AdminListingsPage() {
  const listings = await getListings();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Listings</h1>
        <Link
          href="/admin/listings/new"
          className="bg-white px-4 py-2 text-sm font-medium uppercase tracking-wider text-black hover:bg-white/90"
        >
          Add Listing
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <ListingsTable listings={listings} />
        </CardContent>
      </Card>
    </div>
  );
}
