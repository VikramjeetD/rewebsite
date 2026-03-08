import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { runConcurrent } from "./helpers";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock unstable_cache to be a passthrough
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Mock places module
vi.mock("@/lib/places", () => ({
  fetchNearbyPlaces: vi.fn().mockResolvedValue([
    { name: "Test Place", lat: 40.7, lng: -74.0, distance: 0.1 },
  ]),
  PLACE_CATEGORIES: {
    groceries: { label: "Groceries", icon: "ShoppingCart", color: "#22c55e", includedTypes: ["grocery_store"] },
    restaurants: { label: "Restaurants", icon: "Utensils", color: "#ef4444", includedTypes: ["restaurant"] },
    cafes: { label: "Cafes", icon: "Coffee", color: "#f59e0b", includedTypes: ["cafe"] },
  },
}));

// Mock transit module
vi.mock("@/lib/transit", () => ({
  getNearbyBusStops: vi.fn().mockResolvedValue([
    { stopId: "1", name: "Test Stop", lat: 40.7, lng: -74.0 },
  ]),
}));

import { GET as nearbyPlacesGET } from "@/app/api/nearby-places/route";
import { GET as nearbyBusesGET } from "@/app/api/nearby-buses/route";
import { GET as plutoGET } from "@/app/api/pluto/route";
import { POST as directionsPost } from "@/app/api/directions/route";

function makeRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
  process.env.PLUTO_APP_TOKEN = "test-pluto-token";
});

