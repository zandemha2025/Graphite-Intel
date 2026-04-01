import { pgTable, serial, integer, text, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id"),
    resourceName: text("resource_name"),
    metadata: jsonb("metadata").default({}),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    status: varchar("status", { length: 20 }).default("success"),
    errorMessage: text("error_message"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_org_id").on(table.orgId),
    index("idx_audit_user_id").on(table.userId),
    index("idx_audit_resource").on(table.resourceType, table.resourceId),
    index("idx_audit_timestamp").on(table.timestamp),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
