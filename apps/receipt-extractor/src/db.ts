import postgres from "postgres";

import type { Env } from "./env";

export interface ExtractedFields {
  storeName: string | null;
  total: string | null;
  receiptDate: string | null;
  notes: string | null;
  status: "processed" | "failed";
}

export async function updateReceiptExtraction(
  env: Env,
  id: string,
  fields: ExtractedFields,
): Promise<void> {
  // postgres-js options tuned for Supabase transaction-mode pooler (port 6543)
  // and short-lived Worker invocations.
  const sql = postgres(env.POSTGRES_URL, { prepare: false, max: 1 });
  try {
    await sql`
      UPDATE receipt
      SET store_name   = ${fields.storeName},
          total        = ${fields.total},
          receipt_date = ${fields.receiptDate},
          notes        = ${fields.notes},
          status       = ${fields.status},
          updated_at   = now()
      WHERE id = ${id}
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
