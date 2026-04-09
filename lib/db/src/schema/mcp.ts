import { pgTable, serial, integer, boolean, varchar, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const mcpConfigs = pgTable("mcp_configs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull()
    .unique(),
  enabled: boolean("enabled").default(false),
  serverUrl: varchar("server_url", { length: 500 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const mcpKeys = pgTable("mcp_keys", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const mcpUsageLogs = pgTable("mcp_usage_logs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .references(() => organizations.id)
    .notNull(),
  keyId: integer("key_id").references(() => mcpKeys.id),
  tool: varchar("tool", { length: 100 }).notNull(),
  caller: varchar("caller", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
