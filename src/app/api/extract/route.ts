import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchAndCleanPage } from "@/lib/extraction/fetcher";
import { extractListingFromHtml } from "@/lib/extraction/extractor";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
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
