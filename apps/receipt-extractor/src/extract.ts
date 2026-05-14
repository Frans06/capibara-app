import { z } from "zod/v4";

import type { Env } from "./env";

const ExtractionSchema = z.object({
  storeName: z.string().nullable(),
  total: z.number().nullable(),
  receiptDate: z.string().nullable(),
  notes: z.string().nullable(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const SYSTEM_PROMPT = `You are a receipt OCR extractor. Read the receipt image and return ONLY a JSON object matching this exact shape:
{
  "storeName": <string — store/merchant name, or null if not visible>,
  "total": <number — final total amount as a plain decimal (e.g. 24.50), or null if not visible>,
  "receiptDate": <string — date in ISO format YYYY-MM-DD, or null if not visible>,
  "notes": <string — short summary of the line items (max 200 chars), or null>
}

Respond with ONLY the JSON object. No markdown fences, no commentary.`;

export async function extractReceipt(
  env: Env,
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<Extraction> {
  const dataUrl = `data:${mimeType};base64,${arrayBufferToBase64(imageBytes)}`;

  const response = await env.AI.run(
    "@cf/mistralai/mistral-small-3.1-24b-instruct" as keyof AiModels,
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: "Extract the data from this receipt." },
          ],
        },
      ],
      response_format: { type: "json_object" },
    } as unknown as AiTextGenerationInput,
  );

  const text = extractText(response);
  return parseExtraction(text);
}

function extractText(response: unknown): string {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    const choices = r.choices;
    if (Array.isArray(choices) && choices[0]) {
      const message = (choices[0] as Record<string, unknown>).message;
      if (message && typeof message === "object") {
        const content = (message as Record<string, unknown>).content;
        if (typeof content === "string") return content;
      }
    }
  }
  throw new Error("Unexpected AI response shape");
}

function parseExtraction(text: string): Extraction {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) throw new Error("No JSON object found in AI response");
  const parsed: unknown = JSON.parse(match[0]);
  return ExtractionSchema.parse(parsed);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunk to avoid call-stack overflow on large images
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}
