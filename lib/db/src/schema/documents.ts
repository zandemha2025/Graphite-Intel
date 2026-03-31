import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().default(""),
  title: text("title").notNull(),
  fileType: varchar("file_type", { length: 10 }).notNull(),
  objectKey: text("object_key").notNull(),
  extractedText: text("extracted_text"),
  status: varchar("status", { length: 20 }).notNull().default("processing"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationDocuments = pgTable("conversation_documents", {
  conversationId: integer("conversation_id").notNull(),
  documentId: integer("document_id").notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  extractedText: true,
  status: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
