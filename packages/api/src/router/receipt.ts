import type { TRPCRouterRecord } from "@trpc/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod/v4";

import { desc, eq } from "@capibara/db";
import { CreateReceiptSchema, Receipt } from "@capibara/db/schema";

import { protectedProcedure } from "../trpc";

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 environment variables");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 doesn't support the default CRC32 checksum the AWS SDK adds since v3.729.
    // Leaving it on bakes `x-amz-checksum-crc32` into the signed URL, but the
    // browser fetch never sends that header back → signature mismatch.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export const receiptRouter = {
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fileKey = `receipts/${ctx.session.user.id}/${Date.now()}-${input.fileName}`;
      const client = getR2Client();
      const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

      if (!bucket) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: fileKey,
          ContentType: input.mimeType,
        }),
        { expiresIn: 300 },
      );

      return { uploadUrl, fileKey };
    }),

  create: protectedProcedure
    .input(CreateReceiptSchema)
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .insert(Receipt)
        .values({ ...input, userId: ctx.session.user.id })
        .returning();

      const row = rows[0];
      if (row) triggerExtraction(row.id, row.fileKey);

      return rows;
    }),

  all: protectedProcedure.query(async ({ ctx }) => {
    const receipts = await ctx.db.query.Receipt.findMany({
      where: eq(Receipt.userId, ctx.session.user.id),
      orderBy: desc(Receipt.createdAt),
    });

    const client = getR2Client();
    const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    if (!bucket) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

    return Promise.all(
      receipts.map(async (receipt) => ({
        ...receipt,
        viewUrl: await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: bucket, Key: receipt.fileKey }),
          { expiresIn: 900 },
        ),
      })),
    );
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const receipt = await ctx.db.query.Receipt.findFirst({
        where: eq(Receipt.id, input.id),
      });

      if (!receipt || receipt.userId !== ctx.session.user.id) {
        return null;
      }

      const client = getR2Client();
      const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

      if (!bucket) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

      const viewUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: receipt.fileKey }),
        { expiresIn: 900 },
      );

      return { ...receipt, viewUrl };
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const receipt = await ctx.db.query.Receipt.findFirst({
        where: eq(Receipt.id, input),
      });

      if (!receipt || receipt.userId !== ctx.session.user.id) {
        return null;
      }

      const client = getR2Client();
      const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

      if (!bucket) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: receipt.fileKey }),
      );

      await ctx.db.delete(Receipt).where(eq(Receipt.id, input));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;

// Fire-and-forget POST to the receipt-extractor Worker. Failure to enqueue
// doesn't block the upload — the row stays in `status=pending` and can be
// re-processed later (manual button or scheduled job).
function triggerExtraction(receiptId: string, fileKey: string): void {
  const url = process.env.RECEIPT_EXTRACTOR_URL;
  const secret = process.env.RECEIPT_EXTRACTOR_SECRET;
  if (!url || !secret) {
    console.warn("[receipt] extractor URL/secret missing; skipping extraction");
    return;
  }

  void fetch(`${url}/extract`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ receiptId, fileKey }),
  })
    .catch((err: unknown) => {
      console.error("[receipt] failed to trigger extractor", err);
    })
    .then((response) => console.log("[receipt] extractor response", response));
}
