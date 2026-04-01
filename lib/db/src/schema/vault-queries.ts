import { pgTable, serial, integer, text, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Saved vault search queries.
 * Users can save frequently-used search configurations for quick re-use.
 */
export const savedVaultQueries = pgTable(
  "saved_vault_queries",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    query: text("query").notNull(),
    searchMode: varchar("search_mode", { length: 20 }).notNull().default("hybrid"), // "hybrid" | "semantic" | "fulltext"
    projectIds: jsonb("project_ids").$type<number[]>().default([]),
    filters: jsonb("filters").$type<{ fileTypes?: string[]; dateRange?: { from: string; to: string } }>(),
    isShared: varchar("is_shared", { length: 10 }).default("private"), // "private" | "org"
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    useCount: integer("use_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_saved_query_org").on(table.orgId),
    index("idx_saved_query_user").on(table.createdByUserId),
  ],
);

export const insertSavedVaultQuerySchema = createInsertSchema(savedVaultQueries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
  useCount: true,
});

export type SavedVaultQuery = typeof savedVaultQueries.$inferSelect;
export type InsertSavedVaultQuery = z.infer<typeof insertSavedVaultQuerySchema>;
