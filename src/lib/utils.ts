import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(
  cents: number,
  type: "RENTAL" | "SALE" = "SALE"
): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
  if (type === "RENTAL") {
    return `${formatted}/month`;
  }
  return formatted;
}

export function generateTitle(address: string, unit?: string | null): string {
  if (!address) return "Untitled Listing";
  if (unit) return `${address} #${unit}`;
  return address;
}

export function calculateEffectiveRent(
  cents: number,
  leaseDuration: number | null,
  freeMonths: number | null
): number | null {
  if (!leaseDuration || !freeMonths || leaseDuration <= 0) return null;
  const paidMonths = leaseDuration - freeMonths;
  if (paidMonths <= 0) return null;
  const totalCents = cents * paidMonths;
  return Math.round(totalCents / leaseDuration);
}

export function formatEffectiveRent(
  cents: number,
  leaseDuration: number | null,
  freeMonths: number | null
): string | null {
  const effective = calculateEffectiveRent(cents, leaseDuration, freeMonths);
  if (effective === null) return null;
  return formatPrice(effective, "RENTAL");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatBedrooms(bedrooms: number): string {
  if (bedrooms === 0) return "Studio";
  if (bedrooms === 1) return "1 Bed";
  return `${bedrooms} Beds`;
}

export function formatBathrooms(bathrooms: number): string {
  if (bathrooms === 1) return "1 Bath";
  return `${bathrooms} Baths`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/20 text-green-400";
    case "IN_CONTRACT":
      return "bg-yellow-500/20 text-yellow-400";
    case "RENTED":
    case "SOLD":
      return "bg-blue-500/20 text-blue-400";
    case "OFF_MARKET":
      return "bg-white/10 text-white/60";
    case "DRAFT":
      return "bg-orange-500/20 text-orange-400";
    default:
      return "bg-white/10 text-white/60";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "IN_CONTRACT":
      return "In Contract";
    case "RENTED":
      return "Rented";
    case "SOLD":
      return "Sold";
    case "OFF_MARKET":
      return "Off Market";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

export function absoluteUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}${path}`;
}

const ADDRESS_ABBREVIATIONS: [RegExp, string][] = [
  [/\bstreet\b/gi, "st"],
  [/\bavenue\b/gi, "ave"],
  [/\bboulevard\b/gi, "blvd"],
  [/\bdrive\b/gi, "dr"],
  [/\broad\b/gi, "rd"],
  [/\bplace\b/gi, "pl"],
  [/\bcourt\b/gi, "ct"],
  [/\blane\b/gi, "ln"],
  [/\bwest\b/gi, "w"],
  [/\beast\b/gi, "e"],
  [/\bnorth\b/gi, "n"],
  [/\bsouth\b/gi, "s"],
];

export function normalizeAddress(address: string): string {
  let normalized = address.toLowerCase().trim();
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ");
  // Apply abbreviations
  for (const [pattern, replacement] of ADDRESS_ABBREVIATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  // Remove trailing punctuation
  normalized = normalized.replace(/[.,]+$/, "");
  return normalized;
}

export function normalizeUnit(unit: string): string {
  let normalized = unit.toLowerCase().trim();
  // Strip common prefixes
  normalized = normalized.replace(/^(apt\.?|apartment|unit|#)\s*/i, "");
  // Remove leading zeros
  normalized = normalized.replace(/^0+/, "");
  return normalized;
}
