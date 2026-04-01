import { pgTable, serial, integer, text, timestamp, varchar, jsonb, numeric, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

// ─── Ad Accounts ───────────────────────────────────────────────────────────
/**
 * Connected advertising platform accounts (Google Ads, Meta, LinkedIn, TikTok).
 * Each org can connect multiple ad accounts across platforms.
 */
export const adAccounts = pgTable(
  "ad_accounts",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 30 }).notNull(), // "google_ads" | "meta" | "linkedin" | "tiktok"
    externalAccountId: varchar("external_account_id", { length: 255 }).notNull(),
    accountName: text("account_name").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    currency: varchar("currency", { length: 10 }).default("USD"),
    timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "paused" | "disconnected"
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ad_account_org").on(table.orgId),
    index("idx_ad_account_platform").on(table.platform),
    index("idx_ad_account_external").on(table.externalAccountId),
  ],
);

// ─── Ad Campaigns ──────────────────────────────────────────────────────────
/**
 * Campaigns managed through the platform.
 * Can be created in GRPHINTEL and published to one or more ad platforms,
 * or imported from existing platform campaigns.
 */
export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    adAccountId: integer("ad_account_id")
      .references(() => adAccounts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    objective: varchar("objective", { length: 50 }).notNull().default("awareness"),
    // "awareness" | "traffic" | "engagement" | "leads" | "conversions" | "sales"
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    // "draft" | "pending_review" | "active" | "paused" | "completed" | "archived"
    platforms: jsonb("platforms").$type<string[]>().default([]),
    externalCampaignIds: jsonb("external_campaign_ids").$type<Record<string, string>>().default({}),
    // e.g. { "google_ads": "123", "meta": "456" }
    budgetDaily: numeric("budget_daily", { precision: 12, scale: 2 }),
    budgetTotal: numeric("budget_total", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 10 }).default("USD"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    targeting: jsonb("targeting").$type<{
      locations?: string[];
      ageRange?: { min: number; max: number };
      genders?: string[];
      interests?: string[];
      keywords?: string[];
      audiences?: string[];
      placements?: string[];
    }>(),
    aiSuggestions: jsonb("ai_suggestions").$type<{
      headlines?: string[];
      descriptions?: string[];
      targetingTips?: string[];
      budgetRecommendation?: { daily: number; reason: string };
    }>(),
    createdByUserId: varchar("created_by_user_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ad_campaign_org").on(table.orgId),
    index("idx_ad_campaign_account").on(table.adAccountId),
    index("idx_ad_campaign_status").on(table.status),
  ],
);

// ─── Ad Creatives ──────────────────────────────────────────────────────────
/**
 * Creative assets (headlines, descriptions, images, videos) for campaigns.
 * AI can generate and A/B test variations.
 */
export const adCreatives = pgTable(
  "ad_creatives",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: varchar("type", { length: 30 }).notNull(), // "text" | "image" | "video" | "carousel" | "responsive"
    headline: text("headline"),
    description: text("description"),
    callToAction: varchar("call_to_action", { length: 50 }),
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
    thumbnailUrl: text("thumbnail_url"),
    variants: jsonb("variants").$type<Array<{
      id: string;
      headline?: string;
      description?: string;
      mediaUrl?: string;
      isControl: boolean;
    }>>().default([]),
    performanceScore: numeric("performance_score", { precision: 5, scale: 2 }),
    isAiGenerated: boolean("is_ai_generated").default(false),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // "draft" | "active" | "paused" | "rejected"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ad_creative_campaign").on(table.campaignId),
    index("idx_ad_creative_org").on(table.orgId),
  ],
);

// ─── Ad Metrics ────────────────────────────────────────────────────────────
/**
 * Daily performance metrics per campaign per platform.
 * Synced periodically from ad platforms via Inngest.
 */
