import { jsonrepair } from "jsonrepair";
import { z } from "zod/v4";

import type { Env } from "./env";

const CATEGORIES = [
  "groceries",
  "dining",
  "gas",
  "retail",
  "services",
  "entertainment",
  "travel",
  "healthcare",
  "other",
] as const;

// Coerce + catch makes each numeric field accept stringified numbers ("4.99")
// and silently fall back to null on garbage values, so one bad line item
// doesn't kill the whole row.
const nullableNum = z.coerce.number().nullable().catch(null);

const ItemSchema = z.object({
  name: z.string().min(1),
  quantity: nullableNum,
  unitPrice: nullableNum,
  totalPrice: nullableNum,
});

export const ExtractionSchema = z.object({
  storeName: z.string().nullable().catch(null),
  storeAddress: z.string().nullable().catch(null),
  receiptDate: z.string().nullable().catch(null),
  currency: z.string().length(3).nullable().catch(null),
  subtotal: nullableNum,
  tax: nullableNum,
  tip: nullableNum,
  total: nullableNum,
  paymentMethod: z.string().nullable().catch(null),
  category: z.enum(CATEGORIES).nullable().catch(null),
  // Each item is `.catch(null)` then filtered, so a single malformed item
  // doesn't drop the whole array.
  items: z
    .array(ItemSchema.nullable().catch(null))
    .nullable()
    .catch(null)
    .transform((arr) => (arr ? arr.filter((i): i is z.infer<typeof ItemSchema> => i !== null) : null)),
  notes: z.string().nullable().catch(null),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type ExtractedItem = z.infer<typeof ItemSchema>;

const SYSTEM_PROMPT = `You are a receipt OCR extractor. Read the receipt image and return ONLY a JSON object with this exact shape:

{
  "storeName":     <string — merchant name on the receipt, or null>,
  "storeAddress":  <string — physical address printed on the receipt, or null>,
  "receiptDate":   <string — ISO date YYYY-MM-DD of the transaction, or null>,
  "currency":      <string — 3-letter ISO 4217 code (USD, EUR, MXN, GBP, JPY, ...), or null>,
  "subtotal":      <number — pre-tax/tip total as plain decimal (e.g. 21.50), or null>,
  "tax":           <number — tax amount as plain decimal, or null>,
  "tip":           <number — gratuity / service charge as plain decimal, or null>,
  "total":         <number — final amount paid as plain decimal, or null>,
  "paymentMethod": <string — e.g. "cash", "card", "**** 1234", "Visa", or null>,
  "category":      <one of "groceries"|"dining"|"gas"|"retail"|"services"|"entertainment"|"travel"|"healthcare"|"other", or null>,
  "items": [
    {
      "name":       <string — product/service name>,
      "quantity":   <number — units purchased, default 1 if unclear, or null>,
      "unitPrice":  <number — price per unit as plain decimal, or null>,
      "totalPrice": <number — line total as plain decimal, or null>
    }
  ] | null,
  "notes": <string — optional short remark (e.g. "tip included", "discount applied"), or null>
}

Rules:
- Use null for any field that is not clearly visible on the receipt. DO NOT invent or guess values.
- Numbers must be plain JSON numbers (no currency symbols, no thousand separators).
- Dates must be in YYYY-MM-DD. If only month/day are visible and the year is unclear, use null.
- "category" must be exactly one of the listed values (lowercase).
- "items" is an array of every distinct line item. If no items are legible, use null.
- Respond with ONLY the raw JSON object. No markdown fences, no commentary, no preamble.`;

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
      max_tokens: 4096,
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

  // 1. Repair common LLM mistakes (trailing commas, missing commas, single
  //    quotes, partially-closed strings) before JSON.parse.
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonrepair(match[0]));
  } catch (err) {
    throw new Error(
      `Could not repair AI JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 2. Try the strict schema first.
  const result = ExtractionSchema.safeParse(parsed);
  if (result.success) return result.data;

  // 3. Final fallback: drop the items array entirely (the most failure-prone
  //    field) and try again, so a partially-extracted row still saves.
  if (parsed && typeof parsed === "object") {
    const stripped = { ...(parsed as Record<string, unknown>), items: null };
    const retry = ExtractionSchema.safeParse(stripped);
    if (retry.success) return retry.data;
  }

  throw new Error(`Extraction failed Zod validation: ${result.error.message}`);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}
