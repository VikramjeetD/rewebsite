"use client";

import { updateListingStatusAction } from "@/actions/listings";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { ALL_STATUSES } from "@/lib/constants";
import type { ListingStatus } from "@/types";
import { useTransition } from "react";
import { Dropdown } from "@/components/ui/dropdown";

interface ListingStatusDropdownProps {
  listingId: string;
  currentStatus: ListingStatus;
}

const STATUS_OPTIONS = ALL_STATUSES.map((s) => ({
  value: s,
  label: getStatusLabel(s),
}));

export function ListingStatusDropdown({
  listingId,
  currentStatus,
}: ListingStatusDropdownProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(newValue: string) {
    const newStatus = newValue as ListingStatus;
    if (newStatus === currentStatus) return;
    startTransition(() => {
      updateListingStatusAction(listingId, newStatus, currentStatus);
    });
  }

  return (
    <Dropdown
      value={currentStatus}
      onValueChange={handleChange}
      disabled={isPending}
      options={STATUS_OPTIONS}
      variant="pill"
      size="sm"
      className={getStatusColor(currentStatus)}
    />
  );
}