export const adMetrics = pgTable(
  "ad_metrics",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    adAccountId: integer("ad_account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 30 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    conversions: integer("conversions").default(0),
    spend: numeric("spend", { precision: 12, scale: 2 }).default("0"),
    revenue: numeric("revenue", { precision: 12, scale: 2 }).default("0"),
    ctr: numeric("ctr", { precision: 8, scale: 4 }), // click-through rate
    cpc: numeric("cpc", { precision: 10, scale: 4 }), // cost per click
    cpa: numeric("cpa", { precision: 10, scale: 4 }), // cost per acquisition
    roas: numeric("roas", { precision: 10, scale: 4 }), // return on ad spend
    reach: integer("reach").default(0),
    frequency: numeric("frequency", { precision: 6, scale: 2 }),
    videoViews: integer("video_views").default(0),
    engagements: integer("engagements").default(0),
    creativeBreakdown: jsonb("creative_breakdown").$type<Array<{
      creativeId: number;
      impressions: number;
      clicks: number;
      conversions: number;
      spend: number;
    }>>(),
    rawData: jsonb("raw_data"), // Full API response for debugging
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_metrics_campaign_date").on(table.campaignId, table.date),
    index("idx_ad_metrics_account").on(table.adAccountId),
    index("idx_ad_metrics_platform_date").on(table.platform, table.date),
  ],
);

// ─── Ad Optimization Logs ──────────────────────────────────────────────────
/**
 * AI-driven optimization recommendations and auto-applied changes.
 */
export const adOptimizationLogs = pgTable(
  "ad_optimization_logs",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    // "budget" | "targeting" | "creative" | "bidding" | "schedule" | "pause"
    mode: varchar("mode", { length: 20 }).notNull(), // "recommend" | "auto"
    recommendation: text("recommendation").notNull(),
    details: jsonb("details").$type<{
      currentValue?: unknown;
      suggestedValue?: unknown;
      expectedImpact?: string;
      confidence?: number;
      reasoning?: string;
    }>(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // "pending" | "applied" | "dismissed" | "expired"
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedByUserId: varchar("applied_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_opt_campaign").on(table.campaignId),
    index("idx_ad_opt_org").on(table.orgId),
    index("idx_ad_opt_status").on(table.status),
  ],
);

// ─── Ad Reports ────────────────────────────────────────────────────────────
/**
 * Scheduled or on-demand ad performance reports.
 */
export const adReports = pgTable(
  "ad_reports",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    reportType: varchar("report_type", { length: 30 }).notNull(),
    // "performance" | "comparison" | "trend" | "roi" | "creative_analysis"
    campaignIds: jsonb("campaign_ids").$type<number[]>().default([]),
    dateRange: jsonb("date_range").$type<{ from: string; to: string }>().notNull(),
    metrics: jsonb("metrics").$type<string[]>().default([]),
    // Which metrics to include: "impressions", "clicks", "spend", etc.
    generatedContent: jsonb("generated_content").$type<{
      summary?: string;
      insights?: string[];
      recommendations?: string[];
      charts?: Array<{ type: string; title: string; data: unknown }>;
    }>(),
    fileUrl: text("file_url"), // Link to exported PDF/CSV
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // "pending" | "generating" | "ready" | "failed"
    createdByUserId: varchar("created_by_user_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_report_org").on(table.orgId),
    index("idx_ad_report_status").on(table.status),
  ],
);

// ─── Insert schemas ────────────────────────────────────────────────────────

export const insertAdAccountSchema = createInsertSchema(adAccounts).omit({
  id: true, createdAt: true, updatedAt: true, lastSyncAt: true,
});

export const insertAdCampaignSchema = createInsertSchema(adCampaigns).omit({
  id: true, createdAt: true, updatedAt: true, publishedAt: true,
});

export const insertAdCreativeSchema = createInsertSchema(adCreatives).omit({
  id: true, createdAt: true, updatedAt: true,
});

export const insertAdReportSchema = createInsertSchema(adReports).omit({
  id: true, createdAt: true, completedAt: true,
});

// ─── Types ─────────────────────────────────────────────────────────────────

export type AdAccount = typeof adAccounts.$inferSelect;
export type InsertAdAccount = z.infer<typeof insertAdAccountSchema>;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = z.infer<typeof insertAdCampaignSchema>;
export type AdCreative = typeof adCreatives.$inferSelect;
export type InsertAdCreative = z.infer<typeof insertAdCreativeSchema>;
export type AdMetric = typeof adMetrics.$inferSelect;
export type AdOptimizationLog = typeof adOptimizationLogs.$inferSelect;
export type AdReport = typeof adReports.$inferSelect;
export type InsertAdReport = z.infer<typeof insertAdReportSchema>;
