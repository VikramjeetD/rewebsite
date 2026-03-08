import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  runConcurrent,
  makeGeocodingResponse,
  measureMemoryMB,
} from "./helpers";

// Mock global fetch before import
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { geocodeAddress } from "@/lib/geocoding";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
});

describe("geocoding stress tests", () => {
  it("handles 100 concurrent successful requests", async () => {
    mockFetch.mockImplementation(async () => ({
      json: () => Promise.resolve(makeGeocodingResponse(0)),
    }));

    const { fulfilled, rejected } = await runConcurrent(100, (i) =>
      geocodeAddress(`${100 + i} Main St`, "SoHo", "Manhattan")
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(100);
    fulfilled.forEach((r) => {
      expect(r).toHaveProperty("lat");
      expect(r).toHaveProperty("lng");
    });
    expect(mockFetch).toHaveBeenCalledTimes(100);
  });

  it("handles 100 concurrent with 30% network errors", async () => {
    let callIndex = 0;
    mockFetch.mockImplementation(async () => {
      const idx = callIndex++;
      if (idx % 3 === 0) {
        throw new Error("Network error");
      }
      return {
        json: () => Promise.resolve(makeGeocodingResponse(idx)),
      };
    });

    const { fulfilled, rejected } = await runConcurrent(100, (i) =>
      geocodeAddress(`${i} Broadway`, "Tribeca", "Manhattan")
    );

    // All should resolve (geocodeAddress catches errors and returns null)
    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(100);

    const successCount = fulfilled.filter((r) => r !== null).length;
    const nullCount = fulfilled.filter((r) => r === null).length;
    expect(successCount).toBeGreaterThan(0);
    expect(nullCount).toBeGreaterThan(0);
  });

  it("handles 100 concurrent with mixed API statuses", async () => {
    const statuses = ["OK", "ZERO_RESULTS", "OVER_QUERY_LIMIT"];
    let callIndex = 0;

    mockFetch.mockImplementation(async () => {
      const idx = callIndex++;
      const status = statuses[idx % statuses.length];
      return {
        json: () => Promise.resolve(makeGeocodingResponse(idx, status)),
      };
    });

    const { fulfilled, rejected } = await runConcurrent(100, (i) =>
      geocodeAddress(`${i} Park Ave`, "UES", "Manhattan")
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(100);

    const successCount = fulfilled.filter((r) => r !== null).length;
    const nullCount = fulfilled.filter((r) => r === null).length;
    // ~33% should succeed (OK), ~67% should be null
    expect(successCount).toBeGreaterThan(20);
    expect(nullCount).toBeGreaterThan(50);
  });

  it("handles 500 sequential calls throughput", async () => {
    mockFetch.mockImplementation(async () => ({
      json: () => Promise.resolve(makeGeocodingResponse(0)),
    }));

    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      await geocodeAddress(`${i} Elm St`, "Midtown", "Manhattan");
    }
    const durationMs = performance.now() - start;

    expect(mockFetch).toHaveBeenCalledTimes(500);
    // Should complete in reasonable time (mocked, no network)
    expect(durationMs).toBeLessThan(5000);
  });

  it("handles 50 malformed/empty addresses", async () => {
    mockFetch.mockImplementation(async () => ({
      json: () => Promise.resolve({ status: "ZERO_RESULTS", results: [] }),
    }));

    const addresses = Array.from({ length: 50 }, (_, i) => {
      const variants = ["", "   ", "!@#$%", "a".repeat(1000), "\n\t\r"];
      return variants[i % variants.length];
    });

    const { fulfilled, rejected } = await runConcurrent(50, (i) =>
      geocodeAddress(addresses[i], "", "")
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    // All should return null for bad addresses
    fulfilled.forEach((r) => expect(r).toBeNull());
  });

  it("maintains stable memory over 200 calls", async () => {
    mockFetch.mockImplementation(async () => ({
      json: () => Promise.resolve(makeGeocodingResponse(0)),
    }));

    const memBefore = measureMemoryMB();

    for (let i = 0; i < 200; i++) {
      await geocodeAddress(`${i} Test St`, "SoHo", "Manhattan");
    }

    const memAfter = measureMemoryMB();
    const deltaMB = memAfter - memBefore;

    // Memory growth should be bounded (< 50MB for 200 simple calls)
    expect(deltaMB).toBeLessThan(50);
    expect(mockFetch).toHaveBeenCalledTimes(200);
  });
});
