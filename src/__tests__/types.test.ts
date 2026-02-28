import { describe, it, expect } from "vitest";
import type {
  Listing,
  ListingType,
  ListingStatus,
  StatusChangeSource,
  ListingPhoto,
  ExtractionResult,
  MonitoringResult,
} from "@/types";

describe("Type definitions", () => {
  it("ListingType allows RENTAL and SALE", () => {
    const rental: ListingType = "RENTAL";
    const sale: ListingType = "SALE";
    expect(rental).toBe("RENTAL");
    expect(sale).toBe("SALE");
  });

  it("ListingStatus allows all valid statuses", () => {
    const statuses: ListingStatus[] = [
      "ACTIVE",
      "IN_CONTRACT",
      "RENTED",
      "SOLD",
      "OFF_MARKET",
      "DRAFT",
    ];
    expect(statuses).toHaveLength(6);
  });

  it("StatusChangeSource allows all valid sources", () => {
    const sources: StatusChangeSource[] = ["MANUAL", "AUTO_DETECTED", "IMPORT"];
    expect(sources).toHaveLength(3);
  });

  it("Listing interface shape", () => {
    const listing: Listing = {
      id: "abc",
      slug: "test-listing",
      title: "Test",
      description: "Desc",
      type: "RENTAL",
      status: "ACTIVE",
      price: 350000,
      priceUnit: "month",
      bedrooms: 1,
      bathrooms: 1,
      sqft: 500,
      address: "123 Main St",
      unit: "4A",
      neighborhood: "UES",
      borough: "Manhattan",
      zipCode: "10021",
      latitude: 40.7,
      longitude: -73.9,
      sourceUrl: null,
      featured: true,
      amenities: ["Doorman"],
      photos: [],
      availableDate: null,
      listedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(listing.id).toBe("abc");
    expect(listing.type).toBe("RENTAL");
  });

  it("ListingPhoto interface", () => {
    const photo: ListingPhoto = {
      url: "https://example.com/photo.jpg",
      alt: "Living room",
      order: 0,
      isPrimary: true,
    };
    expect(photo.isPrimary).toBe(true);
  });

  it("ExtractionResult allows nullable fields", () => {
    const result: ExtractionResult = {
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
    };
    expect(result.title).toBeNull();
  });

  it("MonitoringResult interface", () => {
    const result: MonitoringResult = {
      listingId: "abc",
      url: "https://example.com",
      changed: true,
      previousHash: "hash1",
      newHash: "hash2",
      detectedStatus: "RENTED",
      confidence: 0.95,
      reasoning: "Page says rented",
      error: null,
    };
    expect(result.changed).toBe(true);
  });
});
