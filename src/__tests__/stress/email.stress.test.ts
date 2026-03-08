import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeHtml } from "@/lib/email";
import { runConcurrent } from "./helpers";

// Mock Resend
const mockSend = vi.fn().mockResolvedValue({ id: "test-id" });

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendContactEmail } from "@/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_EMAIL = "admin@test.com";
  process.env.RESEND_API_KEY = "test-key";
});

describe("email stress tests", () => {
  it("handles 100 concurrent email submissions", async () => {
    const { fulfilled, rejected } = await runConcurrent(100, (i) =>
      sendContactEmail(
        `User ${i}`,
        `user${i}@example.com`,
        i % 2 === 0 ? `555-${String(i).padStart(4, "0")}` : null,
        `I am interested in listing #${i}`
      )
    );

    expect(rejected).toHaveLength(0);
    expect(fulfilled).toHaveLength(100);
    expect(mockSend).toHaveBeenCalledTimes(100);
  });

  it("handles 200 sequential rapid-fire emails", async () => {
    const start = performance.now();

    for (let i = 0; i < 200; i++) {
      await sendContactEmail(
        `User ${i}`,
        `user${i}@example.com`,
        null,
        `Message #${i}`
      );
    }

    const durationMs = performance.now() - start;
    expect(mockSend).toHaveBeenCalledTimes(200);
    expect(durationMs).toBeLessThan(5000);
  });

  it("processes 1000 XSS payloads through escapeHtml", () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      "<svg/onload=alert(1)>",
      "javascript:alert(document.cookie)",
      '<iframe src="data:text/html,<script>alert(1)</script>">',
      "';alert(String.fromCharCode(88,83,83))//",
      '<img """><script>alert("XSS")</script>">',
      '<body onload=alert("XSS")>',
      '<input onfocus="alert(1)" autofocus>',
      "<marquee onstart=alert(1)>",
    ];

    for (let i = 0; i < 1000; i++) {
      const payload = xssPayloads[i % xssPayloads.length];
      const escaped = escapeHtml(payload);

      // escapeHtml only escapes HTML entities (& < > " ')
      // It does NOT strip attribute names like onerror= — that's fine,
      // because the angle brackets are escaped so the browser won't parse them as tags
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("<iframe");
      expect(escaped).not.toContain("<svg");
      expect(escaped).not.toContain("<body");
      expect(escaped).not.toContain("<input");
      expect(escaped).not.toContain("<marquee");

      // All angle brackets should be escaped
      expect(escaped).not.toMatch(/<[a-zA-Z]/);
    }
  });

  it("handles 10KB string through escapeHtml", () => {
    const largeString = '<script>alert("x")</script>'.repeat(400); // ~10.8KB
    expect(largeString.length).toBeGreaterThan(10000);

    const escaped = escapeHtml(largeString);
    expect(escaped).not.toContain("<script>");
    expect(escaped.length).toBeGreaterThan(largeString.length); // escaped is longer
  });

  it("processes 10,000 escapeHtml calls throughput benchmark", () => {
    const input = '<script>alert("xss")</script> & "quotes" & \'apostrophes\'';

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      escapeHtml(input);
    }
    const durationMs = performance.now() - start;

    // Pure string replacement should be very fast
    expect(durationMs).toBeLessThan(1000);
  });

  it("handles extremely long fields (10K name, 50K message)", async () => {
    const longName = "A".repeat(10000);
    const longMessage = "B".repeat(50000);

    await sendContactEmail(longName, "test@example.com", null, longMessage);

    expect(mockSend).toHaveBeenCalledOnce();
    const html = mockSend.mock.calls[0][0].html;
    expect(html).not.toContain("<script>");
    // Verify the escaped content is present (A and B don't need escaping)
    expect(html).toContain("A".repeat(100));
    expect(html).toContain("B".repeat(100));
  });

  it("handles partial Resend failures (every 5th call rejects)", async () => {
    let callCount = 0;
    mockSend.mockImplementation(async () => {
      callCount++;
      if (callCount % 5 === 0) {
        throw new Error("Rate limited");
      }
      return { id: `msg-${callCount}` };
    });

    const { fulfilled, rejected } = await runConcurrent(50, (i) =>
      sendContactEmail(
        `User ${i}`,
        `user${i}@example.com`,
        null,
        `Message ${i}`
      )
    );

    // sendContactEmail doesn't catch Resend errors, so some will reject
    expect(rejected.length).toBeGreaterThan(0);
    expect(fulfilled.length + rejected.length).toBe(50);
  });

  it("verifies all HTML is properly escaped in email body", async () => {
    const dangerousInputs = {
      name: '<script>alert("name")</script>',
      email: "test@example.com",
      phone: '"><img src=x onerror=alert(1)>',
      message: '<iframe src="evil.com"></iframe>',
      listingTitle: 'Nice <b>Apt</b> & "Cozy"',
    };

    await sendContactEmail(
      dangerousInputs.name,
      dangerousInputs.email,
      dangerousInputs.phone,
      dangerousInputs.message,
      dangerousInputs.listingTitle
    );

    const html = mockSend.mock.calls[0][0].html;

    // Raw dangerous HTML tags should not appear (angle brackets are escaped)
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<b>Apt</b>");

    // Escaped versions should be present
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;iframe");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;Cozy&quot;");
  });
});
