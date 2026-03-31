import { Router, type IRouter, type Request, type Response } from "express";
import { db, reportsTable, companyProfiles } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const REPORT_TYPE_LABELS: Record<string, string> = {
  market_intelligence: "Market Intelligence",
  competitive_analysis: "Competitive Analysis",
  growth_strategy: "Growth Strategy",
  paid_acquisition: "Paid Acquisition Strategy",
  brand_positioning: "Brand Positioning",
  financial_modeling: "Financial Modeling",
  cultural_intelligence: "Cultural Intelligence",
  full_business_audit: "Full Business Audit",
};

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function reportsFilter(req: Request) {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(reportsTable.orgId, orgId);
  }
  return eq(reportsTable.userId, userId);
}

const BASE_SYSTEM_PROMPT = `You are a world-class strategic consultant with 20 years of experience at McKinsey, Bain, and BCG.
You produce executive-grade reports for CMOs, CEOs, and CFOs of Fortune 500 companies and high-growth startups.

Your reports are:
- Deeply analytical, data-driven, and citation-heavy
- Written in a confident, direct, executive-facing tone
- Structured with clear headers, bullet points, and numbered findings
- Anchored in real market data, industry benchmarks, and competitor intelligence
- Actionable with prioritized recommendations and implementation timelines
- Valued at $100K+ in consulting engagements

Format your reports using Markdown with the following structure:
# [Report Title]

## Executive Summary
[3-5 sentence summary of key findings and recommendations]

## Key Findings
[Numbered list of critical findings with supporting data]

## Market Context
[Industry landscape, trends, and dynamics relevant to the company]

## Detailed Analysis
[Section-specific deep dive based on report type]

## Strategic Recommendations
[Prioritized list of actionable recommendations with implementation guidance]

## Risk Factors
[Key risks and mitigation strategies]

## Implementation Roadmap
[Phased 90-day, 6-month, and 12-month plan]

## Conclusion
[Executive summary of path forward]

Include specific data points, market statistics, competitor benchmarks, and industry best practices throughout.
Reference real companies, case studies, and published research when relevant.`;

async function buildSystemPrompt(req: Request): Promise<string> {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;

  const filter = orgId
    ? eq(companyProfiles.orgId, orgId)
    : eq(companyProfiles.userId, userId);

  const [profile] = await db
    .select()
    .from(companyProfiles)
    .where(filter);

  if (!profile) return BASE_SYSTEM_PROMPT;

  const profileBlock = `

CLIENT CONTEXT (always reference this throughout the report):
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- Stage: ${profile.stage}
- Revenue Range: ${profile.revenueRange}
${profile.competitors ? `- Key Competitors: ${profile.competitors}` : ""}
${profile.strategicPriorities ? `- Strategic Priorities: ${profile.strategicPriorities}` : ""}
${profile.researchSummary ? `\nCompany Intelligence (AI-researched):\n${profile.researchSummary}` : ""}

Always tailor every section of the report to this specific company context. Reference their industry, stage, and competitive landscape throughout.`;

  return BASE_SYSTEM_PROMPT + profileBlock;
}

