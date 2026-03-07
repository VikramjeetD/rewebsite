import { GoogleGenAI } from "@google/genai";
import type { RoomDescriptor } from "./room-list";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const IMAGE_MODEL = "gemini-3-pro-image-preview";

const BASE_PROMPT = `You are a professional real estate photographer. The attached reference
photos show actual rooms of a rental apartment.

TASK: Generate a photorealistic photograph showing {roomDescription}
from a DIFFERENT angle than the reference photos, as if the photographer
moved to another position in the same room.

CRITICAL RULES:
- Eye-level camera position (5 feet / 1.5m from the floor)
- Wide-angle lens perspective typical of real estate photography
- Do NOT add, remove, or change ANY furniture, fixtures, or decorations
- Do NOT invent or hallucinate elements not visible in the reference photos — no extra cupboards, cabinets, doorways, windows, shelves, appliances, or architectural features that are not clearly shown in the references
- The room must contain ONLY the items visible in the reference photos, nothing more
- Areas not visible in the reference photos should be represented with plain, neutral walls or surfaces consistent with what IS visible
- Match the exact flooring, wall colors, fixtures, lighting, and finishes
- Natural daylight, warm and inviting atmosphere
- No people, no pets, no text overlays, no watermarks, no logos
- If reference photos contain watermarks or logos, completely remove them
- Must look like a real photograph, not a 3D rendering
- Show a natural standing viewpoint from a different corner or position`;

function buildPrompt(room: RoomDescriptor): string {
  return BASE_PROMPT.replace("{roomDescription}", room.prompt);
}

export async function generateRoomView(
  imageBuffers: { data: Buffer; mimeType: string }[],
  room: RoomDescriptor
): Promise<{ data: string; mimeType: string } | null> {
  const imageParts = imageBuffers.map((img) => ({
    inlineData: {
      data: img.data.toString("base64"),
      mimeType: img.mimeType,
    },
  }));

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [...imageParts, { text: buildPrompt(room) }],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    console.log(
      `[generate-views] No parts for ${room.id}. Response:`,
      JSON.stringify({
        finishReason: response.candidates?.[0]?.finishReason,
        promptFeedback: response.promptFeedback,
      })
    );
    return null;
  }

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }

  console.log(
    `[generate-views] No image in parts for ${room.id}. Part types:`,
    parts.map((p) => Object.keys(p))
  );
  return null;
}
