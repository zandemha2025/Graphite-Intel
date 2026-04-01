import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, numeric, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { documents } from "./documents";

/**
 * Vault Projects — group documents into organized matters/projects.
 */
export const vaultProjects = pgTable(
  "vault_projects",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    matterType: varchar("matter_type", { length: 50 }),
    documentCount: integer("document_count").default(0),
    status: varchar("status", { length: 20 }).default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_vault_project_org").on(table.orgId),
  ],
);

/**
 * Junction table: documents → vault projects (many-to-many).
 */
export const projectDocuments = pgTable(
  "project_documents",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => vaultProjects.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.documentId] }),
  ],
);

/**
 * Extraction Templates — define what fields to pull from each document type.
 */
export const extractionTemplates = pgTable(
  "extraction_templates",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    documentType: varchar("document_type", { length: 50 }),
    schema: jsonb("schema").notNull(), // JSON Schema of fields to extract
    systemPrompt: text("system_prompt"),
    isBuiltIn: boolean("is_built_in").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_extraction_tpl_org").on(table.orgId),
  ],
);

/**
 * Document Extractions — structured results from running an extraction template on a document.
 */
export const documentExtractions = pgTable(
  "document_extractions",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    templateId: integer("template_id")
      .references(() => extractionTemplates.id, { onDelete: "set null" }),
    extractedData: jsonb("extracted_data").notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    status: varchar("status", { length: 20 }).default("pending"),
    errorMessage: text("error_message"),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_doc_extraction_doc").on(table.documentId),
    index("idx_doc_extraction_tpl").on(table.templateId),
  ],
);

/**
 * Bulk Jobs — track batch upload and extraction operations.
 */
export const bulkJobs = pgTable(
  "bulk_jobs",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    triggeredByUserId: varchar("triggered_by_user_id").notNull(),
    type: varchar("type", { length: 30 }).notNull(), // "upload" | "extraction"
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    totalItems: integer("total_items").default(0),
    completedItems: integer("completed_items").default(0),
    failedItems: integer("failed_items").default(0),
    metadata: jsonb("metadata").default({}),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_bulk_job_org").on(table.orgId),
  ],
);

// Insert schemas
export const insertVaultProjectSchema = createInsertSchema(vaultProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  documentCount: true,
});

export const insertExtractionTemplateSchema = createInsertSchema(extractionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type VaultProject = typeof vaultProjects.$inferSelect;
export type InsertVaultProject = z.infer<typeof insertVaultProjectSchema>;
export type ExtractionTemplate = typeof extractionTemplates.$inferSelect;
export type DocumentExtraction = typeof documentExtractions.$inferSelect;
export type BulkJob = typeof bulkJobs.$inferSelect;
