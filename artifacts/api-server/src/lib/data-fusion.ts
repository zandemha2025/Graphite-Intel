import { type Request } from "express";
import { db, pipedreamConnectors } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataSource =
  | "INTERNAL_DOCS"
  | "COMPANY_PROFILE"
  | "WEB_RESEARCH"
  | "SEARCH_DATA"
  | "CRM_DATA"
  | "CALL_DATA";

export interface SourceResult {
  source: string;
  data: string;
}

export interface FusionSource {
  name: string;
  type: "1p" | "3p";
}

// ---------------------------------------------------------------------------
// Perplexity client (reused from conversations)
// ---------------------------------------------------------------------------

function getPerplexityClient(): OpenAI | null {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.perplexity.ai",
  });
}

// ---------------------------------------------------------------------------
// Query Intent Classification
// ---------------------------------------------------------------------------

export async function classifyQueryIntent(
  content: string,
  profile: { companyName?: string | null; industry?: string | null } | null,
): Promise<DataSource[]> {
  const classificationPrompt = `You are a query router for an enterprise intelligence platform. Given a user's question and their company context, decide which data sources to use.

Company: ${profile?.companyName || "Unknown"}, Industry: ${profile?.industry || "Unknown"}

Available sources:
- INTERNAL_DOCS: Company's uploaded documents (board decks, reports, strategies)
- COMPANY_PROFILE: Company context (industry, stage, competitors, priorities)
- WEB_RESEARCH: Deep web research via Perplexity (market data, industry trends, benchmarks)
- SEARCH_DATA: Real-time search results via SerpAPI (news, competitor updates, trends)
- CRM_DATA: Customer/pipeline data from connected CRM (Salesforce, HubSpot) via Pipedream
- CALL_DATA: Sales call insights from Gong via Pipedream

User query: "${content}"

Respond with ONLY a JSON array of source IDs to use, e.g.: ["COMPANY_PROFILE", "WEB_RESEARCH", "SEARCH_DATA"]
Rules:
- Always include COMPANY_PROFILE if they have one
- Use INTERNAL_DOCS if the query references "our" documents, reports, decks, or internal data
- Use WEB_RESEARCH for market size, industry trends, benchmarks, competitor analysis
- Use SEARCH_DATA for recent news, competitor updates, pricing changes, current events
- Use CRM_DATA if the query mentions pipeline, deals, accounts, customers, CAC, LTV, churn
- Use CALL_DATA if the query mentions calls, meetings, sentiment, deal conversations
- For simple factual questions, just use COMPANY_PROFILE
- For deep analysis, use 3-4 sources`;

  try {
    const classification = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: classificationPrompt }],
      max_tokens: 100,
      temperature: 0,
    });

    const raw = classification.choices[0]?.message?.content || "[]";
    // Strip markdown fences if the model wraps the response
    const cleaned = raw.replace(/```json\s*|```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as string[];
    // Validate that every entry is a known source
    const valid: DataSource[] = parsed.filter(
      (s): s is DataSource =>
        [
          "INTERNAL_DOCS",
          "COMPANY_PROFILE",
          "WEB_RESEARCH",
          "SEARCH_DATA",
          "CRM_DATA",
          "CALL_DATA",
        ].includes(s),
    );
    return valid;
  } catch {
    // On classification failure, fall back to safe defaults
    return ["COMPANY_PROFILE"];
  }
}

// ---------------------------------------------------------------------------
// Data Fetchers
// ---------------------------------------------------------------------------

export async function fetchPerplexityResearch(
  query: string,
  profile: { companyName?: string | null; industry?: string | null } | null,
): Promise<SourceResult> {
  const client = getPerplexityClient();
  if (!client) return { source: "Perplexity", data: "" };

  try {
    const r = await client.chat.completions.create({
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: `Research for ${profile?.companyName || "a company"} in ${profile?.industry || "technology"}: ${query}. Provide factual data with sources.`,
        },
      ],
      max_tokens: 2000,
    });
    return { source: "Perplexity", data: r.choices[0]?.message?.content || "" };
  } catch {
    return { source: "Perplexity", data: "" };
  }
}

