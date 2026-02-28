import type { ListingStatus } from "@/types";

export interface CheckResult {
  listingId: string;
  url: string;
  changed: boolean;
  newHash: string;
  previousHash: string | null;
  detectedStatus: ListingStatus | null;
  confidence: number | null;
  reasoning: string | null;
  error: string | null;
  httpStatus: number;
}

export interface MonitoringSummary {
  total: number;
  checked: number;
  changed: number;
  statusUpdated: number;
  errors: number;
}
