import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const genericWebhooks = pgTable("generic_webhooks", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  workflowId: varchar("workflow_id", { length: 255 }),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  triggerCount: integer("trigger_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
