import { z } from "zod/v4";

import type { ExtractedFields, ExtractedItem } from "./db";
import { updateReceiptExtraction } from "./db";
import type { Env } from "./env";
import type { Extraction } from "./extract";
import { extractReceipt } from "./extract";
import { computeScore } from "./score";

const RequestSchema = z.object({
  receiptId: z.string().uuid(),
  fileKey: z.string().min(1),
});

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/extract") {
      return new Response("Not found", { status: 404 });
    }

    if (req.headers.get("authorization") !== `Bearer ${env.SHARED_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: z.infer<typeof RequestSchema>;
    try {
      const raw: unknown = await req.json();
      body = RequestSchema.parse(raw);
    } catch (err) {
      console.error("[receipt-extractor] bad request", err);
      return new Response("Invalid request body", { status: 400 });
    }

    const { receiptId, fileKey } = body;
    const obj = await env.RECEIPTS_BUCKET.get(fileKey);

    if (!obj) {
      await safeUpdate(
        env,
        receiptId,
        failureFields(`File not found in R2: ${fileKey}`),
      );
      return new Response("Receipt file not found", { status: 404 });
    }

    const mimeType = obj.httpMetadata?.contentType ?? "image/jpeg";
    const bytes = await obj.arrayBuffer();

    try {
      const extracted = await extractReceipt(env, bytes, mimeType);
      await updateReceiptExtraction(env, receiptId, toDbFields(extracted));
      return new Response("OK");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown extraction error";
      console.error("[receipt-extractor] extraction failed", err);
      await safeUpdate(
        env,
        receiptId,
        failureFields(`Extraction failed: ${message}`),
      );
      return new Response("Extraction failed", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

function toDbFields(extracted: Extraction): ExtractedFields {
  return {
    storeName: extracted.storeName,
    storeAddress: extracted.storeAddress,
    receiptDate: extracted.receiptDate,
    currency: extracted.currency?.toUpperCase() ?? null,
    subtotal: numToStr(extracted.subtotal),
    tax: numToStr(extracted.tax),
    tip: numToStr(extracted.tip),
    total: numToStr(extracted.total),
    paymentMethod: extracted.paymentMethod,
    category: extracted.category,
    items: extracted.items?.map(toDbItem) ?? null,
    notes: extracted.notes,
    extractionScore: computeScore(extracted),
    status: "processed",
  };
}

function toDbItem(item: NonNullable<Extraction["items"]>[number]): ExtractedItem {
  return {
    name: item.name,
    quantity: item.quantity,
    unitPrice: numToStr(item.unitPrice),
    totalPrice: numToStr(item.totalPrice),
  };
}

function numToStr(n: number | null): string | null {
  return n === null ? null : n.toFixed(2);
}

function failureFields(message: string): ExtractedFields {
  return {
    storeName: null,
    storeAddress: null,
    receiptDate: null,
    currency: null,
    subtotal: null,
    tax: null,
    tip: null,
    total: null,
    paymentMethod: null,
    category: null,
    items: null,
    notes: message,
    extractionScore: 0,
    status: "failed",
  };
}

async function safeUpdate(
  env: Env,
  receiptId: string,
  fields: ExtractedFields,
): Promise<void> {
  try {
    await updateReceiptExtraction(env, receiptId, fields);
  } catch (err) {
    console.error("[receipt-extractor] DB update failed", err);
  }
}
