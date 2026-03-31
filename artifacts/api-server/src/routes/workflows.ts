import { Router, type IRouter, type Request, type Response } from "express";
import { db, workflowRuns, companyProfiles } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

interface WorkflowQuestion {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface WorkflowTemplate {
  key: string;
  name: string;
  description: string;
  questions: WorkflowQuestion[];
  systemPrompt: (companyContext: string, inputs: Record<string, string>) => string;
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "board_deck_audit",
    name: "Board Deck Audit",
    description: "Reviews an executive narrative for logical gaps, unsupported claims, and board-readiness",
    questions: [
      { key: "deck_content", label: "Executive Narrative / Deck Content", placeholder: "Paste the key sections or narrative from your board deck...", required: true },
      { key: "board_audience", label: "Board Audience Profile", placeholder: "e.g. Series B investors, public company board, strategic partners...", required: false },
      { key: "key_concerns", label: "Known Concerns to Address", placeholder: "What objections or questions are you anticipating?", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a seasoned board advisor and former McKinsey partner with 25 years of experience preparing Fortune 500 executives for board presentations.

${companyContext}

Your task: Conduct a rigorous audit of the following executive narrative/board deck content. Produce a structured Board Deck Audit with the following sections:

# Board Deck Audit

## Executive Assessment
[Overall readiness score (1-10) and 2-3 sentence summary of board-readiness]

## Logical Flow Analysis
[Evaluate the narrative arc — does the story flow logically? Are there gaps or jumps in reasoning?]

## Unsupported Claims Review
[Identify every claim that lacks data, citations, or validation. List each claim and what evidence is needed]

## Financial Narrative Strength
[Assess how well the financial story is told — clarity, credibility, and alignment with business narrative]

## Board Question Anticipation
[List the 5-7 hardest questions this board will ask, with recommended responses]

## Critical Gaps
[What's missing that a sophisticated board will immediately notice?]

## Recommended Revisions
[Specific, actionable edits prioritized by impact — what to add, remove, or reframe]

## Board-Ready Score
[Final assessment with specific criteria for what would make this a 10/10 presentation]

Deck Content to Audit:
${inputs.deck_content || "Not provided"}

${inputs.board_audience ? `Board Audience: ${inputs.board_audience}` : ""}
${inputs.key_concerns ? `Known Concerns: ${inputs.key_concerns}` : ""}

Be direct, specific, and ruthlessly honest. A board will be far less forgiving than this audit.`,
  },
  {
    key: "competitor_deep_dive",
    name: "Competitor Deep-Dive",
    description: "Maps a competitor's product, pricing, go-to-market, and strategic position",
    questions: [
      { key: "competitor_name", label: "Competitor Name", placeholder: "e.g. Salesforce, HubSpot, a specific startup...", required: true },
      { key: "competitive_context", label: "Competitive Context", placeholder: "Where do you most directly compete? What deals are you losing or winning?", required: false },
      { key: "specific_focus", label: "Specific Focus Areas", placeholder: "e.g. their enterprise pricing, recent product launches, GTM changes...", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a world-class competitive intelligence analyst with deep expertise across SaaS, fintech, and enterprise software markets.

${companyContext}

Your task: Produce a comprehensive competitor deep-dive on ${inputs.competitor_name}. Structure your analysis as follows:

# Competitor Deep-Dive: ${inputs.competitor_name}

## Competitor Overview
[Company stage, size estimates, funding, key leadership, and core business model]

## Product & Technology Analysis
[Product architecture, key features, recent releases, technical differentiation, and product roadmap signals]

## Pricing & Packaging Strategy
[Known pricing tiers, deal sizes, discounting patterns, and pricing psychology]

## Go-to-Market Motion
[Sales model (PLG/SLG/hybrid), target segments, key channels, partner ecosystem, and marketing approach]

## Competitive Positioning
[How they position against the market, their messaging framework, and claimed differentiation]

## Strengths & Moats
[Where they genuinely excel and what makes their position defensible]

## Weaknesses & Vulnerabilities
[Where they are exposed — product gaps, customer complaints, market blind spots]

## Strategic Direction
[Where they appear to be heading based on hiring, funding, product signals, and executive communications]

## Competitive Battle Card
[Head-to-head comparison table: key dimensions where you win vs. lose]

## Strategic Recommendations
[How to position against this competitor, where to attack, where to avoid, and key win/loss patterns to exploit]

Competitor: ${inputs.competitor_name}
${inputs.competitive_context ? `Competitive Context: ${inputs.competitive_context}` : ""}
${inputs.specific_focus ? `Focus Areas: ${inputs.specific_focus}` : ""}`,
  },
  {
    key: "market_entry_analysis",
    name: "Market Entry Analysis",
    description: "Evaluates a new market opportunity with TAM, barriers, timing, and recommended approach",
    questions: [
      { key: "target_market", label: "Target Market / Segment", placeholder: "e.g. SMB healthcare providers in the US, enterprise logistics in Southeast Asia...", required: true },
      { key: "entry_rationale", label: "Strategic Rationale", placeholder: "Why are you considering this market? What's the hypothesis?", required: false },
      { key: "current_capabilities", label: "Current Capabilities & Assets", placeholder: "What do you bring to this market? Existing relationships, IP, technology?", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a McKinsey senior partner specializing in market entry strategy with 20+ years advising growth-stage companies on expansion decisions.

${companyContext}

Your task: Produce a rigorous market entry analysis for the following opportunity. Structure your deliverable as follows:

# Market Entry Analysis: ${inputs.target_market}

## Market Opportunity Assessment
[TAM/SAM/SOM sizing with methodology, growth rate, and structural attractiveness]

## Market Dynamics & Timing
[Why now? Market tailwinds, regulatory changes, technology shifts, and competitive white space]

## Competitive Landscape
[Key players, their positioning, and where the uncontested opportunity lies]

## Entry Barriers
[What makes this market hard to enter? Regulatory, capital, relationships, technology, or network effects]

## Go-to-Market Approach
[Recommended entry motion: direct, partner-led, acquisition, or platform extension]

## Customer Segmentation
[Beachhead segment recommendation and why — who to win first and the path to market leadership]

## Financial Model Framework
[Revenue model, unit economics expectations, capital requirements, and payback timeline]

## Risk Assessment
[Top 5 risks ranked by probability and severity, with mitigation strategies]

## Build vs. Buy vs. Partner
[Analysis of the three entry vectors with a clear recommendation]

## Strategic Recommendation
[Go / No-Go decision with the 3-5 conditions that must be true for this to succeed]

## 12-Month Entry Roadmap
[Phased approach with key milestones and decision gates]

Target Market: ${inputs.target_market}
${inputs.entry_rationale ? `Strategic Rationale: ${inputs.entry_rationale}` : ""}
${inputs.current_capabilities ? `Current Capabilities: ${inputs.current_capabilities}` : ""}`,
  },
  {
    key: "ma_target_evaluation",
    name: "M&A Target Evaluation",
    description: "Assesses a potential acquisition target across strategic fit, financials, and risks",
    questions: [
      { key: "target_company", label: "Target Company", placeholder: "Company name, website, or description...", required: true },
      { key: "strategic_rationale", label: "Strategic Rationale for Acquisition", placeholder: "Why are you interested? Acqui-hire, technology, market access, revenue?", required: false },
      { key: "deal_parameters", label: "Deal Parameters", placeholder: "Any known valuation expectations, deal structure preferences, or constraints?", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a seasoned M&A advisor and former investment banker with 20+ years advising on strategic acquisitions from seed through pre-IPO stage.

${companyContext}

Your task: Produce a rigorous M&A target evaluation for ${inputs.target_company}. Structure your deliverable as follows:

# M&A Target Evaluation: ${inputs.target_company}

## Target Company Overview
[Business model, estimated size, funding history, key team, and current trajectory]

## Strategic Fit Assessment
[How well does this target align with your strategic priorities? Score (1-10) and rationale]

## Revenue & Financial Analysis
[Estimated ARR/revenue, growth rate, unit economics, and financial health signals]

## Technology & Product Assessment
[Technical assets, IP, product quality, and integration complexity]

## Team & Culture Evaluation
[Key talent, retention risk, cultural alignment, and acqui-hire value]

## Market Position
[Target's competitive position, customer base quality, and market share]

## Synergy Analysis
[Revenue synergies, cost synergies, and strategic option value — quantified where possible]

## Integration Complexity
[Technical, organizational, and go-to-market integration challenges and timeline]

## Valuation Framework
[Comparable transaction multiples, DCF framework, and implied valuation range]

## Risk Assessment
[Top acquisition risks: integration, retention, technology, market, regulatory]

## Deal Structure Recommendation
[Asset vs. stock purchase, earnout structures, and key deal terms to negotiate]

## Go / No-Go Recommendation
[Clear recommendation with the 3-5 conditions that must be met to proceed]

Target: ${inputs.target_company}
${inputs.strategic_rationale ? `Strategic Rationale: ${inputs.strategic_rationale}` : ""}
${inputs.deal_parameters ? `Deal Parameters: ${inputs.deal_parameters}` : ""}`,
  },
  {
    key: "series_b_narrative",
    name: "Series B / Growth Narrative",
    description: "Crafts a compelling investor narrative grounded in the company's profile",
    questions: [
      { key: "fundraise_target", label: "Fundraise Target & Use of Funds", placeholder: "e.g. $25M Series B to expand into enterprise and double GTM team...", required: true },
      { key: "key_metrics", label: "Key Metrics & Traction", placeholder: "ARR, growth rate, NRR, CAC/LTV, key customer logos...", required: false },
      { key: "narrative_challenge", label: "Narrative Challenges", placeholder: "What parts of your story are hardest to tell? What objections do you face?", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a top-tier venture capital advisor who has helped 50+ companies craft their investor narratives and raise $5B+ collectively. You understand what Tier 1 VCs at Sequoia, a16z, and Bessemer look for.

${companyContext}

Your task: Craft a compelling Series B / Growth investor narrative. Structure your deliverable as follows:

# Series B / Growth Narrative

## The Investment Thesis (The Elevator Pitch)
[2-3 sentences that capture the entire opportunity — the hook that stops a VC mid-scroll]

## The Problem & Market Opportunity
[The specific, acute pain — with market size evidence that justifies a $1B+ outcome]

## The Solution & Why Now
[Why this solution, why this team, and why this moment in time is the right window]

## Business Model & Unit Economics
[How you make money, why the model scales, and the unit economics that prove it works]

## Traction & Proof Points
[The metrics that matter — structured to show velocity, retention, and product-market fit]

## Competitive Moat
[What makes you defensible — technology, network effects, data, brand, or distribution]

## Go-to-Market Strategy
[How you acquire and expand customers — the engine that drives the growth curve]

## Team & Unfair Advantage
[Why this team wins — specific experience, domain expertise, and execution track record]

## Financial Projections & Use of Funds
[3-year model narrative, key assumptions, and how the $${inputs.fundraise_target} unlocks the next phase]

## The Ask
[Clear fundraise target, valuation context, and what milestones this capital achieves]

## Anticipated Investor Questions & Responses
[The 8 hardest questions this narrative will face, with crisp, compelling answers]

Fundraise Target: ${inputs.fundraise_target}
${inputs.key_metrics ? `Key Metrics: ${inputs.key_metrics}` : ""}
${inputs.narrative_challenge ? `Narrative Challenges: ${inputs.narrative_challenge}` : ""}`,
  },
  {
    key: "quarterly_strategy_brief",
    name: "Quarterly Strategy Brief",
    description: "Synthesizes current priorities into a CEO-ready one-pager",
    questions: [
      { key: "quarter_focus", label: "Quarter & Key Focus Areas", placeholder: "e.g. Q2 2025: enterprise expansion, product-led growth launch, international pilot...", required: true },
      { key: "current_challenges", label: "Current Challenges & Headwinds", placeholder: "What's not working? Where are you behind plan?", required: false },
      { key: "key_decisions", label: "Key Decisions Needed", placeholder: "What decisions need to be made this quarter?", required: false },
    ],
    systemPrompt: (companyContext, inputs) => `You are a chief of staff and strategic advisor to Fortune 500 CEOs, renowned for synthesizing complex business situations into crisp, actionable strategic briefs.

${companyContext}

Your task: Produce a CEO-ready Quarterly Strategy Brief. Structure your deliverable as follows:

# Quarterly Strategy Brief

## Quarter in Context
[Where the business stands at the start of this quarter — momentum, headwinds, and the strategic backdrop]

## Priority Stack (Ranked)
[The 3-5 highest-leverage priorities this quarter, ranked by impact, with clear rationale for each]

## Key Metrics to Win
[The specific KPIs that define a successful quarter — what does winning look like in numbers?]

## Critical Initiatives & Owners
[For each priority: the initiative, the DRI (Directly Responsible Individual), and the key milestone]

## Risk Register
[Top 3-5 risks that could derail the quarter — each with probability, impact, and mitigation action]

## Resource & Capacity Assessment
[Are we resourced to execute? Where are the gaps in budget, headcount, or capability?]

## Decisions Required
[Decisions that must be made in the next 30 days to stay on track]

## CEO Communication Priorities
[What does the CEO need to communicate to the board, investors, team, and market this quarter?]

## 30 / 60 / 90 Day Milestones
[Specific checkpoints to verify execution is on track]

## Recommended CEO Focus
[The 2-3 places the CEO should personally focus time and attention this quarter]

Quarter Focus: ${inputs.quarter_focus}
${inputs.current_challenges ? `Current Challenges: ${inputs.current_challenges}` : ""}
${inputs.key_decisions ? `Key Decisions: ${inputs.key_decisions}` : ""}`,
  },
];

export const WORKFLOW_TEMPLATE_MAP: Record<string, WorkflowTemplate> = Object.fromEntries(
  WORKFLOW_TEMPLATES.map((t) => [t.key, t])
);

async function buildCompanyContext(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.userId, userId));

  if (!profile) return "";

  return `CLIENT CONTEXT (always reference this throughout the analysis):
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- Stage: ${profile.stage}
- Revenue Range: ${profile.revenueRange}
${profile.competitors ? `- Key Competitors: ${profile.competitors}` : ""}
${profile.strategicPriorities ? `- Strategic Priorities: ${profile.strategicPriorities}` : ""}
${profile.researchSummary ? `\nCompany Intelligence (AI-researched):\n${profile.researchSummary}` : ""}`;
}

router.get("/workflows/templates", async (req: Request, res: Response) => {
  const templates = WORKFLOW_TEMPLATES.map(({ key, name, description, questions }) => ({
    key,
    name,
    description,
    questions,
  }));
  res.json(templates);
});

router.get("/workflows", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const runs = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.userId, userId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(runs);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch workflow runs");
    res.status(500).json({ error: "Failed to fetch workflow runs" });
  }
});

router.get("/workflows/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid workflow run id" });
    return;
  }

  try {
    const [run] = await db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.id, id), eq(workflowRuns.userId, req.user!.id)));

    if (!run) {
      res.status(404).json({ error: "Workflow run not found" });
      return;
    }

    res.json(run);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch workflow run");
    res.status(500).json({ error: "Failed to fetch workflow run" });
  }
});

router.post("/workflows", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { templateKey, inputs } = req.body;

  if (!templateKey || typeof templateKey !== "string") {
    res.status(400).json({ error: "templateKey is required" });
    return;
  }

  const template = WORKFLOW_TEMPLATE_MAP[templateKey];
  if (!template) {
    res.status(400).json({ error: "Invalid template key" });
    return;
  }

  if (!inputs || typeof inputs !== "object") {
    res.status(400).json({ error: "inputs is required" });
    return;
  }

  const userId = req.user!.id;
  const title = `${template.name}`;

  let run;
  try {
    [run] = await db
      .insert(workflowRuns)
      .values({
        userId,
        templateKey,
        title,
        inputs,
        status: "generating",
      })
      .returning();
  } catch (err) {
    req.log.error({ err }, "Failed to create workflow run record");
    res.status(500).json({ error: "Failed to create workflow run" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Run-Id", String(run.id));
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("run_created", { id: run.id, title, status: "generating" });

  let fullOutput = "";

  try {
    const companyContext = await buildCompanyContext(userId);
    const systemPrompt = template.systemPrompt(companyContext, inputs as Record<string, string>);

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Execute this workflow analysis now. Produce the complete structured deliverable with all sections fully populated.` },
      ],
      stream: true,
      max_tokens: 8192,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullOutput += delta;
        sendEvent("content", { delta });
      }
    }

    await db
      .update(workflowRuns)
      .set({ status: "complete", output: fullOutput, updatedAt: new Date() })
      .where(and(eq(workflowRuns.id, run.id), eq(workflowRuns.userId, userId)));

    sendEvent("complete", { id: run.id, status: "complete" });
  } catch (err) {
    req.log.error({ err }, "Workflow execution failed");

    await db
      .update(workflowRuns)
      .set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(workflowRuns.id, run.id), eq(workflowRuns.userId, userId)));

    sendEvent("error", { error: "Workflow execution failed" });
  } finally {
    res.end();
  }
});

export { WORKFLOW_TEMPLATES };
export default router;
