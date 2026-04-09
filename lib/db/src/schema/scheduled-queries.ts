import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { usersTable } from "./auth";

export const scheduledQueries = pgTable("scheduled_queries", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => usersTable.id)
    .notNull(),
  query: text("query").notNull(),
  schedule: varchar("schedule", { length: 20 }).notNull(),
  active: boolean("active").default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