function buildUserPrompt(reportType: string, company: string, context?: string): string {
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;
  
  const typeSpecific: Record<string, string> = {
    market_intelligence: `Conduct comprehensive market intelligence for ${company}. Include: total addressable market (TAM), serviceable addressable market (SAM), market growth rates, key market segments, emerging trends, regulatory landscape, technology disruptions, and market entry/expansion opportunities.`,
    competitive_analysis: `Perform a deep competitive analysis for ${company}. Include: direct and indirect competitors, market share estimates, competitive positioning matrices, SWOT analysis, competitor pricing strategies, product/service differentiation, competitive moats, and white space opportunities.`,
    growth_strategy: `Develop a comprehensive growth strategy for ${company}. Include: growth lever identification, organic vs inorganic growth opportunities, product/market expansion, customer segment analysis, unit economics optimization, growth model forecasting, and go-to-market strategy.`,
    paid_acquisition: `Build a complete paid acquisition strategy for ${company}. Include: channel mix recommendations (Google, Meta, LinkedIn, programmatic), CAC benchmarks by channel, LTV:CAC ratios, budget allocation framework, creative strategy, audience targeting, attribution models, and scaling playbook.`,
    brand_positioning: `Create a brand positioning strategy for ${company}. Include: brand architecture, positioning statement, value proposition, competitive differentiation, target audience personas, brand voice and messaging framework, category creation opportunities, and brand health metrics.`,
    financial_modeling: `Develop a financial model and analysis for ${company}. Include: revenue model breakdown, unit economics, cost structure analysis, margin optimization opportunities, capital efficiency benchmarks, fundraising strategy, valuation multiples, and 3-year financial projections with scenarios.`,
    cultural_intelligence: `Analyze cultural intelligence and organizational dynamics for ${company}. Include: cultural assessment framework, talent strategy, organizational design, leadership effectiveness, culture-performance correlation, DEI strategy, employee value proposition, and cultural transformation roadmap.`,
    full_business_audit: `Conduct a comprehensive business audit for ${company}. Include: business model assessment, revenue and cost analysis, operational efficiency, competitive positioning, technology stack evaluation, talent and culture, go-to-market effectiveness, financial health, risk assessment, and prioritized transformation agenda.`,
  };

  const basePrompt = typeSpecific[reportType] || `Generate a comprehensive ${typeLabel} report for ${company}.`;
  
  return `${basePrompt}

Company: ${company}
Report Type: ${typeLabel}
${context ? `Additional Context: ${context}` : ""}

Produce a comprehensive, McKinsey-quality ${typeLabel} report. Use specific data, statistics, and insights. Be authoritative and specific — avoid vague generalizations.`;
}

router.get("/reports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const reports = await db
      .select()
      .from(reportsTable)
      .where(reportsFilter(req))
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(reports);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/reports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { reportType, company, additionalContext: context } = req.body;

  if (!reportType || !company) {
    res.status(400).json({ error: "reportType and company are required" });
    return;
  }

  if (!REPORT_TYPE_LABELS[reportType]) {
    res.status(400).json({ error: "Invalid report type" });
    return;
  }

  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  const typeLabel = REPORT_TYPE_LABELS[reportType];
  const title = `${typeLabel}: ${company}`;

  let report;
  try {
    [report] = await db
      .insert(reportsTable)
      .values({
        userId,
        ...(orgId !== undefined && { orgId }),
        title,
        reportType,
        company,
        status: "generating",
      })
      .returning();
  } catch (err) {
    req.log.error({ err }, "Failed to create report record");
    res.status(500).json({ error: "Failed to create report" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Report-Id", String(report.id));
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("report_created", { id: report.id, title, status: "generating" });

  let fullContent = "";

  try {
    const systemPrompt = await buildSystemPrompt(req);
    const userPrompt = buildUserPrompt(reportType, company, context);

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 8192,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        sendEvent("content", { delta });
      }
    }

    const summaryLines = fullContent
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"))
      .slice(0, 3)
      .join(" ");
    const summary = summaryLines.substring(0, 500);

    await db
      .update(reportsTable)
      .set({ status: "complete", content: fullContent, summary, updatedAt: new Date() })
      .where(eq(reportsTable.id, report.id));

    sendEvent("complete", { id: report.id, status: "complete" });
  } catch (err) {
    req.log.error({ err }, "Report generation failed");

    await db
      .update(reportsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(reportsTable.id, report.id));

    sendEvent("error", { error: "Report generation failed" });
  } finally {
    res.end();
  }
});

router.get("/reports/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report id" });
    return;
  }

  try {
    const [report] = await db
      .select()
      .from(reportsTable)
      .where(and(eq(reportsTable.id, id), reportsFilter(req)));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch report");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.delete("/reports/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report id" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(reportsTable)
      .where(and(eq(reportsTable.id, id), reportsFilter(req)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Failed to delete report" });
  }
});

router.get("/reports/:id/download", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report id" });
    return;
  }

  try {
    const [report] = await db
      .select()
      .from(reportsTable)
      .where(and(eq(reportsTable.id, id), reportsFilter(req)));

    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (!report.content) {
      res.status(400).json({ error: "Report content not available yet" });
      return;
    }

    const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(report.content);
  } catch (err) {
    req.log.error({ err }, "Failed to download report");
    res.status(500).json({ error: "Failed to download report" });
  }
});

export default router;
