import { relations, sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Receipt scanning tables

export const Receipt = pgTable("receipt", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  imageKey: t.text().notNull(),
  merchantName: t.text(),
  totalAmount: t.numeric({ precision: 10, scale: 2 }),
  currency: t.varchar({ length: 3 }).default("USD"),
  receiptDate: t.text(),
  rawAiResponse: t.jsonb(),
  status: t.varchar({ length: 20 }).notNull().default("pending"),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const ReceiptItem = pgTable("receipt_item", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  receiptId: t
    .uuid()
    .notNull()
    .references(() => Receipt.id, { onDelete: "cascade" }),
  description: t.text().notNull(),
  quantity: t.numeric({ precision: 10, scale: 3 }).default("1"),
  unitPrice: t.numeric({ precision: 10, scale: 2 }),
  totalPrice: t.numeric({ precision: 10, scale: 2 }),
}));

export const receiptRelations = relations(Receipt, ({ many }) => ({
  items: many(ReceiptItem),
}));

export const receiptItemRelations = relations(ReceiptItem, ({ one }) => ({
  receipt: one(Receipt, {
    fields: [ReceiptItem.receiptId],
    references: [Receipt.id],
  }),
}));

export const CreateReceiptSchema = createInsertSchema(Receipt).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
