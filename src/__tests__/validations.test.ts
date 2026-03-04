import { describe, it, expect } from "vitest";
import {
  listingFormSchema,
  contactFormSchema,
  extractionResultSchema,
  urlSchema,
} from "@/lib/validations";

describe("listingFormSchema", () => {
  const validData = {
    description: "A lovely studio apartment",
    type: "RENTAL",
    status: "ACTIVE",
    price: "3500",
    freeMonths: null,
    leaseDuration: null,
    bedrooms: "0",
    bathrooms: "1",
    sqft: "500",
    address: "123 Main St",
    unit: "4A",
    city: "New York",
    state: "NY",
    neighborhood: "Upper East Side",
    borough: "Manhattan",
    zipCode: "10021",
    sourceUrl: "https://streeteasy.com/test",
    op: null,
    featured: false,
    amenities: "Doorman, Gym, Laundry",
    availableDate: "2024-03-01",
  };

  it("parses valid listing data", () => {
    const result = listingFormSchema.parse(validData);
    expect(result.price).toBe(350000); // converted to cents
    expect(result.amenities).toEqual(["Doorman", "Gym", "Laundry"]);
    expect(result.city).toBe("New York");
    expect(result.state).toBe("NY");
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
      unit: null,
      sourceUrl: null,
      freeMonths: null,
      leaseDuration: null,
    });
    expect(result.unit).toBeNull();
    expect(result.freeMonths).toBeNull();
    expect(result.leaseDuration).toBeNull();
  });

  it("rejects null for required fields", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, zipCode: null })
    ).toThrow();
    expect(() =>
      listingFormSchema.parse({ ...validData, availableDate: null })
    ).toThrow();
  });

  it("validates state format", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, state: "new york" })
    ).toThrow();
    expect(() =>
      listingFormSchema.parse({ ...validData, state: "N" })
    ).toThrow();
  });

  it("validates zip code format", () => {
    expect(() =>
      listingFormSchema.parse({ ...validData, zipCode: "1234" })
    ).toThrow();
    expect(() =>
      listingFormSchema.parse({ ...validData, zipCode: "abcde" })
    ).toThrow();
  });

  it("requires city and borough", () => {
    expect(() => listingFormSchema.parse({ ...validData, city: "" })).toThrow();
    expect(() =>
      listingFormSchema.parse({ ...validData, borough: "" })
    ).toThrow();
  });

  it("allows empty neighborhood", () => {
    const result = listingFormSchema.parse({
      ...validData,
      neighborhood: "",
    });
    expect(result.neighborhood).toBe("");
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

  it("coerces freeMonths and leaseDuration", () => {
    const result = listingFormSchema.parse({
      ...validData,
      freeMonths: "1",
      leaseDuration: "12",
    });
    expect(result.freeMonths).toBe(1);
    expect(result.leaseDuration).toBe(12);
  });
});

describe("contactFormSchema", () => {
  it("parses valid contact data", () => {
    const result = contactFormSchema.parse({
      name: "John Doe",
      email: "john@example.com",
      phone: "830-658-3246",
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
      description: "A beautiful apartment",
      type: "RENTAL",
      address: "100 Park Ave",
      unit: "5B",
      city: "New York",
      state: "NY",
      zipCode: "10016",
      neighborhood: "Murray Hill",
      borough: "Manhattan",
      price: 450000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 900,
      availableDate: "2025-04-01",
      op: 15,
      freeMonths: 1,
      leaseDuration: 12,
      amenities: ["Doorman", "Gym"],
    });
    expect(result.amenities).toHaveLength(2);
    expect(result.freeMonths).toBe(1);
    expect(result.leaseDuration).toBe(12);
    expect(result.city).toBe("New York");
    expect(result.state).toBe("NY");
    expect(result.zipCode).toBe("10016");
    expect(result.op).toBe(15);
    expect(result.availableDate).toBe("2025-04-01");
  });

  it("allows all null fields", () => {
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
    expect(result.freeMonths).toBeNull();
    expect(result.city).toBeNull();
    expect(result.op).toBeNull();
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
