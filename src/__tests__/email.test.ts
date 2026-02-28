import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeHtml } from "@/lib/email";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles all special characters together", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;"
    );
  });

  it("returns safe strings unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

const mockSend = vi.fn().mockResolvedValue({ id: "test-id" });

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { sendContactEmail } from "@/lib/email";

describe("sendContactEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@test.com";
    process.env.RESEND_API_KEY = "test-key";
  });

  it("escapes user input in email HTML", async () => {
    await sendContactEmail(
      '<script>alert("xss")</script>',
      "test@evil.com",
      null,
      "Hello <b>world</b>"
    );

    expect(mockSend).toHaveBeenCalledOnce();
    const html = mockSend.mock.calls[0][0].html;

    // Verify XSS payloads are escaped
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>world</b>");
    expect(html).toContain("&lt;b&gt;world&lt;/b&gt;");
  });

  it("does not send when ADMIN_EMAIL is unset", async () => {
    delete process.env.ADMIN_EMAIL;
    await sendContactEmail("Name", "email@test.com", null, "Message");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("includes phone when provided", async () => {
    await sendContactEmail("Name", "e@test.com", "555-1234", "Hello");

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain("555-1234");
  });

  it("includes listing title when provided", async () => {
    await sendContactEmail("Name", "e@test.com", null, "Hello", "Nice Apt");

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain("Nice Apt");
    expect(mockSend.mock.calls[0][0].subject).toContain("re: Nice Apt");
  });
});
