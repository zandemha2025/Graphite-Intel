import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { usersTable } from "./auth";

export const contextDefinitions = pgTable("context_definitions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizations.id),
  userId: varchar("user_id").references(() => usersTable.id),
  term: varchar("term", { length: 255 }).notNull(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("market"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ContextDefinition = typeof contextDefinitions.$inferSelect;
export type InsertContextDefinition = typeof contextDefinitions.$inferInsert;
