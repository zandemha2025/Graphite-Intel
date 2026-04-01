import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";
import { documents } from "./documents";

/**
 * Third-party integrations (Google Drive, SharePoint, Slack, etc.)
 * Stores OAuth tokens and sync configuration per org.
 */
export const integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectedByUserId: varchar("connected_by_user_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "google_drive" | "sharepoint" | "slack" | etc.
    name: text("name"), // User-friendly name: "My Drive", "Team Drive"
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: jsonb("scopes"),
    metadata: jsonb("metadata"), // Provider-specific: email, displayName, rootFolderId, etc.
    isActive: boolean("is_active").default(true),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    syncConfig: jsonb("sync_config"), // { folderIds: [], direction: "pull" | "bidirectional", intervalMinutes: 30 }
    syncStatus: varchar("sync_status", { length: 20 }).default("idle"), // "idle" | "syncing" | "error"
    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").default(0),
    totalFilesSynced: integer("total_files_synced").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_integration_org").on(table.orgId),
    index("idx_integration_type").on(table.type),
  ],
);

/**
 * Tracks files synced from external sources.
 * Links an external file ID to a local document record.
 */
export const syncedFiles = pgTable(
  "synced_files",
  {
    id: serial("id").primaryKey(),
    integrationId: integer("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .references(() => documents.id, { onDelete: "set null" }),
    externalId: text("external_id").notNull(),
    externalPath: text("external_path"),
    externalName: text("external_name"),
    mimeType: varchar("mime_type", { length: 100 }),
    syncDirection: varchar("sync_direction", { length: 20 }).default("pull"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncStatus: varchar("sync_status", { length: 20 }).default("synced"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_synced_file_external").on(table.integrationId, table.externalId),
    index("idx_synced_file_doc").on(table.documentId),
  ],
);

// Insert schemas
export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

// Types
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type SyncedFile = typeof syncedFiles.$inferSelect;
