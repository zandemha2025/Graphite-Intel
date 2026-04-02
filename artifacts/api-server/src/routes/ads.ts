/**
 * Paid Ads Module — Full CRUD for ad accounts, campaigns, creatives,
 * metrics retrieval, optimization, and report generation.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  adAccounts,
  adCampaigns,
  adCreatives,
  adMetrics,
  adOptimizationLogs,
  adReports,
} from "@workspace/db";
import { eq, and, desc, sql, between, inArray } from "drizzle-orm";
import { inngest } from "../inngest/client";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// AD ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /ads/accounts — List connected ad accounts */
router.get("/ads/accounts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const accounts = await db
      .select()
      .from(adAccounts)
      .where(eq(adAccounts.orgId, orgId))
      .orderBy(desc(adAccounts.createdAt));

    res.json(accounts);
  } catch (err) {
    req.log.error({ err }, "Failed to list ad accounts");
    res.status(500).json({ error: "Failed to list ad accounts" });
  }
});

/** POST /ads/accounts — Connect a new ad account */
router.post("/ads/accounts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const { platform, externalAccountId, accountName, accessToken, refreshToken, tokenExpiresAt, currency, timezone } = req.body;

    if (!platform || !externalAccountId || !accountName) {
      res.status(400).json({ error: "platform, externalAccountId, and accountName are required" });
      return;
    }

    const [account] = await db
      .insert(adAccounts)
      .values({
        orgId,
        platform,
        externalAccountId,
        accountName,
        accessToken: accessToken ?? null,
        refreshToken: refreshToken ?? null,
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        currency: currency ?? "USD",
        timezone: timezone ?? "America/New_York",
      })
      .returning();

    res.status(201).json(account);
  } catch (err) {
    req.log.error({ err }, "Failed to create ad account");
    res.status(500).json({ error: "Failed to create ad account" });
  }
});

/** DELETE /ads/accounts/:id — Disconnect an ad account */
router.delete("/ads/accounts/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    await db
      .update(adAccounts)
      .set({ status: "disconnected", accessToken: null, refreshToken: null })
      .where(and(eq(adAccounts.id, id), eq(adAccounts.orgId, orgId)));

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect ad account");
    res.status(500).json({ error: "Failed to disconnect ad account" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /ads/campaigns — List campaigns (filterable by status) */
router.get("/ads/campaigns", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const status = req.query.status as string | undefined;
    const conditions = [eq(adCampaigns.orgId, orgId)];
    if (status) conditions.push(eq(adCampaigns.status, status));

    const campaigns = await db
      .select()
      .from(adCampaigns)
      .where(and(...conditions))
      .orderBy(desc(adCampaigns.updatedAt));

    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

/** GET /ads/campaigns/:id — Get campaign detail with creatives and recent metrics */
router.get("/ads/campaigns/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.orgId, orgId)));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const creatives = await db
      .select()
      .from(adCreatives)
      .where(eq(adCreatives.campaignId, id));

    // Last 30 days of metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await db
      .select()
      .from(adMetrics)
      .where(
        and(
          eq(adMetrics.campaignId, id),
          sql`${adMetrics.date} >= ${thirtyDaysAgo}`,
        ),
      )
      .orderBy(desc(adMetrics.date));

    // Recent optimization logs
    const optimizations = await db
      .select()
      .from(adOptimizationLogs)
      .where(eq(adOptimizationLogs.campaignId, id))
      .orderBy(desc(adOptimizationLogs.createdAt))
      .limit(10);

    res.json({ campaign, creatives, metrics, optimizations });
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign detail");
    res.status(500).json({ error: "Failed to get campaign detail" });
  }
});

/** POST /ads/campaigns — Create a new campaign */
router.post("/ads/campaigns", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { name, objective, adAccountId, budgetDaily, budgetTotal, currency, startDate, endDate, targeting, platforms } = req.body;

    if (!name) {
      res.status(400).json({ error: "Campaign name is required" });
      return;
    }

    const [campaign] = await db
      .insert(adCampaigns)
      .values({
        orgId,
        name,
        objective: objective ?? "awareness",
        adAccountId: adAccountId ?? null,
        budgetDaily: budgetDaily ?? null,
        budgetTotal: budgetTotal ?? null,
        currency: currency ?? "USD",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targeting: targeting ?? null,
        platforms: platforms ?? [],
        createdByUserId: userId,
      })
      .returning();

    res.status(201).json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/** PATCH /ads/campaigns/:id — Update campaign */
router.patch("/ads/campaigns/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const fields = req.body;
    const [updated] = await db
      .update(adCampaigns)
      .set({
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.objective !== undefined && { objective: fields.objective }),
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.budgetDaily !== undefined && { budgetDaily: fields.budgetDaily }),
        ...(fields.budgetTotal !== undefined && { budgetTotal: fields.budgetTotal }),
        ...(fields.startDate !== undefined && { startDate: fields.startDate ? new Date(fields.startDate) : null }),
        ...(fields.endDate !== undefined && { endDate: fields.endDate ? new Date(fields.endDate) : null }),
        ...(fields.targeting !== undefined && { targeting: fields.targeting }),
        ...(fields.platforms !== undefined && { platforms: fields.platforms }),
      })
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.orgId, orgId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

/** POST /ads/campaigns/:id/publish — Publish campaign to platforms */
router.post("/ads/campaigns/:id/publish", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const { platforms } = req.body;
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      res.status(400).json({ error: "platforms array is required" });
      return;
    }

    await db
      .update(adCampaigns)
      .set({ status: "pending_review" })
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.orgId, orgId)));

    await inngest.send({
      name: "ads/campaign.publish",
      data: { campaignId: id, orgId, platforms },
    });

    res.json({ message: "Campaign publish initiated", campaignId: id });
  } catch (err) {
    req.log.error({ err }, "Failed to publish campaign");
    res.status(500).json({ error: "Failed to publish campaign" });
  }
});

