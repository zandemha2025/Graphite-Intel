import { pgTable, serial, integer, text, timestamp, varchar, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Pipedream Connect — connected accounts per org.
 * Each row represents one third-party account a user has authorized
 * via Pipedream Connect (e.g. their GA4 property, Meta Ads account).
 */
export const pipedreamConnectors = pgTable(
  "pipedream_connectors",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectedByUserId: varchar("connected_by_user_id").notNull(),
    /** Stable identifier matching our user — passed to Pipedream as external_user_id */
    externalUserId: varchar("external_user_id").notNull(),
    /** Pipedream account ID returned after OAuth */
    pipedreamAccountId: varchar("pipedream_account_id", { length: 100 }).notNull(),
    /** One of our DataSource values: ga4 | meta_ads | google_ads | ... */
    dataSource: varchar("data_source", { length: 50 }).notNull(),
    /** Pipedream app slug e.g. google_analytics */
    appSlug: varchar("app_slug", { length: 100 }).notNull(),
    /** User-friendly name for this connection */
    name: text("name"),
    isActive: boolean("is_active").default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_pd_connector_org").on(table.orgId),
    index("idx_pd_connector_source").on(table.dataSource),
    uniqueIndex("idx_pd_connector_account").on(table.orgId, table.pipedreamAccountId),
  ],
);

export const insertPipedreamConnectorSchema = createInsertSchema(pipedreamConnectors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export type PipedreamConnector = typeof pipedreamConnectors.$inferSelect;
export type InsertPipedreamConnector = z.infer<typeof insertPipedreamConnectorSchema>;
