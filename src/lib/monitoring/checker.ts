import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAndCleanPage, sha256Hash } from "@/lib/extraction/fetcher";
import { statusDetectionSchema } from "@/lib/validations";
import { getLatestSnapshot } from "@/lib/firestore";
import type { ListingStatus } from "@/types";
import type { CheckResult } from "./types";

const STATUS_DETECTION_PROMPT = `You are analyzing a real estate listing page to determine its current status.

The previous known status was: {previousStatus}
The page content has changed since the last check.

Based on the page content below, determine the current listing status.
Return JSON: { "status": "ACTIVE" | "IN_CONTRACT" | "RENTED" | "SOLD" | "OFF_MARKET", "confidence": 0.0-1.0, "reasoning": "brief explanation" }

Look for signals like:
- "No longer available", "This listing has been removed" → OFF_MARKET
- "In contract", "Contract signed", "Pending" → IN_CONTRACT
- "Rented", "Leased" → RENTED
- "Sold", "Closed" → SOLD
- Active listing with price and details → ACTIVE
- 404 or error pages → OFF_MARKET

Return ONLY valid JSON.

Page content:
`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenerativeAI(apiKey);
}

export async function checkListingPage(
  listingId: string,
  url: string,
  currentStatus: ListingStatus
): Promise<CheckResult> {
  try {
    const fetchResult = await fetchAndCleanPage(url);
    const newHash = await sha256Hash(fetchResult.cleanedHtml);

    // Get the last snapshot
    const lastSnapshot = await getLatestSnapshot(listingId);
    const previousHash = lastSnapshot?.contentHash ?? null;

    // If hash is the same, no change
    if (previousHash && previousHash === newHash) {
      return {
        listingId,
        url,
        changed: false,
        newHash,
        previousHash,
        detectedStatus: null,
        confidence: null,
        reasoning: null,
        error: null,
        httpStatus: fetchResult.httpStatus,
      };
    }

    // Content changed — ask AI to interpret
    if (fetchResult.httpStatus === 404 || fetchResult.httpStatus >= 500) {
      return {
        listingId,
        url,
        changed: true,
        newHash,
        previousHash,
        detectedStatus: "OFF_MARKET",
        confidence: 0.9,
        reasoning: `Page returned HTTP ${fetchResult.httpStatus}`,
        error: null,
        httpStatus: fetchResult.httpStatus,
      };
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
    });

    const prompt =
      STATUS_DETECTION_PROMPT.replace("{previousStatus}", currentStatus) +
      fetchResult.cleanedHtml.slice(0, 20000);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
      text.match(/```\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonStr = jsonMatch[1] || text;

    const parsed = statusDetectionSchema.parse(JSON.parse(jsonStr.trim()));

    return {
      listingId,
      url,
      changed: true,
      newHash,
      previousHash,
      detectedStatus: parsed.status,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      error: null,
      httpStatus: fetchResult.httpStatus,
    };
  } catch (e) {
    return {
      listingId,
      url,
      changed: false,
      newHash: "",
      previousHash: null,
      detectedStatus: null,
      confidence: null,
      reasoning: null,
      error: e instanceof Error ? e.message : "Check failed",
      httpStatus: 0,
    };
  }
}
