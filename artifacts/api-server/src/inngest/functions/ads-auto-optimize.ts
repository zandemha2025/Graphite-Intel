/**
 * Inngest function: ads/optimize.run
 * AI-driven campaign optimization using GPT-4o to analyze metrics
 * and generate actionable recommendations.
 *
 * Flow:
 * 1. Load campaign metrics (last 7 days)
 * 2. Analyze performance trends with GPT-4o
 * 3. Generate optimization recommendations
 * 4. In "auto" mode, apply safe optimizations directly
 * 5. Store recommendations in ad_optimization_logs
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adCampaigns, adMetrics, adOptimizationLogs } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger";

interface OptimizationRecommendation {
  type: "budget" | "targeting" | "creative" | "bidding" | "schedule" | "pause";
  recommendation: string;
  details: {
    currentValue?: unknown;
    suggestedValue?: unknown;
    expectedImpact?: string;
    confidence?: number;
    reasoning?: string;
  };
  autoApplicable: boolean;
}

export const adsAutoOptimizeFunction = inngest.createFunction(
  { id: "ads-auto-optimize", retries: 2 },
  { event: "ads/optimize.run" },
  async ({ event, step }) => {
    const { campaignId, orgId, mode } = event.data;

    // Step 1: Load campaign and recent metrics
    const campaign = await step.run("load-campaign", async () => {
      const [c] = await db
        .select()
        .from(adCampaigns)
        .where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.orgId, orgId)));

      if (!c) throw new Error(`Campaign ${campaignId} not found`);
      return c;
    });

    const recentMetrics = await step.run("load-metrics", async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return db
        .select()
        .from(adMetrics)
        .where(
          and(
            eq(adMetrics.campaignId, campaignId),
            gte(adMetrics.date, sevenDaysAgo),
          ),
        )
        .orderBy(desc(adMetrics.date));
    });

    if (recentMetrics.length === 0) {
      return { campaignId, recommendations: 0, message: "No recent metrics to analyze" };
    }

    // Step 2: Analyze with GPT-4o
    const recommendations = await step.run("analyze-performance", async () => {
      const metricsSummary = recentMetrics.map((m) => ({
        date: m.date,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: m.conversions,
        spend: m.spend,
        revenue: m.revenue,
        ctr: m.ctr,
        cpc: m.cpc,
        cpa: m.cpa,
        roas: m.roas,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert digital advertising optimizer for a business intelligence platform. Analyze campaign performance data and generate specific, actionable optimization recommendations.

Each recommendation must be one of these types:
- "budget": Budget allocation changes
- "targeting": Audience targeting adjustments
- "creative": Creative refresh or A/B test suggestions
- "bidding": Bid strategy changes
- "schedule": Day/time scheduling optimization
- "pause": Recommendation to pause underperforming elements

Output valid JSON: an array of OptimizationRecommendation objects:
{
  "type": "budget" | "targeting" | "creative" | "bidding" | "schedule" | "pause",
  "recommendation": string (clear, actionable text),
  "details": {
    "currentValue": any (current state),
    "suggestedValue": any (recommended change),
    "expectedImpact": string (predicted improvement),
    "confidence": number (0-1, how confident in this recommendation),
    "reasoning": string (data-driven justification)
  },
  "autoApplicable": boolean (safe to auto-apply without human review)
}

Focus on data-driven insights. Only mark as autoApplicable if the change is low-risk (e.g., small budget adjustments within 20%, pausing clearly underperforming creatives).`,
          },
          {
            role: "user",
            content: `Analyze this campaign and suggest optimizations:

Campaign: ${campaign.name}
Objective: ${campaign.objective}
Daily Budget: ${campaign.budgetDaily}
Status: ${campaign.status}
Targeting: ${JSON.stringify(campaign.targeting ?? {})}

Last 7 days metrics:
${JSON.stringify(metricsSummary, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      return (parsed.recommendations ?? parsed) as OptimizationRecommendation[];
    });

    // Step 3: Store recommendations and optionally auto-apply
    let applied = 0;

    for (const rec of recommendations) {
      await step.run(`store-recommendation-${rec.type}`, async () => {
        const shouldAutoApply = mode === "auto" && rec.autoApplicable;

        await db.insert(adOptimizationLogs).values({
          campaignId,
          orgId,
          type: rec.type,
          mode,
          recommendation: rec.recommendation,
          details: rec.details,
          status: shouldAutoApply ? "applied" : "pending",
          appliedAt: shouldAutoApply ? new Date() : null,
        });

        if (shouldAutoApply) {
          // Auto-apply safe optimizations
          if (rec.type === "budget" && rec.details.suggestedValue != null) {
            await db
              .update(adCampaigns)
              .set({ budgetDaily: String(rec.details.suggestedValue) })
              .where(eq(adCampaigns.id, campaignId));
          }

          if (rec.type === "pause") {
            await db
              .update(adCampaigns)
              .set({ status: "paused" })
              .where(eq(adCampaigns.id, campaignId));
          }

          applied++;
          logger.info(
            { campaignId, type: rec.type, mode },
            "Auto-applied optimization",
          );
        }
      });
    }

    return {
      campaignId,
      mode,
      totalRecommendations: recommendations.length,
      autoApplied: applied,
      pendingReview: recommendations.length - applied,
    };
  },
);