describe("api-routes stress tests", () => {
  it("handles 50 concurrent nearby-places requests", async () => {
    const { fulfilled, rejected } = await runConcurrent(50, async () => {
      const req = makeRequest(
        `http://localhost/api/nearby-places?lat=40.7128&lng=-74.006&category=groceries`
      );
      const res = await nearbyPlacesGET(req);
      return res.json();
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((data) => {
      expect(data).toHaveProperty("category", "groceries");
      expect(data).toHaveProperty("places");
    });
  });

  it("handles 50 concurrent nearby-buses requests", async () => {
    const { fulfilled, rejected } = await runConcurrent(50, async () => {
      const req = makeRequest(
        `http://localhost/api/nearby-buses?lat=40.7128&lng=-74.006`
      );
      const res = await nearbyBusesGET(req);
      return res.json();
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((data) => {
      expect(data).toHaveProperty("stops");
    });
  });

  it("handles 50 concurrent pluto requests", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: () =>
        Promise.resolve([
          { numfloors: "5", bldgfront: "25", bldgdepth: "80" },
        ]),
    }));

    const { fulfilled, rejected } = await runConcurrent(50, async (i) => {
      const req = makeRequest(
        `http://localhost/api/pluto?address=${encodeURIComponent(`${100 + i} E 10th St`)}`
      );
      const res = await plutoGET(req);
      return res.json();
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((data) => {
      expect(data).toHaveProperty("numFloors", 5);
    });
  });

  it("handles 50 concurrent directions requests", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: () =>
        Promise.resolve({
          routes: [{ distanceMeters: 1500, duration: "600s" }],
        }),
    }));

    const { fulfilled, rejected } = await runConcurrent(50, async () => {
      const req = makeRequest(
        "http://localhost/api/directions",
        "POST",
        {
          origin: { location: { latLng: { latitude: 40.7, longitude: -74.0 } } },
          destination: { location: { latLng: { latitude: 40.72, longitude: -73.99 } } },
          travelMode: "TRANSIT",
        }
      );
      const res = await directionsPost(req);
      return res.json();
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((data) => {
      expect(data).toHaveProperty("routes");
    });
  });

  it("rejects 100 bad-input requests with proper validation", async () => {
    const badRequests = [
      // Missing params
      "http://localhost/api/nearby-places?lat=40.7",
      "http://localhost/api/nearby-places?lng=-74.0",
      "http://localhost/api/nearby-places?lat=40.7&lng=-74.0",
      // Invalid coordinates
      "http://localhost/api/nearby-places?lat=999&lng=-74.0&category=groceries",
      "http://localhost/api/nearby-places?lat=40.7&lng=999&category=groceries",
      // Invalid category
      "http://localhost/api/nearby-places?lat=40.7&lng=-74.0&category=invalid",
      // Nearby buses - missing params
      "http://localhost/api/nearby-buses",
      "http://localhost/api/nearby-buses?lat=abc&lng=-74.0",
      // Bad radius
      "http://localhost/api/nearby-buses?lat=40.7&lng=-74.0&radius=100",
      // Pluto - missing address
      "http://localhost/api/pluto",
    ];

    const { fulfilled, rejected } = await runConcurrent(100, async (i) => {
      const url = badRequests[i % badRequests.length];
      let res;
      if (url.includes("pluto")) {
        res = await plutoGET(makeRequest(url));
      } else if (url.includes("nearby-buses")) {
        res = await nearbyBusesGET(makeRequest(url));
      } else {
        res = await nearbyPlacesGET(makeRequest(url));
      }
      return { status: res.status, body: await res.json() };
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(100);
    fulfilled.forEach((r) => {
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.body).toHaveProperty("error");
    });
  });

  it("handles 50 concurrent upstream 502 failures gracefully", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: "Bad Gateway" }),
    }));

    const { fulfilled, rejected } = await runConcurrent(50, async () => {
      const req = makeRequest(
        `http://localhost/api/pluto?address=${encodeURIComponent("123 Broadway")}`
      );
      const res = await plutoGET(req);
      return { status: res.status, body: await res.json() };
    });

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(50);
    fulfilled.forEach((r) => {
      expect(r.status).toBe(502);
      expect(r.body).toHaveProperty("error");
    });
  });

  it("handles mixed concurrent load: 30 places + 30 buses + 30 pluto", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: () =>
        Promise.resolve([
          { numfloors: "10", bldgfront: "30", bldgdepth: "90" },
        ]),
    }));

    const promises: Promise<{ type: string; status: number }>[] = [];

    for (let i = 0; i < 30; i++) {
      promises.push(
        (async () => {
          const res = await nearbyPlacesGET(
            makeRequest(
              "http://localhost/api/nearby-places?lat=40.7128&lng=-74.006&category=groceries"
            )
          );
          return { type: "places", status: res.status };
        })()
      );
    }
    for (let i = 0; i < 30; i++) {
      promises.push(
        (async () => {
          const res = await nearbyBusesGET(
            makeRequest("http://localhost/api/nearby-buses?lat=40.7128&lng=-74.006")
          );
          return { type: "buses", status: res.status };
        })()
      );
    }
    for (let i = 0; i < 30; i++) {
      promises.push(
        (async () => {
          const res = await plutoGET(
            makeRequest(
              `http://localhost/api/pluto?address=${encodeURIComponent("100 Broadway")}`
            )
          );
          return { type: "pluto", status: res.status };
        })()
      );
    }

    const results = await Promise.allSettled(promises);
    const fulfilled = results.filter(
      (r) => r.status === "fulfilled"
    ) as PromiseFulfilledResult<{ type: string; status: number }>[];

    expect(fulfilled).toHaveLength(90);
    fulfilled.forEach((r) => {
      expect(r.value.status).toBe(200);
    });
  });

  it("handles 200 sequential pluto lookups throughput", async () => {
    mockFetch.mockImplementation(async () => ({
      ok: true,
      json: () =>
        Promise.resolve([
          { numfloors: "3", bldgfront: "20", bldgdepth: "60" },
        ]),
    }));

    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      const req = makeRequest(
        `http://localhost/api/pluto?address=${encodeURIComponent(`${i} Test Ave`)}`
      );
      const res = await plutoGET(req);
      expect(res.status).toBe(200);
    }
    const durationMs = performance.now() - start;

    expect(mockFetch).toHaveBeenCalledTimes(200);
    expect(durationMs).toBeLessThan(10000);
  });

  it("handles pluto with missing PLUTO_APP_TOKEN", async () => {
    delete process.env.PLUTO_APP_TOKEN;

    const { fulfilled, rejected } = await runConcurrent(20, async () => {
      const req = makeRequest(
        `http://localhost/api/pluto?address=${encodeURIComponent("100 Broadway")}`
      );
      const res = await plutoGET(req);
      return { status: res.status, body: await res.json() };
    });

    expect(rejected).toHaveLength(0);
    fulfilled.forEach((r) => {
      expect(r.status).toBe(500);
      expect(r.body.error).toBe("not configured");
    });
  });

  it("handles directions with missing API key", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const { fulfilled, rejected } = await runConcurrent(20, async () => {
      const req = makeRequest("http://localhost/api/directions", "POST", {
        origin: { location: { latLng: { latitude: 40.7, longitude: -74.0 } } },
        destination: { location: { latLng: { latitude: 40.72, longitude: -73.99 } } },
      });
      const res = await directionsPost(req);
      return { status: res.status, body: await res.json() };
    });

    expect(rejected).toHaveLength(0);
    fulfilled.forEach((r) => {
      expect(r.status).toBe(500);
    });
  });
});
