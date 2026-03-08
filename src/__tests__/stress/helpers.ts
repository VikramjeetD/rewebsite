/**
 * Shared utilities for stress tests.
 */

export interface ConcurrentResult<T> {
  results: PromiseSettledResult<T>[];
  fulfilled: T[];
  rejected: unknown[];
  durationMs: number;
}

/**
 * Fires `n` promises in parallel, collects results + timing + errors.
 */
export async function runConcurrent<T>(
  n: number,
  fn: (index: number) => Promise<T>
): Promise<ConcurrentResult<T>> {
  const start = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, (_, i) => fn(i))
  );
  const durationMs = performance.now() - start;

  const fulfilled: T[] = [];
  const rejected: unknown[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") fulfilled.push(r.value);
    else rejected.push(r.reason);
  }

  return { results, fulfilled, rejected, durationMs };
}

/**
 * Generates valid listing form data with index-based variation.
 */
export function makeListingFormData(i: number) {
  return {
    title: `Test Listing #${i}`,
    description: `Test listing description #${i} — a lovely apartment with great views.`,
    type: i % 2 === 0 ? "RENTAL" : "SALE",
    status: "ACTIVE" as const,
    price: String(1000 + i),
    freeMonths: i % 5 === 0 ? "1" : null,
    leaseDuration: i % 5 === 0 ? "12" : null,
    bedrooms: String(i % 5),
    bathrooms: String((i % 3) + 1),
    sqft: String(400 + i * 10),
    address: `${100 + i} E ${10 + (i % 90)}th St`,
    unit: i % 3 === 0 ? `${i}A` : null,
    city: "New York",
    state: "NY",
    neighborhood: ["SoHo", "Tribeca", "UES", "UWS", "Midtown"][i % 5],
    borough: "Manhattan",
    zipCode: `100${String(10 + (i % 90)).padStart(2, "0")}`.slice(0, 5),
    sourceUrl: i % 4 === 0 ? `https://example.com/listing/${i}` : null,
    op: null,
    noFee: i % 2 === 0,
    estimatedUtilities: null,
    petPolicy: null,
    petPolicyDetails: null,
    parking: null,
    adminNotes: null,
    featured: false,
    amenities: "Doorman, Gym, Laundry",
    availableDate: "2025-06-01",
  };
}

/**
 * Generates valid contact form data.
 */
export function makeContactFormData(i: number) {
  return {
    name: `User ${i}`,
    email: `user${i}@example.com`,
    phone: i % 2 === 0 ? `555-${String(i).padStart(4, "0")}` : undefined,
    message: `I am interested in listing #${i}. Please contact me.`,
  };
}

/**
 * Returns a mock Google Geocoding API JSON response.
 */
export function makeGeocodingResponse(
  i: number,
  status: string = "OK"
) {
  if (status !== "OK") {
    return { status, results: [] };
  }
  return {
    status: "OK",
    results: [
      {
        geometry: {
          location: {
            lat: 40.7 + (i % 100) * 0.001,
            lng: -74.0 + (i % 100) * 0.001,
          },
        },
      },
    ],
  };
}

/**
 * Heap delta tracker — returns MB used at snapshot time.
 */
export function measureMemoryMB(): number {
  if (typeof process.memoryUsage === "function") {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  return 0;
}
