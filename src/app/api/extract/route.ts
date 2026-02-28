import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAndCleanPage } from "@/lib/extraction/fetcher";
import { extractListingFromHtml } from "@/lib/extraction/extractor";

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only HTTP and HTTPS URLs are allowed" },
      { status: 400 }
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    isPrivateHost(parsed.hostname)
  ) {
    return NextResponse.json(
      { error: "Internal URLs are not allowed" },
      { status: 400 }
    );
  }

  try {
    const fetchResult = await fetchAndCleanPage(url);
    if (fetchResult.httpStatus !== 200) {
      return NextResponse.json(
        { error: `Page returned HTTP ${fetchResult.httpStatus}` },
        { status: 422 }
      );
    }

    const extracted = await extractListingFromHtml(
      fetchResult.cleanedHtml,
      url
    );

    return NextResponse.json({ data: extracted });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
