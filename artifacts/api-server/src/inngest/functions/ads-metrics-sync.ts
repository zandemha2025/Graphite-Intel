/**
 * Inngest function: ads/metrics.sync
 * Syncs performance metrics from ad platforms into the ad_metrics table.
 *
 * Flow:
 * 1. Load the ad account and its active campaigns
 * 2. For each campaign, fetch metrics from the platform API for the date range
 * 3. Upsert daily metric rows
 * 4. Update computed fields (CTR, CPC, CPA, ROAS)
 * 5. Update lastSyncAt on the ad account
 *
 * --- SIMULATION MODE ---
 * Currently generates realistic metrics based on campaign budget and runtime
 * rather than calling actual platform APIs. Metrics are deterministic for a
 * given (campaignId + date) pair so re-syncing the same range produces
 * consistent numbers. When real API credentials are configured, replace
 * generateSimulatedMetrics() with actual SDK fetches.
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adAccounts, adCampaigns, adMetrics } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Platform metrics interface
// ---------------------------------------------------------------------------

/** Raw metrics for a single day, as returned by a platform API (or simulation). */
interface DailyPlatformMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  reach: number;
  frequency: number;
  videoViews: number;
  engagements: number;
  /** Computed fields */
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

// ---------------------------------------------------------------------------
// Platform-specific metric profiles
// ---------------------------------------------------------------------------

/**
 * Each platform has characteristic performance ranges. These are based on
 * published industry benchmarks (WordStream, Databox, etc.) to make the
 * simulated data look realistic in dashboards and reports.
 */
const PLATFORM_PROFILES: Record<
  string,
  {
    /** Impressions per $1 of spend */
    impressionsPerDollar: { min: number; max: number };
    /** CTR as decimal (0.01 = 1%) */
    ctr: { min: number; max: number };
    /** Conversion rate from clicks */
    conversionRate: { min: number; max: number };
    /** Average revenue per conversion */
    revenuePerConversion: { min: number; max: number };
    /** Reach as fraction of impressions */
    reachFraction: { min: number; max: number };
    /** Video view rate (fraction of impressions) */
    videoViewRate: number;
    /** Engagement rate (fraction of impressions) */
    engagementRate: number;
  }
> = {
  facebook: {
    impressionsPerDollar: { min: 80, max: 200 },
    ctr: { min: 0.009, max: 0.025 },
    conversionRate: { min: 0.02, max: 0.10 },
    revenuePerConversion: { min: 15, max: 80 },
    reachFraction: { min: 0.6, max: 0.85 },
    videoViewRate: 0.15,
    engagementRate: 0.03,
  },
  google: {
    impressionsPerDollar: { min: 40, max: 120 },
    ctr: { min: 0.015, max: 0.035 },
    conversionRate: { min: 0.03, max: 0.12 },
    revenuePerConversion: { min: 20, max: 100 },
    reachFraction: { min: 0.7, max: 0.9 },
    videoViewRate: 0.10,
    engagementRate: 0.02,
  },
  tiktok: {
    impressionsPerDollar: { min: 100, max: 300 },
    ctr: { min: 0.008, max: 0.018 },
    conversionRate: { min: 0.01, max: 0.06 },
    revenuePerConversion: { min: 10, max: 50 },
    reachFraction: { min: 0.5, max: 0.75 },
    videoViewRate: 0.25,
    engagementRate: 0.05,
  },
  linkedin: {
    impressionsPerDollar: { min: 15, max: 60 },
    ctr: { min: 0.004, max: 0.012 },
    conversionRate: { min: 0.02, max: 0.08 },
    revenuePerConversion: { min: 50, max: 200 },
    reachFraction: { min: 0.65, max: 0.85 },
    videoViewRate: 0.12,
    engagementRate: 0.02,
  },
};

// ---------------------------------------------------------------------------
// Deterministic pseudo-random number generator (seeded)
// ---------------------------------------------------------------------------

/**
 * Simple seeded PRNG (mulberry32). Ensures the same (campaignId, date) pair
 * always produces the same metrics, so re-syncing a range is idempotent.
 */
function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a seeded random number in [min, max).
 */
function seededRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

