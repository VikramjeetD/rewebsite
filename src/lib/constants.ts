import type { ListingStatus } from "@/types";

export const BOROUGHS = [
  "N/A",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

export const LISTING_STATUSES: {
  value: ListingStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "IN_CONTRACT", label: "In Contract" },
  { value: "RENTED", label: "Rented" },
  { value: "SOLD", label: "Sold" },
  { value: "OFF_MARKET", label: "Off Market" },
];

export const ALL_STATUSES: ListingStatus[] = LISTING_STATUSES.map(
  (s) => s.value
);

export const ACTIVE_STATUSES: ListingStatus[] = [
  "ACTIVE",
  "IN_CONTRACT",
  "DRAFT",
];

export const TERMINAL_STATUSES: ListingStatus[] = [
  "RENTED",
  "SOLD",
  "OFF_MARKET",
];
