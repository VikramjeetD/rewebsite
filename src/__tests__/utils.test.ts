import { describe, it, expect } from "vitest";
import {
  cn,
  formatPrice,
  slugify,
  formatBedrooms,
  formatBathrooms,
  getStatusColor,
  getStatusLabel,
  absoluteUrl,
  generateTitle,
  calculateEffectiveRent,
  formatEffectiveRent,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});

describe("formatPrice", () => {
  it("formats price in cents to dollars", () => {
    expect(formatPrice(350000)).toBe("$3,500");
  });

  it("formats rental with /month", () => {
    expect(formatPrice(350000, "RENTAL")).toBe("$3,500/month");
  });

  it("formats sale without unit", () => {
    expect(formatPrice(120000000, "SALE")).toBe("$1,200,000");
  });

  it("handles large prices", () => {
    expect(formatPrice(120000000)).toBe("$1,200,000");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("$0");
  });

  it("defaults to SALE (no suffix)", () => {
    expect(formatPrice(100000)).toBe("$1,000");
  });
});

describe("generateTitle", () => {
  it("returns address only when no unit", () => {
    expect(generateTitle("123 Main St")).toBe("123 Main St");
  });

  it("includes unit with # prefix", () => {
    expect(generateTitle("123 Main St", "4A")).toBe("123 Main St #4A");
  });

  it("handles null unit", () => {
    expect(generateTitle("123 Main St", null)).toBe("123 Main St");
  });

  it("handles empty unit", () => {
    expect(generateTitle("123 Main St", "")).toBe("123 Main St");
  });

  it("returns fallback for empty address", () => {
    expect(generateTitle("")).toBe("Untitled Listing");
  });
});

describe("calculateEffectiveRent", () => {
  it("calculates effective rent with concession", () => {
    // $3,500/month, 12-month lease, 1 month free
    // Total = 3500 * 11 = 38500, effective = 38500 / 12 ≈ 3208.33 → 320833 cents
    expect(calculateEffectiveRent(350000, 12, 1)).toBe(320833);
  });

  it("returns null when no lease duration", () => {
    expect(calculateEffectiveRent(350000, null, 1)).toBeNull();
  });

  it("returns null when no free months", () => {
    expect(calculateEffectiveRent(350000, 12, null)).toBeNull();
  });

  it("returns null when lease duration is 0", () => {
    expect(calculateEffectiveRent(350000, 0, 1)).toBeNull();
  });

  it("returns null when paid months would be 0", () => {
    expect(calculateEffectiveRent(350000, 3, 3)).toBeNull();
  });

  it("handles 2 months free on 13-month lease", () => {
    // $4000/month, 13-month lease, 2 months free
    // Total = 4000 * 11 = 44000, effective = 44000 / 13 ≈ 3384.62 → 338462 cents
    expect(calculateEffectiveRent(400000, 13, 2)).toBe(338462);
  });
});

describe("formatEffectiveRent", () => {
  it("formats effective rent as rental price", () => {
    const result = formatEffectiveRent(350000, 12, 1);
    expect(result).toContain("/month");
    expect(result).toContain("$");
  });

  it("returns null when not applicable", () => {
    expect(formatEffectiveRent(350000, null, null)).toBeNull();
  });
});

describe("slugify", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("123 Main St. #4A")).toBe("123-main-st-4a");
  });

  it("handles multiple spaces", () => {
    expect(slugify("Upper   East   Side")).toBe("upper-east-side");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("-test-")).toBe("test");
  });

  it("truncates at 80 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("formatBedrooms", () => {
  it("returns Studio for 0", () => {
    expect(formatBedrooms(0)).toBe("Studio");
  });

  it("returns singular for 1", () => {
    expect(formatBedrooms(1)).toBe("1 Bed");
  });

  it("returns plural for > 1", () => {
    expect(formatBedrooms(3)).toBe("3 Beds");
  });
});

describe("formatBathrooms", () => {
  it("returns singular for 1", () => {
    expect(formatBathrooms(1)).toBe("1 Bath");
  });

  it("returns plural for > 1", () => {
    expect(formatBathrooms(2)).toBe("2 Baths");
  });
});

describe("getStatusColor", () => {
  it("returns green for ACTIVE", () => {
    expect(getStatusColor("ACTIVE")).toContain("green");
  });

  it("returns yellow for IN_CONTRACT", () => {
    expect(getStatusColor("IN_CONTRACT")).toContain("yellow");
  });

  it("returns blue for RENTED", () => {
    expect(getStatusColor("RENTED")).toContain("blue");
  });

  it("returns blue for SOLD", () => {
    expect(getStatusColor("SOLD")).toContain("blue");
  });

  it("returns gray for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toContain("bg-white/10");
  });
});

describe("getStatusLabel", () => {
  it("returns readable labels", () => {
    expect(getStatusLabel("ACTIVE")).toBe("Active");
    expect(getStatusLabel("IN_CONTRACT")).toBe("In Contract");
    expect(getStatusLabel("RENTED")).toBe("Rented");
    expect(getStatusLabel("SOLD")).toBe("Sold");
    expect(getStatusLabel("OFF_MARKET")).toBe("Off Market");
    expect(getStatusLabel("DRAFT")).toBe("Draft");
  });

  it("returns raw value for unknown status", () => {
    expect(getStatusLabel("SOMETHING")).toBe("SOMETHING");
  });
});

describe("absoluteUrl", () => {
  it("constructs full URL from path", () => {
    const result = absoluteUrl("/listings/test");
    expect(result).toContain("/listings/test");
  });
});
