import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Playbook templates — auto-generated or manually created review playbooks.
 *
 * PlaybookStep JSON structure (stored in playbooks.steps):
 * {
 *   index: number;
 *   title: string;
 *   description: string;
 *   type: "checklist" | "review" | "extract" | "compare" | "flag";
 *   config: {
 *     extractionFields?: string[];
 *     comparisonDocTypes?: string[];
 *     flagConditions?: string[];
 *     aiPrompt?: string;
 *   };
 *   isRequired: boolean;
 * }
 */
export const playbooks = pgTable(
  "playbooks",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // "due_diligence" | "compliance" | "audit" | "review" | "custom"
    sourceDocumentIds: jsonb("source_document_ids").$type<number[]>(),
    steps: jsonb("steps").notNull().$type<PlaybookStep[]>(),
    isTemplate: boolean("is_template").default(false),
    isPublished: boolean("is_published").default(false),
    version: integer("version").default(1),
    parentId: integer("parent_id"), // For versioning — points to previous version
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_playbook_org").on(table.orgId),
    index("idx_playbook_category").on(table.category),
    index("idx_playbook_parent").on(table.parentId),
  ],
);

/**
 * Playbook runs — tracking execution of a playbook against a set of documents.
 */
export const playbookRuns = pgTable(
  "playbook_runs",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
    triggeredByUserId: varchar("triggered_by_user_id").notNull(),
    title: text("title").notNull(),
    targetDocumentIds: jsonb("target_document_ids").notNull().$type<number[]>(),
    workflowExecutionId: integer("workflow_execution_id"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | running | completed | failed
    stepResults: jsonb("step_results").$type<StepResult[]>(),
    completedSteps: integer("completed_steps").default(0),
    totalSteps: integer("total_steps").default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_playbook_run_org").on(table.orgId),
    index("idx_playbook_run_playbook").on(table.playbookId),
    index("idx_playbook_run_status").on(table.status),
  ],
);

// Insert schemas
export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true, createdAt: true, updatedAt: true, version: true,
});
export const insertPlaybookRunSchema = createInsertSchema(playbookRuns).omit({
  id: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true, completedSteps: true,
});

// Types
export type PlaybookStep = {
  index: number;
  title: string;
  description: string;
  type: "checklist" | "review" | "extract" | "compare" | "flag";
  config: {
    extractionFields?: string[];
    comparisonDocTypes?: string[];
    flagConditions?: string[];
    aiPrompt?: string;
  };
  isRequired: boolean;
};

export type StepResult = {
  stepIndex: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  notes?: string;
  completedByUserId?: string;
  completedAt?: string;
};

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type PlaybookRun = typeof playbookRuns.$inferSelect;
export type InsertPlaybookRun = z.infer<typeof insertPlaybookRunSchema>;
