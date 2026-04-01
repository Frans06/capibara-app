import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@capibara/db";
import { Receipt, ReceiptItem } from "@capibara/db/schema";

import { protectedProcedure } from "../trpc";

const RECEIPT_EXTRACTION_PROMPT = `Analyze this receipt image and extract the following information as JSON.
Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.

Required JSON structure:
{
  "merchant_name": "string or null",
  "receipt_date": "YYYY-MM-DD or null",
  "currency": "3-letter ISO code like USD, EUR, MXN or null",
  "items": [
    {
      "description": "item name",
      "quantity": number,
      "unit_price": number or null,
      "total_price": number
    }
  ],
  "total_amount": number
}

Rules:
- All monetary values must be numbers (not strings), e.g. 12.99 not "$12.99"
- If you cannot read a value, use null
- quantity defaults to 1 if not shown
- total_amount is the final total paid (including tax if shown)
- Return ONLY the JSON object, nothing else`;

interface ParsedReceipt {
  merchant_name: string | null;
  receipt_date: string | null;
  currency: string | null;
  items: {
    description: string;
    quantity: number;
    unit_price: number | null;
    total_price: number;
  }[];
  total_amount: number;
}

function parseAIResponse(raw: string): ParsedReceipt | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as ParsedReceipt;
  } catch {
    return null;
  }
}

export const receiptRouter = {
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["image/jpeg", "image/png", "image/heic"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.r2) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "R2 service not configured",
        });
      }

      const ext =
        input.contentType === "image/jpeg"
          ? "jpg"
          : input.contentType === "image/png"
            ? "png"
            : "heic";
      const key = `receipts/${ctx.session.user.id}/${crypto.randomUUID()}.${ext}`;

      const uploadUrl = await ctx.r2.createUploadUrl(key, input.contentType);

      const [receipt] = await ctx.db
        .insert(Receipt)
        .values({
          userId: ctx.session.user.id,
          imageKey: key,
          status: "pending",
        })
        .returning();
      if (!receipt) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create receipt record",
        });
      }
      return { uploadUrl, receiptId: receipt.id, key };
    }),

  scan: protectedProcedure
    .input(
      z.object({
        receiptId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.r2 || !ctx.ai) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "R2/AI services not configured",
        });
      }

      const receipt = await ctx.db.query.Receipt.findFirst({
        where: eq(Receipt.id, input.receiptId),
      });

      if (!receipt || receipt.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db
        .update(Receipt)
        .set({ status: "processing" })
        .where(eq(Receipt.id, input.receiptId));

      try {
        const imageBase64 = await ctx.r2.getImageAsBase64(receipt.imageKey);

        const rawResponse = await ctx.ai.runVisionModel(
          imageBase64,
          RECEIPT_EXTRACTION_PROMPT,
        );

        const parsed = parseAIResponse(rawResponse);

        if (!parsed) {
          await ctx.db
            .update(Receipt)
            .set({ status: "failed", rawAiResponse: rawResponse })
            .where(eq(Receipt.id, input.receiptId));
          return { success: false as const, receiptId: input.receiptId };
        }

        await ctx.db
          .update(Receipt)
          .set({
            merchantName: parsed.merchant_name,
            totalAmount: parsed.total_amount.toString(),
            currency: parsed.currency ?? "USD",
            receiptDate: parsed.receipt_date,
            rawAiResponse: parsed,
            status: "completed",
          })
          .where(eq(Receipt.id, input.receiptId));

        if (parsed.items.length) {
          await ctx.db.insert(ReceiptItem).values(
            parsed.items.map((item) => ({
              receiptId: input.receiptId,
              description: item.description,
              quantity: item.quantity.toString(),
              unitPrice: item.unit_price?.toString(),
              totalPrice: item.total_price.toString(),
            })),
          );
        }

        return { success: true as const, receiptId: input.receiptId };
      } catch (error) {
        await ctx.db
          .update(Receipt)
          .set({
            status: "failed",
            rawAiResponse: { error: String(error) },
          })
          .where(eq(Receipt.id, input.receiptId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process receipt",
          cause: error,
        });
      }
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.Receipt.findMany({
      where: eq(Receipt.userId, ctx.session.user.id),
      orderBy: desc(Receipt.createdAt),
      with: { items: true },
      limit: 50,
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const receipt = await ctx.db.query.Receipt.findFirst({
        where: eq(Receipt.id, input.id),
        with: { items: true },
      });
      if (!receipt || receipt.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return receipt;
    }),
} satisfies TRPCRouterRecord;
