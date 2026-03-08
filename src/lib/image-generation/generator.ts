import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const IMAGE_MODEL = "gemini-3-pro-image-preview";

const RELIGHT_PROMPT = `You are a professional photo editor specializing in real estate photography.

The attached image is a real estate photo of a room. Generate a NEW version of this
EXACT same image with improved lighting conditions, as if the photo was taken at a
different time of day with better natural light.

ABSOLUTE REQUIREMENTS — NO EXCEPTIONS:
- The output must be the EXACT same photograph — same camera angle, same viewpoint,
  same composition, same framing
- Do NOT move, add, remove, or change ANY object, furniture, fixture, or architectural
  element. Every single item must remain exactly where it is
- Do NOT change the room layout, wall positions, window positions, or any structural element
- Do NOT crop, zoom, pan, or reframe the image in any way
- The pixel-level composition must match — only the lighting should differ

LIGHTING CHANGES TO APPLY:
- Simulate bright, warm natural daylight streaming through the windows
- Brighten dark corners and shadows naturally
- Add warm, inviting ambient light as if it's a sunny afternoon
- Make the space feel bright, airy, and welcoming
- Ensure colors look vibrant and true-to-life under the new lighting
- Preserve the natural color of all surfaces — do NOT shift wall colors, floor tones,
  or fixture finishes. The lighting change should illuminate, not recolor

OUTPUT QUALITY:
- The result must look like a real photograph, not a rendering
- No people, no pets, no text overlays, no watermarks, no logos
- If the original contains watermarks or logos, remove them
- Maintain sharp detail and realistic textures throughout`;

export async function relightPhoto(imageBuffer: {
  data: Buffer;
  mimeType: string;
}): Promise<{ data: string; mimeType: string } | null> {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageBuffer.data.toString("base64"),
              mimeType: imageBuffer.mimeType,
            },
          },
          { text: RELIGHT_PROMPT },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    console.log(
      `[relight] No parts in response:`,
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
    `[relight] No image in parts. Part types:`,
    parts.map((p) => Object.keys(p))
  );
  return null;
}
