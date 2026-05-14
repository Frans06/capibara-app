import { relations, sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const RECEIPT_CATEGORIES = [
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
export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export interface ReceiptItem {
  name: string;
  quantity: number | null;
  unitPrice: string | null;
  totalPrice: string | null;
}

export const Receipt = pgTable("receipt", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fileKey: t.text().notNull(),
  fileName: t.text().notNull(),
  mimeType: t.text().notNull(),
  status: t.text().default("pending").notNull(),
  // AI-extracted fields
  storeName: t.varchar({ length: 256 }),
  storeAddress: t.text(),
  receiptDate: t.date(),
  currency: t.varchar({ length: 3 }),
  subtotal: t.numeric({ precision: 10, scale: 2 }),
  tax: t.numeric({ precision: 10, scale: 2 }),
  tip: t.numeric({ precision: 10, scale: 2 }),
  total: t.numeric({ precision: 10, scale: 2 }),
  paymentMethod: t.text(),
  category: t.text().$type<ReceiptCategory>(),
  items: t.jsonb().$type<ReceiptItem[]>(),
  extractionScore: t.integer(),
  notes: t.text(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const receiptRelations = relations(Receipt, ({ one }) => ({
  user: one(user, {
    fields: [Receipt.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  receipts: many(Receipt),
}));

export const CreateReceiptSchema = createInsertSchema(Receipt, {
  fileName: z.string().min(1),
  fileKey: z.string().min(1),
  mimeType: z.string().min(1),
}).pick({
  fileName: true,
  fileKey: true,
  mimeType: true,
});

export * from "./auth-schema";
