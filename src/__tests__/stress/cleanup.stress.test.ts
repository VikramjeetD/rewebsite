import { describe, it, expect, vi, beforeEach } from "vitest";
import { runConcurrent, measureMemoryMB } from "./helpers";

// Mock Vercel Blob
const mockDel = vi.fn().mockResolvedValue(undefined);
vi.mock("@vercel/blob", () => ({
  del: (...args: unknown[]) => mockDel(...args),
}));

// Mock Firebase
const mockDelete = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 });
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

function makePhotoUrls(count: number) {
  return Array.from(
    { length: count },
    (_, i) => `https://blob.vercel-storage.com/photo-${i}.jpg`
  );
}

vi.mock("@/lib/firebase", () => ({
  getDb: () => ({
    collection: () => ({
      doc: (id: string) => ({
        delete: mockDelete,
        update: mockUpdate,
        get: vi.fn().mockImplementation(() =>
          Promise.resolve({
            exists: true,
            id,
            data: () => ({
              photos: makePhotoUrls(2),
              floorPlans: [],
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
          })
        ),
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

// Mock firestore getListingById
vi.mock("@/lib/firestore", () => ({
  getListingById: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({
      id,
      photos: makePhotoUrls(2),
      floorPlans: [],
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
    })
  ),
}));

import {
  deleteListingPhotos,
  cleanupListingAssets,
  cleanupListingFull,
} from "@/lib/cleanup";
import { getListingById } from "@/lib/firestore";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ empty: true, docs: [], size: 0 });
});

describe("cleanup stress tests", () => {
  it("handles listing with 100 photo URLs", async () => {
    const urls = makePhotoUrls(100);
    const count = await deleteListingPhotos(urls);
    expect(count).toBe(100);
    expect(mockDel).toHaveBeenCalledWith(urls);
  });

  it("handles listing with 500 photo URLs", async () => {
    const urls = makePhotoUrls(500);
    const count = await deleteListingPhotos(urls);
    expect(count).toBe(500);
    expect(mockDel).toHaveBeenCalledWith(urls);
  });

  it("handles 50 concurrent cleanupListingFull calls", async () => {
    const { fulfilled, rejected } = await runConcurrent(50, (i) =>
      cleanupListingFull(`listing-${i}`)
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((r) => {
      expect(r).toHaveProperty("photosDeleted");
      expect(r).toHaveProperty("statusChangesDeleted");
    });
  });

  it("handles 50 concurrent cleanupListingAssets calls", async () => {
    const { fulfilled, rejected } = await runConcurrent(50, (i) =>
      cleanupListingAssets(`listing-${i}`)
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((r) => {
      expect(r).toHaveProperty("photosDeleted");
    });
  });

  it("handles del() rejection gracefully", async () => {
    mockDel.mockRejectedValueOnce(new Error("Blob service unavailable"));

    const urls = makePhotoUrls(5);

    await expect(deleteListingPhotos(urls)).rejects.toThrow(
      "Blob service unavailable"
    );
  });

  it("handles cron-style sequential cleanup of 100 listings", async () => {
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const result = await cleanupListingFull(`listing-${i}`);
      expect(result).toHaveProperty("photosDeleted");
    }

    const durationMs = performance.now() - start;
    expect(durationMs).toBeLessThan(10000);
  });

  it("maintains bounded memory over many cleanup operations", async () => {
    const memBefore = measureMemoryMB();

    for (let i = 0; i < 100; i++) {
      await cleanupListingFull(`listing-${i}`);
    }

    const memAfter = measureMemoryMB();
    const deltaMB = memAfter - memBefore;

    expect(deltaMB).toBeLessThan(50);
  });
});