/** POST /ads/campaigns/:id/ai-suggestions — Generate AI suggestions for campaign */
router.post("/ads/campaigns/:id/ai-suggestions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(and(eq(adCampaigns.id, id), eq(adCampaigns.orgId, orgId)));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert advertising copywriter and strategist. Generate creative suggestions for an ad campaign. Output valid JSON with: "headlines" (array of 5 strings), "descriptions" (array of 3 strings), "targetingTips" (array of 3 strings), "budgetRecommendation" (object with "daily" number and "reason" string).`,
        },
        {
          role: "user",
          content: `Generate ad suggestions for:
Campaign: ${campaign.name}
Objective: ${campaign.objective}
Current targeting: ${JSON.stringify(campaign.targeting ?? {})}
Current budget: $${campaign.budgetDaily ?? "not set"}/day`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const suggestions = JSON.parse(response.choices[0]?.message?.content ?? "{}");

    await db
      .update(adCampaigns)
      .set({ aiSuggestions: suggestions })
      .where(eq(adCampaigns.id, id));

    res.json(suggestions);
  } catch (err) {
    req.log.error({ err }, "Failed to generate AI suggestions");
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CREATIVES
// ═══════════════════════════════════════════════════════════════════════════

/** POST /ads/campaigns/:id/creatives — Add a creative to a campaign */
router.post("/ads/campaigns/:campaignId/creatives", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const campaignId = parseInt(req.params.campaignId as string);

  try {
    const { name, type, headline, description, callToAction, mediaUrls, isAiGenerated } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: "name and type are required" });
      return;
    }

    const [creative] = await db
      .insert(adCreatives)
      .values({
        campaignId,
        orgId,
        name,
        type,
        headline: headline ?? null,
        description: description ?? null,
        callToAction: callToAction ?? null,
        mediaUrls: mediaUrls ?? [],
        isAiGenerated: isAiGenerated ?? false,
      })
      .returning();

    res.status(201).json(creative);
  } catch (err) {
    req.log.error({ err }, "Failed to create creative");
    res.status(500).json({ error: "Failed to create creative" });
  }
});

