import { getListings } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ListingStatusDropdown } from "@/components/admin/listing-status-dropdown";

export default async function AdminListingsPage() {
  const listings = await getListings();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--primary)]">Listings</h1>
        <Link
          href="/admin/listings/new"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white hover:opacity-90"
        >
          Add Listing
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Beds/Baths</th>
                  <th className="px-6 py-3 font-medium">Neighborhood</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No listings yet.{" "}
                      <Link
                        href="/admin/listings/new"
                        className="text-blue-600 hover:underline"
                      >
                        Add your first listing
                      </Link>
                    </td>
                  </tr>
                )}
                {listings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/listings/${listing.id}/edit`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <p className="text-xs text-gray-500">{listing.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs">{listing.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <ListingStatusDropdown
                        listingId={listing.id}
                        currentStatus={listing.status}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {formatPrice(listing.price, listing.priceUnit)}
                    </td>
                    <td className="px-6 py-4">
                      {listing.bedrooms === 0 ? "Studio" : listing.bedrooms}BD /{" "}
                      {listing.bathrooms}BA
                    </td>
                    <td className="px-6 py-4">{listing.neighborhood}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/listings/${listing.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
