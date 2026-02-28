import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractionResultSchema } from "@/lib/validations";
import type { ExtractionResult } from "@/types";

const EXTRACTION_PROMPT = `You are a real estate listing data extractor. Extract structured listing data from the following HTML content of a real estate listing page.

Return a JSON object with these fields:
- title: string or null (the listing title)
- description: string or null (listing description)
- price: number or null (price in cents, e.g., $3,500/month = 350000, $1,200,000 = 120000000)
- priceUnit: "month" or null (set to "month" for rentals)
- bedrooms: number or null (0 for studio)
- bathrooms: number or null
- sqft: number or null (square footage)
- address: string or null (full street address)
- unit: string or null (apartment/unit number)
- neighborhood: string or null (NYC neighborhood name)
- borough: string or null (Manhattan, Brooklyn, Queens, Bronx, or Staten Island)
- type: "RENTAL" or "SALE" or null
- status: "ACTIVE" or "IN_CONTRACT" or "RENTED" or "SOLD" or "OFF_MARKET" or null
- amenities: string[] (list of amenities found)
- photoUrls: string[] (list of photo/image URLs found)

Important:
- Convert all prices to cents (multiply dollar amounts by 100)
- For NYC listings, infer borough from neighborhood if not explicit
- Return null for any fields you cannot determine
- Return ONLY valid JSON, no markdown or explanation

HTML Content:
`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenerativeAI(apiKey);
}

export async function extractListingFromHtml(
  cleanedHtml: string,
  url: string
): Promise<ExtractionResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-05-20",
  });

  const prompt = `${EXTRACTION_PROMPT}${cleanedHtml}\n\nSource URL: ${url}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
    text.match(/```\n?([\s\S]*?)\n?```/) || [null, text];
  const jsonStr = jsonMatch[1] || text;

  const parsed = JSON.parse(jsonStr.trim());
  const validated = extractionResultSchema.parse(parsed);

  return validated;
}
