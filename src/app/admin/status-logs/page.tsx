import { getListings, getStatusChanges } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { format } from "date-fns";

export default async function StatusLogsPage() {
  const listings = await getListings();

  // Gather all status changes from all listings
  const allChanges: Array<{
    listingTitle: string;
    listingId: string;
    fromStatus: string | null;
    toStatus: string;
    source: string;
    notes: string | null;
    createdAt: Date;
  }> = [];

  for (const listing of listings) {
    const changes = await getStatusChanges(listing.id);
    for (const change of changes) {
      allChanges.push({
        ...change,
        listingTitle: listing.title,
        listingId: listing.id,
      });
    }
  }

  allChanges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-[var(--primary)]">
        Status Change Logs
      </h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Listing</th>
                  <th className="px-6 py-3 font-medium">From</th>
                  <th className="px-6 py-3 font-medium">To</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {allChanges.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No status changes recorded yet.
                    </td>
                  </tr>
                )}
                {allChanges.map((change, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-6 py-3 text-gray-500">
                      {format(change.createdAt, "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {change.listingTitle}
                    </td>
                    <td className="px-6 py-3">
                      {change.fromStatus ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(change.fromStatus)}`}
                        >
                          {getStatusLabel(change.fromStatus)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(change.toStatus)}`}
                      >
                        {getStatusLabel(change.toStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-gray-500">
                        {change.source}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {change.notes ?? "—"}
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
