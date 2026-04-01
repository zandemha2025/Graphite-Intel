import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * User-created workflow definitions (the "blueprint").
 * Replaces the hardcoded WORKFLOW_TEMPLATES for custom workflows.
 */
export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    isTemplate: boolean("is_template").default(false),
    isPublished: boolean("is_published").default(false),
    config: jsonb("config").notNull(), // WorkflowConfig JSON
    version: integer("version").default(1),
    usageCount: integer("usage_count").default(0),
    status: varchar("status", { length: 20 }).default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_wf_def_org").on(table.orgId),
    index("idx_wf_def_status").on(table.status),
  ],
);

/**
 * Individual steps within a workflow definition.
 */
export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: serial("id").primaryKey(),
    workflowDefinitionId: integer("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "prompt" | "tool" | "branch" | "loop" | "human_review"
    name: text("name"),
    description: text("description"),
    config: jsonb("config").notNull(), // Step-specific config
  },
  (table) => [
    index("idx_wf_step_def").on(table.workflowDefinitionId),
  ],
);

/**
 * A single execution of a workflow.
 */
export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workflowDefinitionId: integer("workflow_definition_id")
      .references(() => workflowDefinitions.id, { onDelete: "set null" }),
    // Also support legacy template-key-based runs
    legacyTemplateKey: varchar("legacy_template_key", { length: 100 }),
    triggeredByUserId: varchar("triggered_by_user_id").notNull(),
    title: text("title").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    inputs: jsonb("inputs").default({}),
    outputs: jsonb("outputs").default({}),
    currentStepIndex: integer("current_step_index"),
    errorMessage: text("error_message"),
    inngestRunId: varchar("inngest_run_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_wf_exec_org").on(table.orgId),
    index("idx_wf_exec_status").on(table.status),
  ],
);

/**
 * Step-level execution trace.
 */
export const workflowExecutionSteps = pgTable(
  "workflow_execution_steps",
  {
    id: serial("id").primaryKey(),
    executionId: integer("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    stepType: varchar("step_type", { length: 50 }).notNull(),
    stepName: text("step_name"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    input: jsonb("input"),
    output: jsonb("output"),
    errorMessage: text("error_message"),
    tokensCost: integer("tokens_cost"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_wf_exec_step").on(table.executionId),
  ],
);

// Insert schemas
export const insertWorkflowDefinitionSchema = createInsertSchema(workflowDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  version: true,
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

// Types
export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = z.infer<typeof insertWorkflowDefinitionSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type WorkflowExecutionStep = typeof workflowExecutionSteps.$inferSelect;
