import { describe, it, expect } from "vitest";
import {
  listingFormSchema,
  contactFormSchema,
  extractionResultSchema,
  statusDetectionSchema,
  urlSchema,
} from "@/lib/validations";

describe("listingFormSchema", () => {
  const validData = {
    title: "Beautiful Studio",
    description: "A lovely studio apartment",
    type: "RENTAL",
    status: "ACTIVE",
    price: "3500",
    priceUnit: "month",
    bedrooms: "0",
    bathrooms: "1",
    sqft: "500",
    address: "123 Main St",
    unit: "4A",
    neighborhood: "Upper East Side",
    borough: "Manhattan",
    zipCode: "10021",
    sourceUrl: "https://streeteasy.com/test",
    featured: false,
    amenities: "Doorman, Gym, Laundry",
    availableDate: "2024-03-01",
  };

  it("parses valid listing data", () => {
    const result = listingFormSchema.parse(validData);
    expect(result.title).toBe("Beautiful Studio");
    expect(result.price).toBe(350000); // converted to cents
    expect(result.amenities).toEqual(["Doorman", "Gym", "Laundry"]);
  });

  it("rejects empty title", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, title: "" })
    ).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, type: "INVALID" })
    ).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, status: "PENDING" })
    ).toThrow();
  });

  it("handles null optional fields", () => {
    const result = listingFormSchema.parse({
      ...validData,
      sqft: null,
      unit: null,
      zipCode: null,
      sourceUrl: null,
      priceUnit: null,
      availableDate: null,
    });
    expect(result.sqft).toBeNull();
    expect(result.unit).toBeNull();
  });

  it("handles empty string sourceUrl", () => {
    const result = listingFormSchema.parse({
      ...validData,
      sourceUrl: "",
    });
    expect(result.sourceUrl).toBe("");
  });

  it("splits amenities by comma", () => {
    const result = listingFormSchema.parse({
      ...validData,
      amenities: "Pool,  Gym ,Doorman",
    });
    expect(result.amenities).toEqual(["Pool", "Gym", "Doorman"]);
  });

  it("handles empty amenities", () => {
    const result = listingFormSchema.parse({
      ...validData,
      amenities: "",
    });
    expect(result.amenities).toEqual([]);
  });
});

describe("contactFormSchema", () => {
  it("parses valid contact data", () => {
    const result = contactFormSchema.parse({
      name: "John Doe",
      email: "john@example.com",
      phone: "212-555-0100",
      message: "I'm interested in this listing.",
    });
    expect(result.name).toBe("John Doe");
  });

  it("rejects invalid email", () => {
    expect(() =>
      contactFormSchema.parse({
        name: "John",
        email: "notanemail",
        message: "Hello",
      })
    ).toThrow();
  });

  it("requires name and message", () => {
    expect(() =>
      contactFormSchema.parse({
        name: "",
        email: "john@example.com",
        message: "",
      })
    ).toThrow();
  });

  it("allows optional phone", () => {
    const result = contactFormSchema.parse({
      name: "John",
      email: "john@example.com",
      message: "Hello",
    });
    expect(result.phone).toBeUndefined();
  });
});

describe("extractionResultSchema", () => {
  it("parses valid extraction result", () => {
    const result = extractionResultSchema.parse({
      title: "Luxury 2BR",
      description: "A beautiful apartment",
      price: 450000,
      priceUnit: "month",
      bedrooms: 2,
      bathrooms: 1,
      sqft: 900,
      address: "100 Park Ave",
      unit: "5B",
      neighborhood: "Murray Hill",
      borough: "Manhattan",
      type: "RENTAL",
      status: "ACTIVE",
      amenities: ["Doorman", "Gym"],
      photoUrls: ["https://example.com/photo.jpg"],
    });
    expect(result.title).toBe("Luxury 2BR");
    expect(result.amenities).toHaveLength(2);
  });

  it("allows all null fields", () => {
    const result = extractionResultSchema.parse({
      title: null,
      description: null,
      price: null,
      priceUnit: null,
      bedrooms: null,
      bathrooms: null,
      sqft: null,
      address: null,
      unit: null,
      neighborhood: null,
      borough: null,
      type: null,
      status: null,
      amenities: [],
      photoUrls: [],
    });
    expect(result.title).toBeNull();
  });
});

describe("statusDetectionSchema", () => {
  it("parses valid status detection", () => {
    const result = statusDetectionSchema.parse({
      status: "RENTED",
      confidence: 0.95,
      reasoning: "Page shows 'This unit has been rented'",
    });
    expect(result.status).toBe("RENTED");
    expect(result.confidence).toBe(0.95);
  });

  it("rejects confidence > 1", () => {
    expect(() =>
      statusDetectionSchema.parse({
        status: "ACTIVE",
        confidence: 1.5,
        reasoning: "test",
      })
    ).toThrow();
  });

  it("rejects confidence < 0", () => {
    expect(() =>
      statusDetectionSchema.parse({
        status: "ACTIVE",
        confidence: -0.1,
        reasoning: "test",
      })
    ).toThrow();
  });

  it("rejects DRAFT status", () => {
    expect(() =>
      statusDetectionSchema.parse({
        status: "DRAFT",
        confidence: 0.9,
        reasoning: "test",
      })
    ).toThrow();
  });
});

describe("urlSchema", () => {
  it("accepts valid URL", () => {
    expect(urlSchema.parse("https://streeteasy.com/listing/123")).toBe(
      "https://streeteasy.com/listing/123"
    );
  });

  it("rejects invalid URL", () => {
    expect(() => urlSchema.parse("not-a-url")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => urlSchema.parse("")).toThrow();
  });
});
