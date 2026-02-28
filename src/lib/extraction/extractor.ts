import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { extractionResultSchema } from "@/lib/validations";
import type { ExtractionResult } from "@/types";

const EXTRACTION_INSTRUCTIONS = `You are a real estate listing data extractor. Extract structured listing data from the provided content.

Important:
- Convert all prices to cents (multiply dollar amounts by 100, e.g., $3,500/month = 350000, $1,200,000 = 120000000)
- For NYC listings, infer borough from neighborhood if not explicit
- Set priceUnit to "month" for rentals
- Set bedrooms to 0 for studios
- Extract all amenities and photo URLs you can find
- Look carefully for square footage (sqft, sq ft, SF, square feet)
- Look for the full street address including building number
- Look for unit/apartment numbers in the title or address
- Count bedrooms carefully — "1 bed" or "1 BR" = 1, "studio" = 0
`;

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "The listing title",
      nullable: true,
    },
    description: {
      type: SchemaType.STRING,
      description: "The listing description",
      nullable: true,
    },
    price: {
      type: SchemaType.NUMBER,
      description: "Price in cents (e.g., $3,500/month = 350000)",
      nullable: true,
    },
    priceUnit: {
      type: SchemaType.STRING,
      description: 'Price unit — "month" for rentals, null for sales',
      nullable: true,
    },
    bedrooms: {
      type: SchemaType.NUMBER,
      description: "Number of bedrooms (0 for studio)",
      nullable: true,
    },
    bathrooms: {
      type: SchemaType.NUMBER,
      description: "Number of bathrooms",
      nullable: true,
    },
    sqft: {
      type: SchemaType.NUMBER,
      description: "Square footage",
      nullable: true,
    },
    address: {
      type: SchemaType.STRING,
      description: "Full street address",
      nullable: true,
    },
    unit: {
      type: SchemaType.STRING,
      description: "Apartment or unit number",
      nullable: true,
    },
    neighborhood: {
      type: SchemaType.STRING,
      description: "NYC neighborhood name",
      nullable: true,
    },
    borough: {
      type: SchemaType.STRING,
      description:
        "NYC borough: Manhattan, Brooklyn, Queens, Bronx, or Staten Island",
      nullable: true,
    },
    type: {
      type: SchemaType.STRING,
      description: "Listing type: RENTAL or SALE",
      enum: ["RENTAL", "SALE"],
      nullable: true,
    },
    status: {
      type: SchemaType.STRING,
      description: "Listing status",
      enum: ["ACTIVE", "IN_CONTRACT", "RENTED", "SOLD", "OFF_MARKET"],
      nullable: true,
    },
    amenities: {
      type: SchemaType.ARRAY,
      description: "List of amenities",
      items: { type: SchemaType.STRING },
    },
    photoUrls: {
      type: SchemaType.ARRAY,
      description: "List of photo/image URLs found on the page",
      items: { type: SchemaType.STRING },
    },
  },
  required: ["amenities", "photoUrls"],
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenerativeAI(apiKey);
}

function getModel() {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });
}

export async function extractListingFromHtml(
  cleanedHtml: string,
  url: string
): Promise<ExtractionResult> {
  const model = getModel();
  const prompt = `${EXTRACTION_INSTRUCTIONS}\n\nHTML Content:\n${cleanedHtml}\n\nSource URL: ${url}`;

  console.log("[extract] Mode: HTML fetch");
  console.log("[extract] URL:", url);
  console.log("[extract] Content length:", cleanedHtml.length, "chars");
  console.log("[extract] Content preview:", cleanedHtml.slice(0, 500));
  console.log("[extract] ---");

  const result = await model.generateContent(prompt);
  const rawResponse = result.response.text();
  console.log("[extract] Gemini raw response:", rawResponse);

  const parsed = JSON.parse(rawResponse);
  const validated = extractionResultSchema.parse(parsed);
  console.log("[extract] Validated result:", JSON.stringify(validated, null, 2));

  return validated;
}

export async function extractListingFromText(
  text: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  const model = getModel();
  const truncated = text.slice(0, 50000);
  const urlLine = sourceUrl ? `\n\nSource URL: ${sourceUrl}` : "";
  const prompt = `${EXTRACTION_INSTRUCTIONS}\n\nListing page content (copied from browser):\n${truncated}${urlLine}`;

  console.log("[extract] Mode: pasted content");
  console.log("[extract] Source URL:", sourceUrl ?? "(none)");
  console.log("[extract] Content length:", truncated.length, "chars");
  console.log("[extract] Content preview:", truncated.slice(0, 500));
  console.log("[extract] ---");

  const result = await model.generateContent(prompt);
  const rawResponse = result.response.text();
  console.log("[extract] Gemini raw response:", rawResponse);

  const parsed = JSON.parse(rawResponse);
  const validated = extractionResultSchema.parse(parsed);
  console.log("[extract] Validated result:", JSON.stringify(validated, null, 2));

  return validated;
}
