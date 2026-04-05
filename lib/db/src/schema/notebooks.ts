import { pgTable, serial, integer, text, timestamp, varchar, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Notebooks — multi-cell analytical workspaces where users create living
 * strategic documents with cells that reference each other and auto-refresh.
 */
export const notebooks = pgTable(
  "notebooks",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    title: varchar("title").notNull(),
    description: text("description"),
    isPublished: boolean("is_published").notNull().default(false),
    refreshSchedule: varchar("refresh_schedule"), // cron string, nullable
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_notebook_org").on(table.orgId),
    index("idx_notebook_created_by").on(table.createdByUserId),
  ],
);

/**
 * Notebook cells — ordered prompts within a notebook.
 * Each cell has an AI prompt that can reference other cells' output
 * via {{cell.1}} or {{cell.title}} patterns.
 */
export const notebookCells = pgTable(
  "notebook_cells",
  {
    id: serial("id").primaryKey(),
    notebookId: integer("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    cellIndex: integer("cell_index").notNull(),
    title: varchar("title").notNull(),
    prompt: text("prompt").notNull(),
    output: text("output"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | running | complete | failed
    dataSourceHint: varchar("data_source_hint"), // e.g. "salesforce", "gong", etc.
    lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
    tokensCost: integer("tokens_cost"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_notebook_cell_notebook").on(table.notebookId),
    index("idx_notebook_cell_index").on(table.notebookId, table.cellIndex),
  ],
);

// Insert schemas
export const insertNotebookSchema = createInsertSchema(notebooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRefreshedAt: true,
});

export const insertNotebookCellSchema = createInsertSchema(notebookCells).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  output: true,
  status: true,
  lastExecutedAt: true,
  tokensCost: true,
});

// Types
export type Notebook = typeof notebooks.$inferSelect;
export type InsertNotebook = z.infer<typeof insertNotebookSchema>;
export type NotebookCell = typeof notebookCells.$inferSelect;
export type InsertNotebookCell = z.infer<typeof insertNotebookCellSchema>;
