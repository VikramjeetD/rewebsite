import { describe, it, expect } from "vitest";
import {
  listingFormSchema,
  contactFormSchema,
  extractionResultSchema,
  buildingExtractionResultSchema,
} from "@/lib/validations";
import {
  makeListingFormData,
  makeContactFormData,
  measureMemoryMB,
} from "./helpers";

describe("validation stress tests", () => {
  it("validates 1000 valid listings with price→cents transform", () => {
    for (let i = 0; i < 1000; i++) {
      const data = makeListingFormData(i);
      const result = listingFormSchema.parse(data);

      // Price should be converted to cents
      expect(result.price).toBe(Math.round(Number(data.price) * 100));
      expect(typeof result.amenities).toBe("object");
      expect(Array.isArray(result.amenities)).toBe(true);
    }
  });

  it("rejects 1000 invalid listings with missing required fields", () => {
    for (let i = 0; i < 1000; i++) {
      const data = makeListingFormData(i);
      // Remove required fields in rotation
      const fieldToRemove = [
        "description",
        "address",
        "city",
        "borough",
        "zipCode",
        "availableDate",
      ][i % 6];
      const invalidData = { ...data, [fieldToRemove]: "" };

      expect(() => listingFormSchema.parse(invalidData)).toThrow();
    }
  });

  it("handles 500 contact forms with XSS payloads", () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      "javascript:alert(document.cookie)",
      '<svg onload="alert(1)">',
      "'; DROP TABLE users; --",
      '<iframe src="evil.com"></iframe>',
      '{{constructor.constructor("return this")()}}',
      "${7*7}",
      '<a href="data:text/html,<script>alert(1)</script>">click</a>',
      "\\u003cscript\\u003ealert(1)\\u003c/script\\u003e",
    ];

    for (let i = 0; i < 500; i++) {
      const payload = xssPayloads[i % xssPayloads.length];

      // Contact form should accept these as strings (validation doesn't sanitize)
      const result = contactFormSchema.parse({
        name: payload.slice(0, 100),
        email: `user${i}@example.com`,
        message: payload,
      });

      expect(result.name).toBeDefined();
      expect(result.message).toBeDefined();
    }
  });

  it("validates 100 building extractions with 50 units each", () => {
    for (let i = 0; i < 100; i++) {
      const units = Array.from({ length: 50 }, (_, u) => ({
        unit: `${u + 1}A`,
        price: 350000 + u * 1000,
        bedrooms: u % 4,
        bathrooms: (u % 3) + 1,
        sqft: 500 + u * 20,
        description: `Unit ${u + 1}A on floor ${Math.floor(u / 5) + 1}`,
        amenities: ["Washer/Dryer", "Dishwasher"],
      }));

      const result = buildingExtractionResultSchema.parse({
        address: `${100 + i} Park Ave`,
        city: "New York",
        state: "NY",
        neighborhood: "Murray Hill",
        borough: "Manhattan",
        type: "RENTAL",
        buildingAmenities: ["Doorman", "Gym", "Roof Deck"],
        units,
      });

      expect(result.units).toHaveLength(50);
      expect(result.address).toContain("Park Ave");
    }
  });

  it("processes 10,000 contact forms throughput benchmark", () => {
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      const data = makeContactFormData(i);
      contactFormSchema.parse(data);
    }

    const durationMs = performance.now() - start;
    // 10K pure CPU validations should finish well under 5s
    expect(durationMs).toBeLessThan(5000);
  });

  it("rejects 1000 boundary violations", () => {
    const violations = [
      // Negative price
      { ...makeListingFormData(0), price: "-100" },
      // Invalid state format
      { ...makeListingFormData(1), state: "new york" },
      // Bad zip code
      { ...makeListingFormData(2), zipCode: "1234" },
      // State too short
      { ...makeListingFormData(3), state: "N" },
      // Zip with letters
      { ...makeListingFormData(4), zipCode: "ABCDE" },
      // Price zero
      { ...makeListingFormData(5), price: "0" },
      // Description too long (>5000 chars)
      { ...makeListingFormData(6), description: "x".repeat(5001) },
      // Bedrooms too high
      { ...makeListingFormData(7), bedrooms: "21" },
      // Invalid type
      { ...makeListingFormData(8), type: "COMMERCIAL" },
      // Invalid status
      { ...makeListingFormData(9), status: "PENDING" },
    ];

    for (let i = 0; i < 1000; i++) {
      const violation = violations[i % violations.length];
      expect(() => listingFormSchema.parse(violation)).toThrow();
    }
  });

  it("maintains stable memory over 5000 validations", () => {
    const memBefore = measureMemoryMB();

    for (let i = 0; i < 5000; i++) {
      const data = makeListingFormData(i % 100);
      try {
        listingFormSchema.parse(data);
      } catch {
        // Some may fail due to zipCode generation — that's fine
      }
    }

    const memAfter = measureMemoryMB();
    const deltaMB = memAfter - memBefore;

    // 5000 pure CPU validations should not leak significant memory
    expect(deltaMB).toBeLessThan(100);
  });

  it("handles extraction results with all null fields at scale", () => {
    for (let i = 0; i < 500; i++) {
      const result = extractionResultSchema.parse({
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
      });

      expect(result.description).toBeNull();
      expect(result.price).toBeNull();
      expect(result.amenities).toEqual([]);
    }
  });
});
