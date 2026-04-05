/**
 * Inngest function: ads/campaign.publish
 * Publishes a campaign to one or more ad platforms.
 *
 * Flow:
 * 1. Load campaign + creatives from DB
 * 2. Validate campaign is ready (has budget, dates, targeting, creatives)
 * 3. For each target platform, call the platform's API to create the campaign
 * 4. Store external campaign IDs and update status to "active"
 *
 * --- SIMULATION MODE ---
 * Currently operates in simulation mode: validates all data, generates mock
 * external IDs, and updates the DB as if a real publish occurred. This allows
 * the full UI flow to be tested end-to-end. When real API credentials are
 * configured, replace the simulatePlatformPublish() calls with actual SDK calls.
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adCampaigns, adCreatives, adAccounts } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Platform publish interface
// When real API integrations are added, each adapter should implement this.
// ---------------------------------------------------------------------------

/** Result returned by a platform publish operation (real or simulated). */
interface PlatformPublishResult {
  success: boolean;
  externalCampaignId: string | null;
  platform: string;
  error?: string;
}

/**
 * Platform-specific validation rules.
 * Each platform has different requirements for creatives, budgets, etc.
 */
const PLATFORM_CONSTRAINTS: Record<
  string,
  {
    minDailyBudget: number;
    requiredCreativeTypes: string[];
    maxHeadlineLength: number;
    maxDescriptionLength: number;
    label: string;
  }
> = {
  facebook: {
    minDailyBudget: 1.0,
    requiredCreativeTypes: ["image", "video", "carousel", "responsive"],
    maxHeadlineLength: 40,
    maxDescriptionLength: 125,
    label: "Meta Ads",
  },
  google: {
    minDailyBudget: 1.0,
    requiredCreativeTypes: ["text", "responsive", "image"],
    maxHeadlineLength: 30,
    maxDescriptionLength: 90,
    label: "Google Ads",
  },
  tiktok: {
    minDailyBudget: 20.0,
    requiredCreativeTypes: ["video"],
    maxHeadlineLength: 100,
    maxDescriptionLength: 100,
    label: "TikTok Ads",
  },
  linkedin: {
    minDailyBudget: 10.0,
    requiredCreativeTypes: ["text", "image", "video", "carousel"],
    maxHeadlineLength: 70,
    maxDescriptionLength: 150,
    label: "LinkedIn Campaign Manager",
  },
};

/**
 * Validates a campaign's creatives against a specific platform's requirements.
 * Returns an array of warning/error strings (empty = valid).
 */
function validateCreativesForPlatform(
  platform: string,
  creatives: Array<{
    type: string;
    headline: string | null;
    description: string | null;
    mediaUrls: string[] | null;
  }>,
): string[] {
  const constraints = PLATFORM_CONSTRAINTS[platform];
  if (!constraints) return [`Unknown platform: ${platform}`];

  const warnings: string[] = [];

  // Check that at least one creative has a type the platform supports
  const hasCompatibleCreative = creatives.some((c) =>
    constraints.requiredCreativeTypes.includes(c.type),
  );
  if (!hasCompatibleCreative) {
    warnings.push(
      `${constraints.label} requires at least one creative of type: ${constraints.requiredCreativeTypes.join(", ")}`,
    );
  }

  // Validate headline/description lengths
  for (const creative of creatives) {
    if (creative.headline && creative.headline.length > constraints.maxHeadlineLength) {
      warnings.push(
        `Creative headline "${creative.headline.slice(0, 20)}..." exceeds ${constraints.label} limit of ${constraints.maxHeadlineLength} chars`,
      );
    }
    if (creative.description && creative.description.length > constraints.maxDescriptionLength) {
      warnings.push(
        `Creative description exceeds ${constraints.label} limit of ${constraints.maxDescriptionLength} chars`,
      );
    }
  }

  return warnings;
}

/**
 * Simulate publishing a campaign to a platform.
 *
 * -----------------------------------------------------------------------
 * REAL API INTEGRATION POINT
 * -----------------------------------------------------------------------
 * Replace this function body with actual platform SDK calls:
 *
 * - Google Ads:  Use `google-ads-api` npm package
 *   const client = new GoogleAdsApi({ client_id, client_secret, developer_token });
 *   const customer = client.Customer({ customer_id, refresh_token });
 *   const campaign = await customer.campaigns.create({ ... });
 *   return { success: true, externalCampaignId: campaign.resource_name };
 *
 * - Meta (Facebook):  Use `facebook-nodejs-business-sdk`
 *   const adAccount = new AdAccount(`act_${accountId}`);
 *   const campaign = await adAccount.createCampaign([], { name, objective, ... });
 *   return { success: true, externalCampaignId: campaign.id };
 *
 * - LinkedIn:  Use LinkedIn Campaign Manager REST API
 *   POST https://api.linkedin.com/rest/adCampaigns
 *   Authorization: Bearer {accessToken}
 *
 * - TikTok:  Use TikTok Marketing API
 *   POST https://business-api.tiktok.com/open_api/v1.3/campaign/create/
 * -----------------------------------------------------------------------
 */
function simulatePlatformPublish(
  platform: string,
  campaignId: number,
  accountExternalId: string,
  _campaignData: {
    name: string;
    objective: string;
    budgetDaily: string | null;
    budgetTotal: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    targeting: unknown;
  },
  _creatives: Array<{ id: number; type: string; headline: string | null }>,
): PlatformPublishResult {
  // Generate a realistic-looking external campaign ID per platform
  const ts = Date.now();
  const idMap: Record<string, () => string> = {
    facebook: () => `fb_camp_${accountExternalId}_${ts}`,
    google: () => `customers/${accountExternalId}/campaigns/${ts}`,
    tiktok: () => `tt_camp_${ts}_${campaignId}`,
    linkedin: () => `urn:li:sponsoredCampaign:${ts}`,
  };

  const generator = idMap[platform];
  if (!generator) {
    return {
      success: false,
      externalCampaignId: null,
      platform,
      error: `Unsupported platform: ${platform}`,
    };
  }

  return {
    success: true,
    externalCampaignId: generator(),
    platform,
  };
}

