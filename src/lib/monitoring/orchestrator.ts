import {
  getMonitorableListings,
  addPageSnapshot,
  updateListing,
  addStatusChange,
} from "@/lib/firestore";
import { checkListingPage } from "./checker";
import { isTerminalStatus, cleanupListingAssets } from "@/lib/cleanup";
import type { MonitoringSummary } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMonitoringCycle(): Promise<MonitoringSummary> {
  const listings = await getMonitorableListings();

  const summary: MonitoringSummary = {
    total: listings.length,
    checked: 0,
    changed: 0,
    statusUpdated: 0,
    errors: 0,
  };

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  for (const listing of listings) {
    // Circuit breaker
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(
        `Circuit breaker: ${consecutiveErrors} consecutive errors, stopping`
      );
      break;
    }

    // Rate limit: random 2-10s delay
    const delay = Math.floor(Math.random() * 8000) + 2000;
    await sleep(delay);

    const result = await checkListingPage(
      listing.id,
      listing.sourceUrl!,
      listing.status
    );

    summary.checked++;

    if (result.error) {
      summary.errors++;
      consecutiveErrors++;

      // Store error snapshot
      await addPageSnapshot(listing.id, {
        url: listing.sourceUrl!,
        contentHash: "",
        httpStatus: result.httpStatus,
        detectedStatus: null,
        confidence: null,
        error: result.error,
        checkedAt: new Date(),
      });

      continue;
    }

    consecutiveErrors = 0;

    // Store snapshot
    await addPageSnapshot(listing.id, {
      url: listing.sourceUrl!,
      contentHash: result.newHash,
      httpStatus: result.httpStatus,
      detectedStatus: result.detectedStatus,
      confidence: result.confidence,
      error: null,
      checkedAt: new Date(),
    });

    if (!result.changed) continue;
    summary.changed++;

    // If status changed with high confidence, auto-update
    if (
      result.detectedStatus &&
      result.detectedStatus !== listing.status &&
      result.confidence !== null &&
      result.confidence >= 0.8
    ) {
      await updateListing(listing.id, { status: result.detectedStatus });
      await addStatusChange(listing.id, {
        fromStatus: listing.status,
        toStatus: result.detectedStatus,
        source: "AUTO_DETECTED",
        notes: `Confidence: ${Math.round(result.confidence * 100)}%. ${result.reasoning ?? ""}`,
      });

      // Auto-cleanup assets when listing reaches a terminal status
      if (isTerminalStatus(result.detectedStatus)) {
        await cleanupListingAssets(listing.id);
      }

      summary.statusUpdated++;
    }
  }

  return summary;
}
