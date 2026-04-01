/**
 * Inngest function: ads/metrics.sync
 * Syncs performance metrics from ad platforms into the ad_metrics table.
 *
 * Flow:
 * 1. Load the ad account and its active campaigns
 * 2. For each campaign, fetch metrics from the platform API for the date range
 * 3. Upsert daily metric rows
 * 4. Update computed fields (CTR, CPC, CPA, ROAS)
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adAccounts, adCampaigns, adMetrics } from "@workspace/db";
import { eq, and, between } from "drizzle-orm";
import { logger } from "../../lib/logger";

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
          // TODO: Replace with actual platform API calls
          // For now, generate representative mock data for the date range
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          const days: Date[] = [];

          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
          }

          let upserted = 0;

          for (const day of days) {
            // Mock metrics — in production, fetched from platform API
            const impressions = Math.floor(Math.random() * 10000) + 500;
            const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
            const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.02));
            const spend = parseFloat((Math.random() * 200 + 10).toFixed(2));
            const revenue = parseFloat((conversions * (Math.random() * 50 + 10)).toFixed(2));

            const ctr = clicks / (impressions || 1);
            const cpc = spend / (clicks || 1);
            const cpa = spend / (conversions || 1);
            const roas = revenue / (spend || 1);

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

            if (existing) {
              await db
                .update(adMetrics)
                .set({
                  impressions,
                  clicks,
                  conversions,
                  spend: spend.toString(),
                  revenue: revenue.toString(),
                  ctr: ctr.toFixed(4),
                  cpc: cpc.toFixed(4),
                  cpa: cpa.toFixed(4),
                  roas: roas.toFixed(4),
                })
                .where(eq(adMetrics.id, existing.id));
            } else {
              await db.insert(adMetrics).values({
                campaignId: campaign.id,
                adAccountId: account.id,
                platform: account.platform,
                date: day,
                impressions,
                clicks,
                conversions,
                spend: spend.toString(),
                revenue: revenue.toString(),
                ctr: ctr.toFixed(4),
                cpc: cpc.toFixed(4),
                cpa: cpa.toFixed(4),
                roas: roas.toFixed(4),
              });
            }

            upserted++;
          }

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
