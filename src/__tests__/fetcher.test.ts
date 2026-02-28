import { describe, it, expect } from "vitest";
import { hashContent, sha256Hash } from "@/lib/extraction/fetcher";

describe("hashContent", () => {
  it("returns a string hash", () => {
    const hash = hashContent("test content");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("returns same hash for same content", () => {
    const hash1 = hashContent("identical");
    const hash2 = hashContent("identical");
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different content", () => {
    const hash1 = hashContent("content A");
    const hash2 = hashContent("content B");
    expect(hash1).not.toBe(hash2);
  });
});

describe("sha256Hash", () => {
  it("returns a hex string", async () => {
    const hash = await sha256Hash("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns consistent results", async () => {
    const hash1 = await sha256Hash("hello world");
    const hash2 = await sha256Hash("hello world");
    expect(hash1).toBe(hash2);
  });

  it("returns different hashes for different content", async () => {
    const hash1 = await sha256Hash("foo");
    const hash2 = await sha256Hash("bar");
    expect(hash1).not.toBe(hash2);
  });

  it("produces known SHA-256 for empty string", async () => {
    const hash = await sha256Hash("");
    // Known SHA-256 of empty string
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});
