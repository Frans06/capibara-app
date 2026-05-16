import postgres from "postgres";

import type { Env } from "./env";

export interface ExtractedItem {
  name: string;
  quantity: number | null;
  unitPrice: string | null;
  totalPrice: string | null;
}

export interface ExtractedFields {
  storeName: string | null;
  storeAddress: string | null;
  receiptDate: string | null;
  currency: string | null;
  subtotal: string | null;
  tax: string | null;
  tip: string | null;
  total: string | null;
  paymentMethod: string | null;
  category: string | null;
  items: ExtractedItem[] | null;
  notes: string | null;
  extractionScore: number;
  status: "processed" | "failed";
}

export async function updateReceiptExtraction(
  env: Env,
  id: string,
  fields: ExtractedFields,
): Promise<void> {
  const sql = postgres(env.POSTGRES_URL, { prepare: false, max: 1 });
  try {
    await sql`
      UPDATE receipt
      SET store_name       = ${fields.storeName},
          store_address    = ${fields.storeAddress},
          receipt_date     = ${fields.receiptDate},
          currency         = ${fields.currency},
          subtotal         = ${fields.subtotal},
          tax              = ${fields.tax},
          tip              = ${fields.tip},
          total            = ${fields.total},
          payment_method   = ${fields.paymentMethod},
          category         = ${fields.category},
          items            = ${
            fields.items === null
              ? null
              : // postgres-js JSONValue rejects arrays-of-objects (overly
                // strict); cast through its own param type. sql.json encodes
                // exactly once — manual JSON.stringify + ::jsonb double-encoded
                // it into a jsonb *string* scalar instead of an array.
                sql.json(
                  fields.items as unknown as Parameters<typeof sql.json>[0],
                )
          },
          notes            = ${fields.notes},
          extraction_score = ${fields.extractionScore},
          status           = ${fields.status},
          updated_at       = now()
      WHERE id = ${id}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
