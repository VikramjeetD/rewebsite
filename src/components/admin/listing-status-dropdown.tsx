"use client";

import { updateListingStatusAction } from "@/actions/listings";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import type { ListingStatus } from "@/types";
import { useTransition } from "react";

const statuses: ListingStatus[] = [
  "ACTIVE",
  "IN_CONTRACT",
  "RENTED",
  "SOLD",
  "OFF_MARKET",
  "DRAFT",
];

interface ListingStatusDropdownProps {
  listingId: string;
  currentStatus: ListingStatus;
}

export function ListingStatusDropdown({
  listingId,
  currentStatus,
}: ListingStatusDropdownProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ListingStatus;
    if (newStatus === currentStatus) return;
    startTransition(() => {
      updateListingStatusAction(listingId, newStatus, currentStatus);
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(currentStatus)} border-0 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]`}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {getStatusLabel(s)}
        </option>
      ))}
    </select>
  );
}