/** DELETE /ads/creatives/:id — Remove a creative */
router.delete("/ads/creatives/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    await db
      .delete(adCreatives)
      .where(and(eq(adCreatives.id, id), eq(adCreatives.orgId, orgId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete creative");
    res.status(500).json({ error: "Failed to delete creative" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// METRICS & SYNC
// ═══════════════════════════════════════════════════════════════════════════

/** POST /ads/accounts/:id/sync — Trigger metrics sync for an account */
router.post("/ads/accounts/:id/sync", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const { from, to } = req.body;
    const dateRange = {
      from: from ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
      to: to ?? new Date().toISOString().split("T")[0],
    };

    await inngest.send({
      name: "ads/metrics.sync",
      data: { adAccountId: id, orgId, dateRange },
    });

    res.json({ message: "Metrics sync initiated", adAccountId: id, dateRange });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger metrics sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

/** GET /ads/metrics/overview — Aggregate metrics across all campaigns */
router.get("/ads/metrics/overview", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const days = parseInt((req.query.days as string) ?? "30");
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get campaign IDs for this org
    const orgCampaigns = await db
      .select({ id: adCampaigns.id })
      .from(adCampaigns)
      .where(eq(adCampaigns.orgId, orgId));

    const campaignIds = orgCampaigns.map((c) => c.id);
    if (campaignIds.length === 0) {
      res.json({ totalSpend: 0, totalRevenue: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0, avgCTR: 0, avgROAS: 0, dailyMetrics: [] });
      return;
    }

    const dailyAgg = await db
      .select({
        date: adMetrics.date,
        totalImpressions: sql<number>`sum(${adMetrics.impressions})`,
        totalClicks: sql<number>`sum(${adMetrics.clicks})`,
        totalConversions: sql<number>`sum(${adMetrics.conversions})`,
        totalSpend: sql<number>`sum(${adMetrics.spend}::numeric)`,
        totalRevenue: sql<number>`sum(${adMetrics.revenue}::numeric)`,
      })
      .from(adMetrics)
      .where(
        and(
          inArray(adMetrics.campaignId, campaignIds),
          sql`${adMetrics.date} >= ${fromDate}`,
        ),
      )
      .groupBy(adMetrics.date)
      .orderBy(adMetrics.date);

    const totals = dailyAgg.reduce(
      (acc, d) => ({
        totalSpend: acc.totalSpend + Number(d.totalSpend ?? 0),
        totalRevenue: acc.totalRevenue + Number(d.totalRevenue ?? 0),
        totalImpressions: acc.totalImpressions + Number(d.totalImpressions ?? 0),
        totalClicks: acc.totalClicks + Number(d.totalClicks ?? 0),
        totalConversions: acc.totalConversions + Number(d.totalConversions ?? 0),
      }),
      { totalSpend: 0, totalRevenue: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0 },
    );

    res.json({
      ...totals,
      avgCTR: totals.totalClicks / (totals.totalImpressions || 1),
      avgROAS: totals.totalRevenue / (totals.totalSpend || 1),
      dailyMetrics: dailyAgg,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get metrics overview");
    res.status(500).json({ error: "Failed to get metrics overview" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════

/** POST /ads/campaigns/:id/optimize — Trigger AI optimization */
router.post("/ads/campaigns/:id/optimize", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const mode = (req.body.mode as string) ?? "recommend";

    await inngest.send({
      name: "ads/optimize.run",
      data: { campaignId: id, orgId, mode: mode as "recommend" | "auto" },
    });

    res.json({ message: "Optimization initiated", campaignId: id, mode });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger optimization");
    res.status(500).json({ error: "Failed to trigger optimization" });
  }
});

/** GET /ads/optimizations — List optimization recommendations */
router.get("/ads/optimizations", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const status = req.query.status as string | undefined;
    const conditions = [eq(adOptimizationLogs.orgId, orgId)];
    if (status) conditions.push(eq(adOptimizationLogs.status, status));

    const logs = await db
      .select()
      .from(adOptimizationLogs)
      .where(and(...conditions))
      .orderBy(desc(adOptimizationLogs.createdAt))
      .limit(50);

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Failed to list optimizations");
    res.status(500).json({ error: "Failed to list optimizations" });
  }
});

/** PATCH /ads/optimizations/:id — Apply or dismiss a recommendation */
router.patch("/ads/optimizations/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const { status } = req.body; // "applied" | "dismissed"
    if (!["applied", "dismissed"].includes(status)) {
      res.status(400).json({ error: "status must be 'applied' or 'dismissed'" });
      return;
    }

    const [updated] = await db
      .update(adOptimizationLogs)
      .set({
        status,
        appliedAt: status === "applied" ? new Date() : null,
        appliedByUserId: status === "applied" ? req.user!.id : null,
      })
      .where(and(eq(adOptimizationLogs.id, id), eq(adOptimizationLogs.orgId, orgId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Optimization not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update optimization");
    res.status(500).json({ error: "Failed to update optimization" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

/** GET /ads/reports — List ad reports */
router.get("/ads/reports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const reports = await db
      .select()
      .from(adReports)
      .where(eq(adReports.orgId, orgId))
      .orderBy(desc(adReports.createdAt));

    res.json(reports);
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Failed to list reports" });
  }
});

/** POST /ads/reports — Generate a new report */
router.post("/ads/reports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { name, reportType, campaignIds, dateRange, metrics } = req.body;

    if (!reportType || !dateRange?.from || !dateRange?.to) {
      res.status(400).json({ error: "reportType and dateRange (from, to) are required" });
      return;
    }

    const [report] = await db
      .insert(adReports)
      .values({
        orgId,
        name: name ?? `${reportType} Report`,
        reportType,
        campaignIds: campaignIds ?? [],
        dateRange,
        metrics: metrics ?? [],
        createdByUserId: userId,
      })
      .returning();

    // Trigger async report generation
    await inngest.send({
      name: "ads/report.generate",
      data: {
        orgId,
        reportType,
        campaignIds: campaignIds ?? [],
        dateRange,
      },
    });

    res.status(201).json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to create report");
    res.status(500).json({ error: "Failed to create report" });
  }
});

/** GET /ads/reports/:id — Get report detail */
router.get("/ads/reports/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  try {
    const [report] = await db
      .select()
      .from(adReports)
      .where(and(eq(adReports.id, id), eq(adReports.orgId, orgId)));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    res.status(500).json({ error: "Failed to get report" });
  }
});

export { router as adsRouter };
export default router;
