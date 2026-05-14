import { z } from "zod/v4";

import type { Env } from "./env";
import { updateReceiptExtraction } from "./db";
import { extractReceipt } from "./extract";

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
      await safeUpdate(env, receiptId, {
        storeName: null,
        total: null,
        receiptDate: null,
        notes: `File not found in R2: ${fileKey}`,
        status: "failed",
      });
      return new Response("Receipt file not found", { status: 404 });
    }

    const mimeType = obj.httpMetadata?.contentType ?? "image/jpeg";
    const bytes = await obj.arrayBuffer();

    try {
      const extracted = await extractReceipt(env, bytes, mimeType);
      await updateReceiptExtraction(env, receiptId, {
        storeName: extracted.storeName,
        total: extracted.total !== null ? String(extracted.total) : null,
        receiptDate: extracted.receiptDate,
        notes: extracted.notes,
        status: "processed",
      });
      return new Response("OK");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown extraction error";
      console.error("[receipt-extractor] extraction failed", err);
      await safeUpdate(env, receiptId, {
        storeName: null,
        total: null,
        receiptDate: null,
        notes: `Extraction failed: ${message}`,
        status: "failed",
      });
      return new Response("Extraction failed", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function safeUpdate(
  env: Env,
  receiptId: string,
  fields: Parameters<typeof updateReceiptExtraction>[2],
): Promise<void> {
  try {
    await updateReceiptExtraction(env, receiptId, fields);
  } catch (err) {
    console.error("[receipt-extractor] DB update failed", err);
  }
}