export async function fetchSerpApiData(query: string): Promise<SourceResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return { source: "SerpAPI", data: "" };

  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
    const r = await fetch(url);
    const data = await r.json();

    const organic = (data.organic_results || [])
      .slice(0, 5)
      .map((item: any) => `- ${item.title}: ${item.snippet} (${item.link})`)
      .join("\n");

    const news = (data.news_results || [])
      .slice(0, 3)
      .map((item: any) => `- [NEWS] ${item.title}: ${item.snippet} (${item.link})`)
      .join("\n");

    return {
      source: "SerpAPI",
      data: organic + (news ? "\n\nRecent news:\n" + news : ""),
    };
  } catch {
    return { source: "SerpAPI", data: "" };
  }
}

export async function fetchCrmData(
  req: Request,
  _query: string,
): Promise<SourceResult> {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) {
      return {
        source: "CRM",
        data: "[No organization context. Join an organization to enable CRM data.]",
      };
    }

    const accounts = await db
      .select()
      .from(pipedreamConnectors)
      .where(
        and(
          eq(pipedreamConnectors.orgId, orgId),
          eq(pipedreamConnectors.isActive, true),
        ),
      );

    if (accounts.length === 0) {
      return {
        source: "CRM",
        data: "[No CRM connected. Connect Salesforce or HubSpot in Integrations to enable CRM data in responses.]",
      };
    }

    const connectedApps = accounts.map((a) => a.name || a.appSlug).join(", ");
    return {
      source: `CRM (${connectedApps})`,
      data: `[CRM connected: ${connectedApps}. Pipedream data pull integration coming soon.]`,
    };
  } catch {
    return { source: "CRM", data: "" };
  }
}

export async function fetchCallData(
  _req: Request,
  _query: string,
): Promise<SourceResult> {
  // Placeholder until Gong Pipedream workflow is wired up
  return {
    source: "Gong",
    data: "[Gong integration pending. Connect in Integrations to enable call insights.]",
  };
}

// ---------------------------------------------------------------------------
// Chart Opportunity Detection
// ---------------------------------------------------------------------------

export interface ChartSuggestion {
  type: string;
  description: string;
}

export function detectChartOpportunities(content: string): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];

  // Detect time-series data
  if (/\b(Q[1-4]|quarter|monthly|yearly|20\d{2})\b/i.test(content) && /\b(\d+%|\$[\d.]+[MBK]?)\b/.test(content)) {
    suggestions.push({ type: "Line/Area Chart", description: "Plot the time-series metrics mentioned (quarterly/monthly trends)" });
  }

  // Detect comparison data
  if (/\bvs\b|\bcompared to\b|\bversus\b/i.test(content) || (content.match(/\b[A-Z][a-z]+\b/g) || []).length > 5) {
    suggestions.push({ type: "Bar Chart", description: "Compare the entities/metrics side by side" });
  }

  // Detect market share / proportion data
  if (/\b(market share|percentage|portion|segment|breakdown)\b/i.test(content)) {
    suggestions.push({ type: "Pie/Donut Chart", description: "Show the proportional breakdown" });
  }

  // Detect funnel/pipeline data
  if (/\b(funnel|pipeline|conversion|stage|step)\b/i.test(content)) {
    suggestions.push({ type: "Funnel Chart", description: "Visualize the conversion funnel or pipeline stages" });
  }

  return suggestions.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Fusion Context Builder
// ---------------------------------------------------------------------------

export function buildFusionContext(results: SourceResult[]): string {
  let ctx = "";
  for (const result of results) {
    if (result.data) {
      ctx += `\n\n--- DATA FROM ${result.source.toUpperCase()} ---\n${result.data}\n--- END ${result.source.toUpperCase()} ---\n`;
    }
  }
  return ctx;
}

export function buildFusionSources(
  results: SourceResult[],
  hasDocChunks: boolean,
  hasProfile: boolean,
): FusionSource[] {
  const sources: FusionSource[] = [];

  if (hasProfile) {
    sources.push({ name: "Company Profile", type: "1p" });
  }
  if (hasDocChunks) {
    sources.push({ name: "Your Documents", type: "1p" });
  }

  for (const r of results) {
    if (!r.data || r.data.includes("integration pending") || r.data.includes("No CRM connected") || r.data.includes("No organization context")) {
      continue;
    }
    const is1p = r.source.includes("CRM") || r.source.includes("Gong");
    sources.push({ name: r.source, type: is1p ? "1p" : "3p" });
  }

  return sources;
}
