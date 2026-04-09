import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const agentMemories = pgTable("agent_memories", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull(),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 50 }).notNull().default("auto-learned"),
  originalContent: text("original_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
