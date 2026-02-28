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

  it("formats with unit", () => {
    expect(formatPrice(350000, "month")).toBe("$3,500/month");
  });

  it("handles large prices", () => {
    expect(formatPrice(120000000)).toBe("$1,200,000");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("$0");
  });

  it("handles null unit", () => {
    expect(formatPrice(100000, null)).toBe("$1,000");
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
    expect(getStatusColor("UNKNOWN")).toContain("gray");
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
