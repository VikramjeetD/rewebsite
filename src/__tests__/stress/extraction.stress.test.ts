import { describe, it, expect, vi, beforeEach } from "vitest";
import { runConcurrent, measureMemoryMB } from "./helpers";

// Mock Gemini AI
const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
  SchemaType: {
    OBJECT: "object",
    STRING: "string",
    NUMBER: "number",
    ARRAY: "array",
  },
}));

import {
  extractListingFromText,
  extractBuildingFromText,
} from "@/lib/extraction/extractor";

function makeMockListingResponse(i: number) {
  return JSON.stringify({
    description: `Beautiful apartment #${i} in the heart of Manhattan`,
    type: "RENTAL",
    address: `${100 + i} Park Ave`,
    unit: `${i}A`,
    city: "New York",
    state: "NY",
    zipCode: "10016",
    neighborhood: "Murray Hill",
    borough: "Manhattan",
    price: 350000 + i * 1000,
    bedrooms: i % 4,
    bathrooms: (i % 3) + 1,
    sqft: 600 + i * 10,
    availableDate: "2025-06-01",
    op: i % 3 === 0 ? 15 : null,
    freeMonths: i % 5 === 0 ? 1 : null,
    leaseDuration: i % 5 === 0 ? 12 : null,
    amenities: ["Doorman", "Gym", "Laundry"],
    yearBuilt: 1960 + (i % 50),
    numFloors: 10 + (i % 20),
    totalUnits: 50 + (i % 100),
  });
}

function makeMockBuildingResponse(unitCount: number) {
  return JSON.stringify({
    address: "200 Park Ave",
    city: "New York",
    state: "NY",
    neighborhood: "Murray Hill",
    borough: "Manhattan",
    type: "RENTAL",
    buildingAmenities: ["Doorman", "Gym", "Roof Deck", "Laundry"],
    yearBuilt: 1985,
    numFloors: 20,
    totalUnits: unitCount,
    units: Array.from({ length: unitCount }, (_, u) => ({
      unit: `${u + 1}A`,
      price: 300000 + u * 5000,
      bedrooms: u % 4,
      bathrooms: (u % 3) + 1,
      sqft: 500 + u * 15,
      description: `Unit ${u + 1}A — renovated`,
      amenities: ["Washer/Dryer", "Dishwasher"],
    })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-gemini-key";
});

describe("extraction stress tests", () => {
  it("handles 50 concurrent listing extractions", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      response: {
        text: () => {
          const i = Math.floor(Math.random() * 50);
          return makeMockListingResponse(i);
        },
      },
    }));

    const { fulfilled, rejected } = await runConcurrent(50, (i) =>
      extractListingFromText(
        `Listing ${i}: Beautiful 2BR apartment at ${100 + i} Park Ave. $${3500 + i}/month.`
      )
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((r) => {
      expect(r).toHaveProperty("address");
      expect(r).toHaveProperty("price");
      expect(r).toHaveProperty("amenities");
      expect(Array.isArray(r.amenities)).toBe(true);
    });
  });

  it("handles 50KB text input (tests internal truncation)", async () => {
    const largeText = "Beautiful apartment. ".repeat(2500); // ~50KB
    expect(largeText.length).toBeGreaterThan(50000);

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => makeMockListingResponse(0) },
    });

    const result = await extractListingFromText(largeText);
    expect(result).toHaveProperty("address");

    // Verify generateContent was called with truncated text
    const prompt = mockGenerateContent.mock.calls[0][0];
    // The extractor truncates to 50000 chars before passing to model
    expect(prompt.length).toBeLessThanOrEqual(55000); // prompt + instructions
  });

  it("handles 20 concurrent Gemini timeouts", async () => {
    mockGenerateContent.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini timeout")), 10)
        )
    );

    const { fulfilled, rejected } = await runConcurrent(20, (i) =>
      extractListingFromText(`Listing ${i}: timeout test`)
    );

    expect(rejected).toHaveLength(20);
    expect(fulfilled).toHaveLength(0);
    rejected.forEach((err) => {
      expect(String(err)).toContain("timeout");
    });
  });

  it("handles malformed JSON response from Gemini", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not valid json {{{" },
    });

    await expect(
      extractListingFromText("Test listing text")
    ).rejects.toThrow();
  });

  it("handles missing required fields in Gemini response", async () => {
    // Missing amenities (required by schema)
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            description: "Test",
            type: "RENTAL",
            // amenities is required but uses default([])
            // so this should actually parse fine
          }),
      },
    });

    // extractionResultSchema has amenities with default([]), so it should parse
    const result = await extractListingFromText("Test listing");
    expect(result.amenities).toEqual([]);
  });

  it("handles building extraction with 100 units", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => makeMockBuildingResponse(100) },
    });

    const result = await extractBuildingFromText(
      "Building at 200 Park Ave with 100 available units"
    );

    expect(result.units).toHaveLength(100);
    expect(result.address).toBe("200 Park Ave");
    expect(result.buildingAmenities).toContain("Doorman");
    result.units.forEach((unit) => {
      expect(unit).toHaveProperty("unit");
      expect(unit).toHaveProperty("amenities");
    });
  });

  it("handles 20 concurrent building extractions", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      response: { text: () => makeMockBuildingResponse(10) },
    }));

    const { fulfilled, rejected } = await runConcurrent(20, (i) =>
      extractBuildingFromText(`Building ${i} availability page content`)
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(20);
    fulfilled.forEach((r) => {
      expect(r.units).toHaveLength(10);
      expect(r).toHaveProperty("buildingAmenities");
    });
  });

  it("handles all-null optional fields in extraction response", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            description: null,
            type: null,
            address: null,
            unit: null,
            city: null,
            state: null,
            zipCode: null,
            neighborhood: null,
            borough: null,
            price: null,
            bedrooms: null,
            bathrooms: null,
            sqft: null,
            availableDate: null,
            op: null,
            freeMonths: null,
            leaseDuration: null,
            amenities: [],
            yearBuilt: null,
            numFloors: null,
            totalUnits: null,
          }),
      },
    });

    const result = await extractListingFromText("Minimal listing content");

    expect(result.description).toBeNull();
    expect(result.type).toBeNull();
    expect(result.price).toBeNull();
    expect(result.amenities).toEqual([]);
    expect(result.freeMonths).toBeNull();
  });

  it("maintains bounded memory for 50 large extractions", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      response: { text: () => makeMockListingResponse(0) },
    }));

    const memBefore = measureMemoryMB();

    for (let i = 0; i < 50; i++) {
      // Each call with a sizeable text input
      const text = `Listing ${i}: ${"detailed description ".repeat(500)}`;
      await extractListingFromText(text);
    }

    const memAfter = measureMemoryMB();
    const deltaMB = memAfter - memBefore;

    expect(deltaMB).toBeLessThan(100);
    expect(mockGenerateContent).toHaveBeenCalledTimes(50);
  });
});