// ---------------------------------------------------------------------------
// Simulated metrics generator
// ---------------------------------------------------------------------------

/**
 * Generate realistic-looking daily metrics for a campaign.
 *
 * -----------------------------------------------------------------------
 * REAL API INTEGRATION POINT
 * -----------------------------------------------------------------------
 * Replace this function with actual platform SDK calls:
 *
 * - Google Ads:  Use `google-ads-api`
 *   const report = await customer.report({
 *     entity: "campaign",
 *     attributes: ["campaign.id"],
 *     metrics: ["metrics.impressions", "metrics.clicks", ...],
 *     segments: ["segments.date"],
 *     from_date: dateStr,
 *     to_date: dateStr,
 *   });
 *   return mapGoogleMetrics(report);
 *
 * - Meta (Facebook):  Use Marketing API Insights endpoint
 *   GET /{campaign-id}/insights?fields=impressions,clicks,...&time_range={...}
 *
 * - LinkedIn:  Use Analytics Finder API
 *   GET /adAnalytics?q=analytics&campaigns=urn:li:sponsoredCampaign:{id}&...
 *
 * - TikTok:  Use Reporting API
 *   POST /open_api/v1.3/report/integrated/get/
 *   { "advertiser_id": "...", "report_type": "BASIC", ... }
 * -----------------------------------------------------------------------
 */
