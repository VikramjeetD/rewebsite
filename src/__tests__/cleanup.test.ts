import { describe, it, expect, vi, beforeEach } from "vitest";
import { isTerminalStatus, TERMINAL_STATUSES } from "@/lib/cleanup";
import type { ListingStatus } from "@/types";

// --- Pure logic tests (no mocks needed) ---

describe("isTerminalStatus", () => {
  it("returns true for RENTED", () => {
    expect(isTerminalStatus("RENTED")).toBe(true);
  });

  it("returns true for SOLD", () => {
    expect(isTerminalStatus("SOLD")).toBe(true);
  });

  it("returns true for OFF_MARKET", () => {
    expect(isTerminalStatus("OFF_MARKET")).toBe(true);
  });

  it("returns false for ACTIVE", () => {
    expect(isTerminalStatus("ACTIVE")).toBe(false);
  });

  it("returns false for IN_CONTRACT", () => {
    expect(isTerminalStatus("IN_CONTRACT")).toBe(false);
  });

  it("returns false for DRAFT", () => {
    expect(isTerminalStatus("DRAFT")).toBe(false);
  });
});

describe("TERMINAL_STATUSES", () => {
  it("contains exactly RENTED, SOLD, OFF_MARKET", () => {
    expect(TERMINAL_STATUSES).toEqual(["RENTED", "SOLD", "OFF_MARKET"]);
  });

  it("does not contain ACTIVE", () => {
    expect(TERMINAL_STATUSES).not.toContain("ACTIVE");
  });

  it("does not contain DRAFT", () => {
    expect(TERMINAL_STATUSES).not.toContain("DRAFT");
  });

  it("does not contain IN_CONTRACT", () => {
    expect(TERMINAL_STATUSES).not.toContain("IN_CONTRACT");
  });
});

// --- Mocked integration tests ---

// Mock Vercel Blob
vi.mock("@vercel/blob", () => ({
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock Firebase
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] });
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/firebase", () => ({
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        delete: mockDelete,
        update: mockUpdate,
        get: vi.fn().mockResolvedValue({
          exists: true,
          id: "test-listing",
          data: () => ({
            photos: [
              { url: "https://blob.vercel-storage.com/photo1.jpg" },
              { url: "https://blob.vercel-storage.com/photo2.jpg" },
            ],
            slug: "test",
            title: "Test",
            description: "",
            type: "RENTAL",
            status: "SOLD",
            price: 100000,
            bedrooms: 1,
            bathrooms: 1,
            address: "123 Main",
            neighborhood: "Test",
            borough: "Manhattan",
            amenities: [],
          }),
        }),
        collection: () => ({
          get: mockGet,
          add: vi.fn(),
        }),
      }),
    }),
    batch: () => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    }),
  }),
}));

import { del } from "@vercel/blob";
import {
  deleteListingPhotos,
  cleanupListingAssets,
  cleanupListingFull,
} from "@/lib/cleanup";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ empty: true, docs: [], size: 0 });
});

describe("deleteListingPhotos", () => {
  it("calls Vercel Blob del with photo URLs", async () => {
    const urls = [
      "https://blob.vercel-storage.com/photo1.jpg",
      "https://blob.vercel-storage.com/photo2.jpg",
    ];
    const count = await deleteListingPhotos(urls);
    expect(del).toHaveBeenCalledWith(urls);
    expect(count).toBe(2);
  });

  it("returns 0 for empty array without calling del", async () => {
    const count = await deleteListingPhotos([]);
    expect(del).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });

  it("handles single photo", async () => {
    const urls = ["https://blob.vercel-storage.com/single.jpg"];
    const count = await deleteListingPhotos(urls);
    expect(del).toHaveBeenCalledWith(urls);
    expect(count).toBe(1);
  });
});

describe("cleanupListingAssets", () => {
  it("deletes photos and clears the photos array on the listing", async () => {
    const result = await cleanupListingAssets("test-listing");
    expect(del).toHaveBeenCalled();
    expect(result.photosDeleted).toBe(2);
    expect(mockUpdate).toHaveBeenCalledWith({
      photos: [],
      featured: false,
    });
  });

  it("deletes page snapshots subcollection", async () => {
    const result = await cleanupListingAssets("test-listing");
    expect(result.snapshotsDeleted).toBe(0); // empty subcollection in mock
  });
});

describe("cleanupListingFull", () => {
  it("deletes photos, subcollections, and the listing document", async () => {
    const result = await cleanupListingFull("test-listing");
    expect(del).toHaveBeenCalled();
    expect(result.photosDeleted).toBe(2);
    expect(mockDelete).toHaveBeenCalled(); // listing doc deleted
  });
});

// --- Status transition logic tests ---

describe("status transition triggers cleanup", () => {
  const nonTerminalStatuses: ListingStatus[] = [
    "ACTIVE",
    "IN_CONTRACT",
    "DRAFT",
  ];
  const terminalStatuses: ListingStatus[] = ["RENTED", "SOLD", "OFF_MARKET"];

  it.each(terminalStatuses)(
    "transitioning to %s is a terminal status",
    (status) => {
      expect(isTerminalStatus(status)).toBe(true);
    }
  );

  it.each(nonTerminalStatuses)(
    "transitioning to %s is NOT a terminal status",
    (status) => {
      expect(isTerminalStatus(status)).toBe(false);
    }
  );

  it("ACTIVE → RENTED triggers cleanup", () => {
    expect(isTerminalStatus("RENTED")).toBe(true);
  });

  it("ACTIVE → SOLD triggers cleanup", () => {
    expect(isTerminalStatus("SOLD")).toBe(true);
  });

  it("ACTIVE → IN_CONTRACT does NOT trigger cleanup", () => {
    expect(isTerminalStatus("IN_CONTRACT")).toBe(false);
  });

  it("IN_CONTRACT → RENTED triggers cleanup", () => {
    expect(isTerminalStatus("RENTED")).toBe(true);
  });

  it("IN_CONTRACT → ACTIVE does NOT trigger cleanup (relisted)", () => {
    expect(isTerminalStatus("ACTIVE")).toBe(false);
  });

  it("DRAFT → ACTIVE does NOT trigger cleanup", () => {
    expect(isTerminalStatus("ACTIVE")).toBe(false);
  });
});
