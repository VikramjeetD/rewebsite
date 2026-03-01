import { getListings } from "@/lib/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, CheckCircle, Clock, DollarSign } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { GeocodeButton } from "./_components/geocode-button";

export default async function AdminDashboard() {
  const allListings = await getListings();

  const active = allListings.filter((l) => l.status === "ACTIVE");
  const inContract = allListings.filter((l) => l.status === "IN_CONTRACT");
  const rented = allListings.filter((l) => l.status === "RENTED");
  const sold = allListings.filter((l) => l.status === "SOLD");
  const drafts = allListings.filter((l) => l.status === "DRAFT");
  const ungeocoded = allListings.filter((l) => l.latitude == null);

  const stats = [
    {
      label: "Active Listings",
      value: active.length,
      icon: Building2,
      color: "text-green-400",
    },
    {
      label: "In Contract",
      value: inContract.length,
      icon: Clock,
      color: "text-yellow-400",
    },
    {
      label: "Rented",
      value: rented.length,
      icon: CheckCircle,
      color: "text-blue-400",
    },
    {
      label: "Sold",
      value: sold.length,
      icon: DollarSign,
      color: "text-blue-400",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <GeocodeButton ungeocodedCount={ungeocoded.length} />
          <Link
            href="/admin/listings/new"
            className="bg-white px-4 py-2 text-sm font-medium uppercase tracking-wider text-black hover:bg-white/90"
          >
            Add Listing
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 py-6">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/40">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {drafts.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="font-semibold text-white">Drafts</h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {drafts.map((listing) => (
                <li key={listing.id}>
                  <Link
                    href={`/admin/listings/${listing.id}/edit`}
                    className="text-sm text-blue-400 hover:underline"
                  >
                    {listing.address}
                    {listing.unit ? ` #${listing.unit}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Recent Listings</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/40">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Neighborhood</th>
                </tr>
              </thead>
              <tbody>
                {allListings.slice(0, 10).map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="py-3">
                      <Link
                        href={`/admin/listings/${listing.id}/edit`}
                        className="text-blue-400 hover:underline"
                      >
                        {listing.title}
                      </Link>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="py-3 text-white/60">
                      {formatPrice(listing.price, listing.type)}
                    </td>
                    <td className="py-3 text-white/60">
                      {listing.neighborhood}
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
