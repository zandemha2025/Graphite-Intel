/**
 * Inngest function: ads/campaign.publish
 * Publishes a campaign to one or more ad platforms.
 *
 * Flow:
 * 1. Load campaign + creatives from DB
 * 2. Validate campaign is ready (has budget, dates, targeting, creatives)
 * 3. For each target platform, call the platform's API to create the campaign
 * 4. Store external campaign IDs and update status to "active"
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adCampaigns, adCreatives, adAccounts } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";

export const adsCampaignPublishFunction = inngest.createFunction(
  { id: "ads-campaign-publish", retries: 2 },
  { event: "ads/campaign.publish" },
  async ({ event, step }) => {
    const { campaignId, orgId, platforms } = event.data;

    // Step 1: Load campaign and creatives
    const campaign = await step.run("load-campaign", async () => {
      const [c] = await db
        .select()
        .from(adCampaigns)
        .where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.orgId, orgId)));

      if (!c) throw new Error(`Campaign ${campaignId} not found`);
      if (c.status !== "draft" && c.status !== "paused") {
        throw new Error(`Campaign ${campaignId} is in status "${c.status}", cannot publish`);
      }

      return c;
    });

    const creatives = await step.run("load-creatives", async () => {
      return db
        .select()
        .from(adCreatives)
        .where(eq(adCreatives.campaignId, campaignId));
    });

    // Step 2: Validate campaign readiness
    await step.run("validate-campaign", async () => {
      const errors: string[] = [];

      if (!campaign.budgetDaily && !campaign.budgetTotal) {
        errors.push("Campaign must have a daily or total budget");
      }
      if (!campaign.startDate) {
        errors.push("Campaign must have a start date");
      }
      if (creatives.length === 0) {
        errors.push("Campaign must have at least one creative");
      }

      if (errors.length > 0) {
        await db
          .update(adCampaigns)
          .set({ status: "draft" })
          .where(eq(adCampaigns.id, campaignId));
        throw new Error(`Campaign validation failed: ${errors.join("; ")}`);
      }
    });

    // Step 3: Publish to each platform
    const externalIds: Record<string, string> = {};

    for (const platform of platforms) {
      const externalId = await step.run(`publish-to-${platform}`, async () => {
        // Load the ad account for this platform
        const [account] = await db
          .select()
          .from(adAccounts)
          .where(
            and(
              eq(adAccounts.orgId, orgId),
              eq(adAccounts.platform, platform),
              eq(adAccounts.status, "active"),
            ),
          );

        if (!account) {
          logger.warn({ platform, orgId }, "No active ad account for platform, skipping");
          return null;
        }

        // Platform-specific publish logic
        // In production, this would call the actual platform APIs.
        // For now, we generate a mock external ID.
        logger.info(
          { campaignId, platform, accountId: account.id },
          "Publishing campaign to platform",
        );

        // TODO: Implement actual platform API calls
        // - Google Ads: google-ads-api campaign creation
        // - Meta: Marketing API campaign creation
        // - LinkedIn: Campaign Manager API
        // - TikTok: TikTok Ads API
        const mockExternalId = `${platform}_${Date.now()}_${campaignId}`;

        return mockExternalId;
      });

      if (externalId) {
        externalIds[platform] = externalId;
      }
    }

    // Step 4: Update campaign status
    await step.run("update-campaign-status", async () => {
      const existingExternalIds =
        (campaign.externalCampaignIds as Record<string, string>) ?? {};

      await db
        .update(adCampaigns)
        .set({
          status: "active",
          publishedAt: new Date(),
          platforms: platforms,
          externalCampaignIds: { ...existingExternalIds, ...externalIds },
        })
        .where(eq(adCampaigns.id, campaignId));
    });

    return {
      campaignId,
      publishedPlatforms: Object.keys(externalIds),
      externalIds,
    };
  },
);