function generateSimulatedMetrics(
  platform: string,
  campaignId: number,
  day: Date,
  dailyBudget: number,
): DailyPlatformMetrics {
  const profile = PLATFORM_PROFILES[platform] ?? PLATFORM_PROFILES.facebook;

  // Create a deterministic seed from campaignId + date
  const dayStr = day.toISOString().slice(0, 10);
  let seed = campaignId * 31;
  for (let i = 0; i < dayStr.length; i++) {
    seed = (seed * 31 + dayStr.charCodeAt(i)) | 0;
  }
  const rand = seededRandom(seed);

  // Daily spend varies around the budget (+/- 15%)
  const spend = Math.max(
    0.01,
    dailyBudget * seededRange(rand, 0.85, 1.15),
  );

  // Impressions based on spend and platform CPM range
  const impressionsPerDollar = seededRange(
    rand,
    profile.impressionsPerDollar.min,
    profile.impressionsPerDollar.max,
  );
  const impressions = Math.round(spend * impressionsPerDollar);

  // CTR within platform's typical range
  const ctr = seededRange(rand, profile.ctr.min, profile.ctr.max);
  const clicks = Math.max(1, Math.round(impressions * ctr));

  // Conversion rate from clicks
  const convRate = seededRange(rand, profile.conversionRate.min, profile.conversionRate.max);
  const conversions = Math.round(clicks * convRate);

  // Revenue
  const revPerConv = seededRange(
    rand,
    profile.revenuePerConversion.min,
    profile.revenuePerConversion.max,
  );
  const revenue = conversions * revPerConv;

  // Engagement metrics
  const reachFraction = seededRange(rand, profile.reachFraction.min, profile.reachFraction.max);
  const reach = Math.round(impressions * reachFraction);
  const frequency = impressions / (reach || 1);
  const videoViews = Math.round(impressions * profile.videoViewRate * seededRange(rand, 0.8, 1.2));
  const engagements = Math.round(impressions * profile.engagementRate * seededRange(rand, 0.8, 1.2));

  // Computed metrics
  const cpc = spend / (clicks || 1);
  const cpa = spend / (conversions || 1);
  const roas = revenue / (spend || 1);

  return {
    impressions,
    clicks,
    conversions,
    spend: parseFloat(spend.toFixed(2)),
    revenue: parseFloat(revenue.toFixed(2)),
    reach,
    frequency: parseFloat(frequency.toFixed(2)),
    videoViews,
    engagements,
    ctr: parseFloat(ctr.toFixed(6)),
    cpc: parseFloat(cpc.toFixed(4)),
    cpa: parseFloat(cpa.toFixed(4)),
    roas: parseFloat(roas.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Inngest function
// ---------------------------------------------------------------------------

export const adsMetricsSyncFunction = inngest.createFunction(
  { id: "ads-metrics-sync", retries: 3 },
  { event: "ads/metrics.sync" },
  async ({ event, step }) => {
    const { adAccountId, orgId, dateRange } = event.data;

    // Step 1: Load account and campaigns
    const account = await step.run("load-account", async () => {
      const [acc] = await db
        .select()
        .from(adAccounts)
        .where(and(eq(adAccounts.id, adAccountId), eq(adAccounts.orgId, orgId)));

      if (!acc) throw new Error(`Ad account ${adAccountId} not found`);
      if (acc.status === "disconnected") {
        throw new Error(`Ad account ${adAccountId} is disconnected`);
      }

      return acc;
    });

    const campaigns = await step.run("load-campaigns", async () => {
      return db
        .select()
        .from(adCampaigns)
        .where(
          and(
            eq(adCampaigns.adAccountId, adAccountId),
            eq(adCampaigns.status, "active"),
          ),
        );
    });

    if (campaigns.length === 0) {
      return { synced: 0, message: "No active campaigns to sync" };
    }

    // Step 2: Fetch and store metrics for each campaign
    let totalMetricsUpserted = 0;

    for (const campaign of campaigns) {
      const metricsCount = await step.run(
        `sync-metrics-campaign-${campaign.id}`,
        async () => {
          // ---------------------------------------------------------------
          // SIMULATION: In production, this block would call the platform
          // API to fetch real metrics for the date range.
          // See generateSimulatedMetrics() header for the expected interface.
          // ---------------------------------------------------------------

          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          const days: Date[] = [];

          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
          }

          // Determine daily budget for realistic metric generation
          const dailyBudget = campaign.budgetDaily
            ? parseFloat(campaign.budgetDaily)
            : campaign.budgetTotal
              ? parseFloat(campaign.budgetTotal) / Math.max(days.length, 1)
              : 50; // Fallback: $50/day if no budget set

          let upserted = 0;

          for (const day of days) {
            const metrics = generateSimulatedMetrics(
              account.platform,
              campaign.id,
              day,
              dailyBudget,
            );

            // Check for existing metric row
            const [existing] = await db
              .select({ id: adMetrics.id })
              .from(adMetrics)
              .where(
                and(
                  eq(adMetrics.campaignId, campaign.id),
                  eq(adMetrics.platform, account.platform),
                  eq(adMetrics.date, day),
                ),
              );

            const metricValues = {
              impressions: metrics.impressions,
              clicks: metrics.clicks,
              conversions: metrics.conversions,
              spend: metrics.spend.toString(),
              revenue: metrics.revenue.toString(),
              ctr: metrics.ctr.toFixed(4),
              cpc: metrics.cpc.toFixed(4),
              cpa: metrics.cpa.toFixed(4),
              roas: metrics.roas.toFixed(4),
              reach: metrics.reach,
              frequency: metrics.frequency.toFixed(2),
              videoViews: metrics.videoViews,
              engagements: metrics.engagements,
              rawData: {
                source: "simulation",
                generatedAt: new Date().toISOString(),
                platform: account.platform,
                dailyBudgetUsed: dailyBudget,
              },
            };

            if (existing) {
              await db
                .update(adMetrics)
                .set(metricValues)
                .where(eq(adMetrics.id, existing.id));
            } else {
              await db.insert(adMetrics).values({
                campaignId: campaign.id,
                adAccountId: account.id,
                platform: account.platform,
                date: day,
                ...metricValues,
              });
            }

            upserted++;
          }

          logger.info(
            {
              campaignId: campaign.id,
              platform: account.platform,
              days: days.length,
              dailyBudget,
            },
            "Synced metrics for campaign (simulation mode)",
          );

          return upserted;
        },
      );

      totalMetricsUpserted += metricsCount;
    }

    // Step 3: Update account last sync timestamp
    await step.run("update-sync-timestamp", async () => {
      await db
        .update(adAccounts)
        .set({ lastSyncAt: new Date() })
        .where(eq(adAccounts.id, adAccountId));
    });

    logger.info(
      { adAccountId, campaigns: campaigns.length, metrics: totalMetricsUpserted },
      "Ad metrics sync complete",
    );

    return {
      adAccountId,
      campaignsSynced: campaigns.length,
      metricsUpserted: totalMetricsUpserted,
    };
  },
);
