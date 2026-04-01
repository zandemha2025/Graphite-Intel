import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { workflowExecutions } from "./workflow-definitions";

/**
 * Human review queue for workflow steps that require manual approval.
 */
export const humanReviews = pgTable(
  "human_reviews",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    executionId: integer("execution_id")
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    assignedToUserId: varchar("assigned_to_user_id"),
    reviewData: jsonb("review_data").notNull(),
    decision: varchar("decision", { length: 20 }), // "approved" | "rejected" | "modified"
    feedback: text("feedback"),
    modifiedData: jsonb("modified_data"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | completed | expired
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_human_review_org").on(table.orgId),
    index("idx_human_review_exec").on(table.executionId),
    index("idx_human_review_assignee").on(table.assignedToUserId),
    index("idx_human_review_status").on(table.status),
  ],
);

export const insertHumanReviewSchema = createInsertSchema(humanReviews).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type HumanReview = typeof humanReviews.$inferSelect;
export type InsertHumanReview = z.infer<typeof insertHumanReviewSchema>;
