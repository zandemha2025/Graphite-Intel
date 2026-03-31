import { pgTable, serial, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workflowRuns = pgTable("workflow_runs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  templateKey: varchar("template_key").notNull(),
  title: text("title").notNull(),
  inputs: jsonb("inputs").notNull().default({}),
  status: varchar("status").notNull().default("pending"),
  output: text("output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkflowRunSchema = createInsertSchema(workflowRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type InsertWorkflowRun = z.infer<typeof insertWorkflowRunSchema>;
