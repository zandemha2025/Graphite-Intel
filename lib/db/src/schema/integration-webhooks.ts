import { pgTable, serial, integer, text, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { integrations } from "./integrations";

/**
 * Tracks active push-notification channels (webhooks) registered with
 * third-party providers (e.g. Google Drive Changes API).
 * Allows us to renew or stop channels and map incoming notifications
 * back to an integration.
 */
export const integrationWebhooks = pgTable(
  "integration_webhooks",
  {
    id: serial("id").primaryKey(),
    integrationId: integer("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    channelId: varchar("channel_id", { length: 255 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    provider: varchar("provider", { length: 50 }).notNull(), // "google_drive"
    callbackUrl: text("callback_url"),
    pageToken: text("page_token"), // Drive startPageToken for incremental changes
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "expired" | "stopped"
    lastNotificationAt: timestamp("last_notification_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_webhook_integration").on(table.integrationId),
    index("idx_webhook_channel").on(table.channelId),
    index("idx_webhook_status").on(table.status),
  ],
);

export type IntegrationWebhook = typeof integrationWebhooks.$inferSelect;
