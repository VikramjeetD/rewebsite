"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { ListingStatusDropdown } from "@/components/admin/listing-status-dropdown";
import { DeleteListingButton } from "@/components/admin/delete-listing-button";
import {
  bulkDeleteListingsAction,
  duplicateListingAction,
} from "@/actions/listings";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/types";

interface ListingsTableProps {
  listings: Listing[];
}

export function ListingsTable({ listings }: ListingsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = listings.filter((l) => {
    if (featuredOnly && !l.featured) return false;
    if (
      addressSearch.trim() &&
      !l.address.toLowerCase().includes(addressSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    const count = selected.size;
    if (
      !window.confirm(
        `Delete ${count} listing${count === 1 ? "" : "s"}? This cannot be undone.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await bulkDeleteListingsAction(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3">
        <input
          type="text"
          value={addressSearch}
          onChange={(e) => setAddressSearch(e.target.value)}
          placeholder="Search by address..."
          className="border border-white/10 bg-white/5 px-3 py-1 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <button
          type="button"
          onClick={() => setFeaturedOnly(!featuredOnly)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            featuredOnly
              ? "border-white/30 bg-white/10 text-white"
              : "border-white/10 text-white/40 hover:text-white/60"
          )}
        >
          Featured
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm text-white/60">
            {selected.size} selected
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isPending}
          >
            {isPending
              ? "Deleting..."
              : `Delete ${selected.size} Listing${selected.size === 1 ? "" : "s"}`}
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-white/40 hover:text-white/60"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/40">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-white"
                />
              </th>
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Price</th>
              <th className="px-6 py-3 font-medium">Beds/Baths</th>
              <th className="px-6 py-3 font-medium">OP</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-white/40">
                  {featuredOnly ? (
                    "No featured listings."
                  ) : (
                    <>
                      No listings yet.{" "}
                      <Link
                        href="/admin/listings/new"
                        className="text-blue-400 hover:underline"
                      >
                        Add your first listing
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            )}
            {filtered.map((listing) => (
              <tr
                key={listing.id}
                className={
                  selected.has(listing.id)
                    ? "border-b border-white/5 bg-white/10 last:border-0"
                    : "border-b border-white/5 last:border-0 hover:bg-white/5"
                }
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(listing.id)}
                    onChange={() => toggle(listing.id)}
                    className="accent-white"
                  />
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/listings/${listing.id}/edit`}
                    className="font-medium text-blue-400 hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-white/40">
                    {listing.address}
                    {listing.unit ? `, ${listing.unit}` : ""}
                  </p>
                </td>
                <td className="px-6 py-4 text-white/60">
                  <span className="text-xs">{listing.type}</span>
                </td>
                <td className="px-6 py-4">
                  <ListingStatusDropdown
                    listingId={listing.id}
                    currentStatus={listing.status}
                  />
                </td>
                <td className="px-6 py-4 text-white/60">
                  {formatPrice(listing.price, listing.type)}
                </td>
                <td className="px-6 py-4 text-white/60">
                  {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms}BD`}{" "}
                  / {listing.bathrooms}BA
                </td>
                <td className="px-6 py-4 text-white/60">
                  {listing.op != null ? listing.op : "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="text-blue-400 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() =>
                          duplicateListingAction(listing.id)
                        );
                      }}
                      disabled={isPending}
                      className="text-white/40 hover:text-white/60"
                    >
                      Duplicate
                    </button>
                    <DeleteListingButton
                      listingId={listing.id}
                      listingTitle={listing.title}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
