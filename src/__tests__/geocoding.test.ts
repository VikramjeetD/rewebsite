import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { geocodeAddress } from "@/lib/geocoding";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
});

describe("geocodeAddress", () => {
  it("returns coordinates on successful geocode", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          status: "OK",
          results: [{ geometry: { location: { lat: 40.7128, lng: -74.006 } } }],
        }),
    });

    const result = await geocodeAddress("123 Main St", "SoHo", "Manhattan");

    expect(result).toEqual({ lat: 40.7128, lng: -74.006 });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain(
      "maps.googleapis.com/maps/api/geocode"
    );
  });

  it("returns null when no results found", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          status: "ZERO_RESULTS",
          results: [],
        }),
    });

    const result = await geocodeAddress("Nowhere St", "Unknown", "Manhattan");
    expect(result).toBeNull();
  });

  it("returns null when API key is not set", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const result = await geocodeAddress("123 Main St", "SoHo", "Manhattan");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await geocodeAddress("123 Main St", "SoHo", "Manhattan");
    expect(result).toBeNull();
  });

  it("constructs correct address string", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          status: "OK",
          results: [{ geometry: { location: { lat: 40.7, lng: -73.9 } } }],
        }),
    });

    await geocodeAddress("456 Broadway", "Tribeca", "Manhattan");

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain(
      encodeURIComponent("456 Broadway, Tribeca, Manhattan, New York, NY")
    );
  });
});
