import * as cheerio from "cheerio";
import type { FetchResult } from "./types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

export async function fetchAndCleanPage(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  const html = await response.text();
  const cleanedHtml = cleanHtml(html);

  return {
    html,
    cleanedHtml,
    url,
    httpStatus: response.status,
  };
}

function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, footer, header, iframe, noscript, svg, form, [role='navigation'], [role='banner'], .cookie-banner, .popup, .modal"
  ).remove();

  // Remove hidden elements
  $("[style*='display:none'], [style*='display: none'], [hidden]").remove();

  // Get the main content area if it exists
  const mainContent =
    $("main").html() ||
    $("[role='main']").html() ||
    $("article").html() ||
    $(".listing-detail").html() ||
    $(".property-detail").html() ||
    $("body").html() ||
    "";

  // Clean up whitespace
  const text = cheerio
    .load(mainContent)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  // Also keep some structured HTML for better AI understanding
  const structuredHtml = mainContent
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30000); // Cap at ~30K chars to stay within token limits

  return structuredHtml || text.slice(0, 30000);
}

export function hashContent(content: string): string {
  // Simple hash using Web Crypto-compatible approach
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function sha256Hash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
