/**
 * Inngest function: ads/report.generate
 * Generates AI-powered ad performance reports with insights and recommendations.
 *
 * Flow:
 * 1. Load report config and campaign metrics
 * 2. Aggregate metrics across campaigns and date range
 * 3. Generate narrative insights and recommendations via GPT-4o
 * 4. Store generated content and mark report as ready
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { adReports, adCampaigns, adMetrics } from "@workspace/db";
import { eq, and, inArray, between } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

export const adsReportGenerateFunction = inngest.createFunction(
  { id: "ads-report-generate", retries: 2 },
  { event: "ads/report.generate" },
  async ({ event, step }) => {
    const { orgId, reportType, campaignIds, dateRange } = event.data;

    // Step 1: Load report record
    const report = await step.run("load-report", async () => {
      // Find the most recent pending report matching these params
      const [r] = await db
        .select()
        .from(adReports)
        .where(
          and(
            eq(adReports.orgId, orgId),
            eq(adReports.reportType, reportType),
            eq(adReports.status, "pending"),
          ),
        );

      if (r) {
        await db
          .update(adReports)
          .set({ status: "generating" })
          .where(eq(adReports.id, r.id));
        return r;
      }

      // Create a new report if none found
      const [newReport] = await db
        .insert(adReports)
        .values({
          orgId,
          name: `${reportType} Report — ${dateRange.from} to ${dateRange.to}`,
          reportType,
          campaignIds: campaignIds ?? [],
          dateRange,
          status: "generating",
        })
        .returning();

      return newReport;
    });

    // Step 2: Load campaigns and metrics
    const campaignData = await step.run("load-campaign-data", async () => {
      const campaignFilter = campaignIds && campaignIds.length > 0
        ? inArray(adCampaigns.id, campaignIds)
        : eq(adCampaigns.orgId, orgId);

      const campaigns = await db
        .select()
        .from(adCampaigns)
        .where(campaignFilter);

      const cIds = campaigns.map((c) => c.id);
      if (cIds.length === 0) return { campaigns: [], metrics: [] };

      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);

      const metrics = await db
        .select()
        .from(adMetrics)
        .where(
          and(
            inArray(adMetrics.campaignId, cIds),
            between(adMetrics.date, fromDate, toDate),
          ),
        );

      return { campaigns, metrics };
    });

    if (campaignData.campaigns.length === 0) {
      await step.run("mark-empty", async () => {
        await db
          .update(adReports)
          .set({
            status: "ready",
            generatedContent: {
              summary: "No campaigns found for the selected criteria.",
              insights: [],
              recommendations: [],
            },
            completedAt: new Date(),
          })
          .where(eq(adReports.id, report.id));
      });

      return { reportId: report.id, empty: true };
    }

    // Step 3: Aggregate metrics
    const aggregated = await step.run("aggregate-metrics", async () => {
      const bycamp: Record<number, {
        name: string;
        totalImpressions: number;
        totalClicks: number;
        totalConversions: number;
        totalSpend: number;
        totalRevenue: number;
        days: number;
      }> = {};

      for (const c of campaignData.campaigns) {
        bycamp[c.id] = {
          name: c.name,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalSpend: 0,
          totalRevenue: 0,
          days: 0,
        };
      }

      for (const m of campaignData.metrics) {
        const b = bycamp[m.campaignId];
        if (!b) continue;
        b.totalImpressions += m.impressions ?? 0;
        b.totalClicks += m.clicks ?? 0;
        b.totalConversions += m.conversions ?? 0;
        b.totalSpend += parseFloat(String(m.spend ?? 0));
        b.totalRevenue += parseFloat(String(m.revenue ?? 0));
        b.days++;
      }

      return Object.entries(bycamp).map(([id, data]) => ({
        campaignId: Number(id),
        ...data,
        avgCTR: data.totalClicks / (data.totalImpressions || 1),
        avgCPC: data.totalSpend / (data.totalClicks || 1),
        avgCPA: data.totalSpend / (data.totalConversions || 1),
        roas: data.totalRevenue / (data.totalSpend || 1),
      }));
    });

    // Step 4: Generate AI insights
    const generatedContent = await step.run("generate-insights", async () => {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert advertising analyst generating a ${reportType} report. Analyze campaign performance data and produce:

1. "summary": A 2-3 paragraph executive summary
2. "insights": Array of 3-5 key data-driven insights (strings)
3. "recommendations": Array of 3-5 actionable next steps (strings)

Output valid JSON with these three fields. Be specific with numbers and percentages. Identify top and bottom performers.`,
          },
          {
            role: "user",
            content: `Generate a ${reportType} report for ${dateRange.from} to ${dateRange.to}:

Campaign Performance:
${JSON.stringify(aggregated, null, 2)}

Total campaigns: ${aggregated.length}
Total spend: $${aggregated.reduce((s, c) => s + c.totalSpend, 0).toFixed(2)}
Total revenue: $${aggregated.reduce((s, c) => s + c.totalRevenue, 0).toFixed(2)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(content) as {
        summary: string;
        insights: string[];
        recommendations: string[];
      };
    });

    // Step 5: Save report
    await step.run("save-report", async () => {
      await db
        .update(adReports)
        .set({
          status: "ready",
          generatedContent,
          completedAt: new Date(),
        })
        .where(eq(adReports.id, report.id));
    });

    return {
      reportId: report.id,
      campaignsAnalyzed: aggregated.length,
      insights: generatedContent.insights?.length ?? 0,
    };
  },
);
