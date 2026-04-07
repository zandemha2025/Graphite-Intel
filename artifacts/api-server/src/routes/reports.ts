import { Router, type IRouter, type Request, type Response } from "express";
import { db, reportsTable, companyProfiles } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import { ExportService } from "../lib/exportService.js";

const router: IRouter = Router();
const exportService = new ExportService();

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
- Valued at $500K+ in consulting engagements

## Output Structure (Pyramid Principle)
Always lead with the answer. State the key finding or recommendation in the Executive Summary before building the supporting case.

## Citation Rules
- Cite every factual claim with [Source: Name] inline
- Distinguish between 1st-party data (client's own systems) and 3rd-party research
- If data is estimated or modeled, say so explicitly: [Estimated based on...]
- Never present AI reasoning as if it were sourced data

## Communication Style
- Write like a senior McKinsey partner presenting to a C-suite executive
- Be direct, confident, and specific — not hedging or vague
- Use "we recommend" not "you might want to consider"
- Quantify everything possible with specific numbers, percentages, and dollar amounts
- Keep paragraphs short (2-3 sentences max)
- Every section must answer "so what?" and "now what?"

## Formatting Rules
- Use ## headings to separate major sections
- Use **bold** for key metrics, numbers, and proper nouns
- Use bullet points for action items and lists
- When comparing options, use a structured comparison table (not paragraphs)

Format your reports using Markdown with the following structure:
# [Report Title]

## Executive Summary
[2-3 sentence answer-first summary with the key number/insight highlighted in bold]

## Key Findings
[Numbered list of critical findings — each with a bold metric and [Source: Name] citation]

## Market Context
[Industry landscape, trends, and dynamics relevant to the company]

## Detailed Analysis
[Section-specific deep dive based on report type]

## Strategic Recommendations
[Prioritized list of actionable recommendations with implementation guidance and expected impact]

## Risk Factors
[Key risks with Probability x Impact assessment and mitigation strategies]

## Implementation Roadmap
[Phased 90-day, 6-month, and 12-month plan with specific milestones]

## So What?
[The single most important takeaway and the one thing the executive should do first, with a specific timeline]

Include specific data points, market statistics, competitor benchmarks, and industry best practices throughout.
Reference real companies, case studies, and published research when relevant.
Every claim must have a [Source: Name] citation.`;

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
    competitive_analysis: `Generate a comprehensive Competitive Analysis for ${company}.

Structure:
## Executive Summary
[2-3 sentence overview with key finding]

## Competitive Landscape Overview
[Market context, key players, market dynamics]

## Competitor Deep-Dives
For each major competitor:
### [Competitor Name]
- **Positioning**: How they position themselves
- **Key Strengths**: What they do well
- **Key Weaknesses**: Where they fall short
- **Recent Moves**: Product launches, pricing changes, partnerships
- **Estimated Revenue/Market Share**: Best available data with sources

## Competitive Positioning Matrix
[Feature-by-feature comparison table]

## Strategic Implications for ${company}
- **Opportunities**: Gaps in the market we can exploit
- **Threats**: Where competitors are gaining ground
- **Recommended Actions**: 3-5 specific, prioritized recommendations

## So What?
[The single most important takeaway and what to do about it]`,

    market_intelligence: `Generate a comprehensive Market Intelligence report for ${company}.

Structure:
## Executive Summary

## Market Overview
- TAM/SAM/SOM breakdown with methodology
- Growth rate and trajectory
- Key market drivers and headwinds

## Market Segmentation
[Breakdown by segment, geography, or customer type]

## Trend Analysis
[3-5 key trends shaping the market]

## Competitive Dynamics
[Market share distribution, recent M&A, funding rounds]

## Opportunities for ${company}
[Specific opportunities aligned with company stage and priorities]

## So What?
[Key recommendation]`,

    growth_strategy: `Generate a Growth Strategy for ${company}.

Structure:
## Executive Summary

## Current State Assessment
[Where the company is now — stage, revenue, market position]

## Growth Levers
### 1. [Lever 1 — e.g., Product-Led Growth]
- Rationale
- Expected Impact (quantified)
- Implementation Timeline
- Key Risks

### 2. [Lever 2]
[Same structure]

### 3. [Lever 3]
[Same structure]

## Prioritization Matrix
[Effort vs Impact for each lever]

## 90-Day Action Plan
[Specific actions for the next quarter]

## So What?
[The one thing to focus on first and why]`,

    paid_acquisition: `Build a complete Paid Acquisition Strategy for ${company}.

Structure:
## Executive Summary
[Key recommendation with expected CAC and ROAS targets]

## Channel Mix Recommendations
For each channel (Google, Meta, LinkedIn, programmatic):
### [Channel Name]
- **Recommended Budget Allocation**: % of total spend
- **Expected CAC**: Benchmark vs target
- **Best Use Case**: What this channel does best for ${company}
- **Creative Strategy**: Ad format and messaging approach

## Unit Economics Framework
- **LTV:CAC Ratios** by channel
- **Payback Period** targets
- **Marginal CAC Curve** — when to stop scaling each channel

## Attribution & Measurement
[Attribution model recommendation with rationale]

## Scaling Playbook
[Phase 1/2/3 with budget gates and performance thresholds]

## So What?
[Where to spend the first dollar and why]`,

    brand_positioning: `Create a Brand Positioning Strategy for ${company}.

Structure:
## Executive Summary

## Current Brand Audit
[How ${company} is perceived today — strengths and gaps]

## Target Audience Personas
[2-3 detailed personas with psychographics, not just demographics]

## Positioning Statement
[Classic format: For [target], [company] is the [category] that [key differentiator] because [reasons to believe]]

## Competitive Positioning Map
[2x2 positioning map with key competitors plotted]

## Messaging Framework
| Audience | Key Message | Proof Points | Tone |
|----------|-------------|--------------|------|

## Category Creation Opportunity
[If applicable — how to redefine the category]

## So What?
[The one positioning move that matters most right now]`,

    financial_modeling: `Develop a Financial Model and Analysis for ${company}.

Structure:
## Executive Summary
[Key financial insight with the most important number highlighted]

## Revenue Model Breakdown
- Revenue streams with growth assumptions
- Unit economics per stream

## Cost Structure Analysis
- Fixed vs variable cost breakdown
- Margin analysis by segment

## 3-Year Financial Projections
| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
[Revenue, COGS, Gross Margin, OpEx, EBITDA, Net Income]

## Scenario Analysis
- **Bull Case**: Assumptions and outcomes
- **Base Case**: Assumptions and outcomes
- **Bear Case**: Assumptions and outcomes

## Capital Efficiency & Fundraising
[Burn rate, runway, fundraising timing, valuation benchmarks]

## So What?
[The most critical financial lever and what to do about it]`,

    cultural_intelligence: `Analyze Cultural Intelligence for ${company}.

Structure:
## Executive Summary

## Cultural Assessment
[Current organizational culture using a recognized framework]

## Talent Strategy
- Key roles needed in next 12 months
- Retention risks and mitigation
- Compensation benchmarking

## Organizational Design
[Structure recommendations aligned with strategy]

## Culture-Performance Correlation
[How culture is helping or hindering strategic goals]

## Transformation Roadmap
[Phased plan with specific cultural initiatives]

## So What?
[The one cultural change that would have the highest strategic impact]`,

    full_business_audit: `Conduct a comprehensive Business Audit for ${company}.

Structure:
## Executive Summary
[Overall health score and top 3 findings]

## Business Model Assessment
[Revenue model, value proposition, competitive moat]

## Financial Health
[Revenue trends, margins, burn rate, runway]

## Go-to-Market Effectiveness
[Sales efficiency, marketing ROI, channel performance]

## Product & Technology
[Tech stack assessment, product-market fit indicators]

## Team & Organization
[Leadership, talent gaps, organizational design]

## Competitive Position
[Market share, competitive threats, differentiation]

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|

## Prioritized Transformation Agenda
[Top 5 initiatives ranked by effort vs impact]

## So What?
[The single biggest risk and the single biggest opportunity]`,
  };

  const basePrompt = typeSpecific[reportType] || `Generate a comprehensive ${typeLabel} report for ${company}.

Structure every section with:
- Clear ## headings
- Executive Summary at the top
- Quantified data where possible
- [Source: Name] citations
- A "So What?" conclusion with specific recommendations

Write like a McKinsey senior partner. Be direct, specific, and actionable. Every paragraph should answer "so what?" and "now what?"`;

  return `${basePrompt}

Company: ${company}
Report Type: ${typeLabel}
${context ? `Additional Context: ${context}` : ""}

Produce a comprehensive, McKinsey-quality ${typeLabel} report. Use specific data, statistics, and insights. Be authoritative and specific — avoid vague generalizations. Cite every factual claim with [Source: Name]. End with a "## So What?" section.`;
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

    const stream = await getOpenAIClient().chat.completions.create({
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

  const id = parseInt(req.params.id as string);
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

  const id = parseInt(req.params.id as string);
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

router.get("/reports/:id/export", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report id" });
    return;
  }

  const format = (req.query.format as string || "md").toLowerCase();
  if (!["pdf", "docx", "md"].includes(format)) {
    res.status(400).json({ error: "Invalid format. Supported: pdf, docx, md" });
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

    let buffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case "pdf":
        buffer = await exportService.generatePDF(report);
        contentType = "application/pdf";
        extension = "pdf";
        break;

      case "docx":
        buffer = await exportService.generateDocx(report);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;

      case "md":
      default:
        buffer = Buffer.from(report.content);
        contentType = "text/markdown";
        extension = "md";
        break;
    }

    const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${extension}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to export report");
    res.status(500).json({ error: "Failed to export report" });
  }
});

router.get("/reports/:id/download", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id as string);
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