// ---------------------------------------------------------------------------
// Inngest function
// ---------------------------------------------------------------------------

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
      if (c.status !== "draft" && c.status !== "paused" && c.status !== "pending_review") {
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

    // Step 2: Validate campaign readiness (general + per-platform)
    const validationWarnings = await step.run("validate-campaign", async () => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // General validation
      if (!campaign.budgetDaily && !campaign.budgetTotal) {
        errors.push("Campaign must have a daily or total budget");
      }
      if (!campaign.startDate) {
        errors.push("Campaign must have a start date");
      }
      if (creatives.length === 0) {
        errors.push("Campaign must have at least one creative");
      }
      if (campaign.startDate && new Date(campaign.startDate) < new Date()) {
        warnings.push("Campaign start date is in the past; platform may reject or start immediately");
      }
      if (campaign.endDate && campaign.startDate && new Date(campaign.endDate) <= new Date(campaign.startDate)) {
        errors.push("Campaign end date must be after start date");
      }

      // Per-platform validation
      for (const platform of platforms) {
        const constraints = PLATFORM_CONSTRAINTS[platform];
        if (!constraints) {
          errors.push(`Unsupported platform: ${platform}`);
          continue;
        }

        const dailyBudget = campaign.budgetDaily ? parseFloat(campaign.budgetDaily) : 0;
        if (dailyBudget > 0 && dailyBudget < constraints.minDailyBudget) {
          errors.push(
            `${constraints.label} requires a minimum daily budget of $${constraints.minDailyBudget.toFixed(2)} (current: $${dailyBudget.toFixed(2)})`,
          );
        }

        const creativeWarnings = validateCreativesForPlatform(
          platform,
          creatives.map((c) => ({
            type: c.type,
            headline: c.headline,
            description: c.description,
            mediaUrls: c.mediaUrls as string[] | null,
          })),
        );
        warnings.push(...creativeWarnings);
      }

      if (errors.length > 0) {
        // Reset status back to draft on hard failure
        await db
          .update(adCampaigns)
          .set({ status: "draft" })
          .where(eq(adCampaigns.id, campaignId));
        throw new Error(`Campaign validation failed: ${errors.join("; ")}`);
      }

      if (warnings.length > 0) {
        logger.warn(
          { campaignId, warnings },
          "Campaign published with warnings",
        );
      }

      return warnings;
    });

    // Step 3: Publish to each platform
    const externalIds: Record<string, string> = {};
    const publishResults: PlatformPublishResult[] = [];

    for (const platform of platforms) {
      const result = await step.run(`publish-to-${platform}`, async () => {
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
          return {
            success: false,
            externalCampaignId: null,
            platform,
            error: "No active ad account",
          } as PlatformPublishResult;
        }

        logger.info(
          { campaignId, platform, accountId: account.id },
          "Publishing campaign to platform (simulation mode)",
        );

        // ---------------------------------------------------------------
        // SIMULATION: Replace with real API calls when credentials exist.
        // See simulatePlatformPublish() for the expected interface.
        // ---------------------------------------------------------------
        const publishResult = simulatePlatformPublish(
          platform,
          campaignId,
          account.externalAccountId,
          {
            name: campaign.name,
            objective: campaign.objective,
            budgetDaily: campaign.budgetDaily,
            budgetTotal: campaign.budgetTotal,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            targeting: campaign.targeting,
          },
          creatives.map((c) => ({ id: c.id, type: c.type, headline: c.headline })),
        );

        if (publishResult.success) {
          logger.info(
            {
              campaignId,
              platform,
              externalId: publishResult.externalCampaignId,
            },
            "Campaign published to platform successfully",
          );
        } else {
          logger.error(
            { campaignId, platform, error: publishResult.error },
            "Failed to publish campaign to platform",
          );
        }

        return publishResult;
      });

      publishResults.push(result);
      if (result.success && result.externalCampaignId) {
        externalIds[platform] = result.externalCampaignId;
      }
    }

    // Step 4: Update campaign status
    const publishedCount = Object.keys(externalIds).length;

    await step.run("update-campaign-status", async () => {
      const existingExternalIds =
        (campaign.externalCampaignIds as Record<string, string>) ?? {};

      // Only set to "active" if at least one platform succeeded
      const newStatus = publishedCount > 0 ? "active" : "draft";

      await db
        .update(adCampaigns)
        .set({
          status: newStatus,
          publishedAt: publishedCount > 0 ? new Date() : (campaign.publishedAt ? new Date(campaign.publishedAt) : null),
          platforms: platforms,
          externalCampaignIds: { ...existingExternalIds, ...externalIds },
        })
        .where(eq(adCampaigns.id, campaignId));

      if (newStatus === "draft") {
        logger.warn(
          { campaignId, platforms },
          "No platforms succeeded; campaign remains in draft",
        );
      }
    });

    logger.info(
      {
        campaignId,
        publishedPlatforms: Object.keys(externalIds),
        failedPlatforms: publishResults.filter((r) => !r.success).map((r) => r.platform),
        validationWarnings,
      },
      "Campaign publish complete",
    );

    return {
      campaignId,
      publishedPlatforms: Object.keys(externalIds),
      failedPlatforms: publishResults
        .filter((r) => !r.success)
        .map((r) => ({ platform: r.platform, error: r.error })),
      externalIds,
      validationWarnings,
    };
  },
);
