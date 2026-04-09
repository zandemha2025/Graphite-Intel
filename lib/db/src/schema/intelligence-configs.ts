import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// -- Intelligence Configs --
// Per-org monitoring and delivery preferences for the intelligence module.
export const intelligenceConfigs = pgTable(
  "intelligence_configs",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    monitoringSchedule: varchar("monitoring_schedule", { length: 20 }).default("off"),
    deliveryInApp: boolean("delivery_in_app").default(true),
    deliveryEmail: varchar("delivery_email", { length: 255 }),
    deliverySlack: varchar("delivery_slack", { length: 500 }),
    alertCompetitorMoves: boolean("alert_competitor_moves").default(true),
    alertMarketShifts: boolean("alert_market_shifts").default(true),
    alertNegativeSentiment: boolean("alert_negative_sentiment").default(true),
    alertCampaignAnomalies: boolean("alert_campaign_anomalies").default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_intel_config_org").on(table.orgId)],
);

// -- KPI Alerts --
// Generated alerts when a KPI crosses a configured threshold.
export const kpiAlerts = pgTable(
  "kpi_alerts",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    metric: varchar("metric", { length: 50 }).notNull(),
    direction: varchar("direction", { length: 20 }).notNull(),
    percentChange: real("percent_change").notNull(),
    previousValue: real("previous_value").notNull(),
    currentValue: real("current_value").notNull(),
    campaignName: varchar("campaign_name", { length: 255 }),
    campaignId: integer("campaign_id"),
    severity: varchar("severity", { length: 20 }).notNull().default("warning"),
    dismissed: boolean("dismissed").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_kpi_alert_org").on(table.orgId),
    index("idx_kpi_alert_dismissed").on(table.dismissed),
  ],
);

// -- KPI Thresholds --
// User-defined thresholds that trigger KPI alerts.
export const kpiThresholds = pgTable(
  "kpi_thresholds",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    metric: varchar("metric", { length: 50 }).notNull(),
    direction: varchar("direction", { length: 20 }).notNull(),
    percent: real("percent").notNull(),
    checkFrequency: varchar("check_frequency", { length: 10 }).default("6h"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_kpi_threshold_org").on(table.orgId)],
);

// -- Report Schedules --
// Scheduled delivery of reports via email or Slack.
export const reportSchedules = pgTable(
  "report_schedules",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportId: integer("report_id"),
    reportTitle: varchar("report_title", { length: 255 }),
    channel: varchar("channel", { length: 20 }).notNull(),
    destination: varchar("destination", { length: 500 }).notNull(),
    frequency: varchar("frequency", { length: 20 }).notNull(),
    active: boolean("active").default(true),
    nextDeliveryAt: timestamp("next_delivery_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_report_schedule_org").on(table.orgId)],
);
