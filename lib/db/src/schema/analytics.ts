import { pgTable, serial, integer, text, timestamp, varchar, jsonb, numeric, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

/**
 * Analytics Events — tracks feature usage, token costs, and user activity.
 * Used to power the admin analytics dashboard.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id"),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    feature: varchar("feature", { length: 50 }),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: integer("resource_id"),
    metadata: jsonb("metadata"),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    tokensCost: integer("tokens_cost"),
    dollarsCost: numeric("dollars_cost", { precision: 10, scale: 6 }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_analytics_org_time").on(table.orgId, table.timestamp),
    index("idx_analytics_feature").on(table.feature),
    index("idx_analytics_user").on(table.userId),
    index("idx_analytics_event_type").on(table.eventType),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;
