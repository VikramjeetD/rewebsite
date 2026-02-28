import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, unit?: string | null): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
  if (unit) {
    return `${formatted}/${unit}`;
  }
  return formatted;
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
      return "bg-green-100 text-green-800";
    case "IN_CONTRACT":
      return "bg-yellow-100 text-yellow-800";
    case "RENTED":
    case "SOLD":
      return "bg-blue-100 text-blue-800";
    case "OFF_MARKET":
      return "bg-gray-100 text-gray-800";
    case "DRAFT":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
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
