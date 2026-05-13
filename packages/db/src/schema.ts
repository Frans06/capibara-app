import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const Receipt = pgTable("receipt", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t.text().notNull(),
  fileKey: t.text().notNull(),
  fileName: t.text().notNull(),
  mimeType: t.text().notNull(),
  // populated by AI extraction later
  storeName: t.varchar({ length: 256 }),
  total: t.numeric({ precision: 10, scale: 2 }),
  receiptDate: t.date(),
  status: t.text().default("pending").notNull(),
  notes: t.text(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreateReceiptSchema = createInsertSchema(Receipt, {
  fileName: z.string().min(1),
  fileKey: z.string().min(1),
  mimeType: z.string().min(1),
}).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
