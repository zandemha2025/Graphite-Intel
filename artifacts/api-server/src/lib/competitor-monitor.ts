import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

/* ---------- Types ---------- */

export interface CompetitorSignal {
  competitor: string;
  category: "news" | "website" | "customer" | "people" | "social";
  title: string;
  summary: string;
  source: string;
  url?: string;
  severity: "info" | "watch" | "alert";
  detectedAt: string;
}

export interface CompetitorBrief {
  competitor: string;
  signals: CompetitorSignal[];
  synthesis: string;
  recommendedAction: string;
}

/* ---------- SerpAPI helpers ---------- */

const SERPAPI_BASE = "https://serpapi.com/search.json";

async function serpSearch(params: Record<string, string>): Promise<Record<string, unknown>> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error("SERPAPI_API_KEY is not set");

  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpAPI returned ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/* ---------- Signal collectors ---------- */

interface NewsResult {
  title?: string;
  snippet?: string;
  source?: { name?: string };
  link?: string;
}

interface OrganicResult {
  title?: string;
  snippet?: string;
  link?: string;
}

async function collectNews(competitor: string): Promise<CompetitorSignal[]> {
  try {
    const data = await serpSearch({
      q: competitor,
      tbm: "nws",
      num: "5",
    });

    const results = (data.news_results as NewsResult[] | undefined) ?? [];
    return results.slice(0, 3).map((item) => ({
      competitor,
      category: "news" as const,
      title: item.title ?? "Untitled",
      summary: item.snippet ?? "",
      source: item.source?.name ?? "News",
      url: item.link,
      severity: "info" as const,
      detectedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function collectWebsite(competitor: string): Promise<CompetitorSignal[]> {
  const domain = competitor.toLowerCase().replace(/\s+/g, "");
  try {
    const data = await serpSearch({
      q: `site:${domain}.com`,
      num: "3",
      tbs: "qdr:w", // past week
    });

    const results = (data.organic_results as OrganicResult[] | undefined) ?? [];
    return results.slice(0, 2).map((item) => ({
      competitor,
      category: "website" as const,
      title: `Page update: ${item.title ?? "Unknown"}`,
      summary: item.snippet ?? "",
      source: "Website Monitor",
      url: item.link,
      severity: "watch" as const,
      detectedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function collectCustomer(competitor: string): Promise<CompetitorSignal[]> {
  try {
    const data = await serpSearch({
      q: `${competitor} review OR "G2" OR "Capterra" OR "Trustpilot"`,
      num: "3",
      tbs: "qdr:m", // past month
    });

    const results = (data.organic_results as OrganicResult[] | undefined) ?? [];
    return results.slice(0, 2).map((item) => ({
      competitor,
      category: "customer" as const,
      title: item.title ?? "Untitled",
      summary: item.snippet ?? "",
      source: "Review Monitor",
      url: item.link,
      severity: "info" as const,
      detectedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function collectPeople(competitor: string): Promise<CompetitorSignal[]> {
  try {
    const data = await serpSearch({
      q: `${competitor} hiring OR "new hire" OR "joins as"`,
      num: "3",
      tbs: "qdr:m",
    });

    const results = (data.organic_results as OrganicResult[] | undefined) ?? [];
    return results.slice(0, 2).map((item) => ({
      competitor,
      category: "people" as const,
      title: item.title ?? "Untitled",
      summary: item.snippet ?? "",
      source: "Hiring Monitor",
      url: item.link,
      severity: "info" as const,
      detectedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function collectSocial(competitor: string): Promise<CompetitorSignal[]> {
  try {
    const data = await serpSearch({
      q: `${competitor} site:linkedin.com OR site:twitter.com OR site:x.com`,
      num: "3",
      tbs: "qdr:w",
    });

    const results = (data.organic_results as OrganicResult[] | undefined) ?? [];
    return results.slice(0, 2).map((item) => ({
      competitor,
      category: "social" as const,
      title: item.title ?? "Untitled",
      summary: item.snippet ?? "",
      source: "Social Monitor",
      url: item.link,
      severity: "info" as const,
      detectedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/* ---------- Severity classification ---------- */

function classifySeverity(signals: CompetitorSignal[]): CompetitorSignal[] {
  const keywords = {
    alert: [
      "pricing", "price increase", "price change", "acquisition", "acquired",
      "IPO", "security breach", "layoff", "lawsuit", "pivot",
    ],
    watch: [
      "hiring", "new hire", "VP", "C-suite", "partnership", "launch",
      "enterprise", "funding", "raised", "expansion", "new feature",
    ],
  };

  return signals.map((s) => {
    const text = `${s.title} ${s.summary}`.toLowerCase();
    if (keywords.alert.some((kw) => text.includes(kw.toLowerCase()))) {
      return { ...s, severity: "alert" as const };
    }
    if (keywords.watch.some((kw) => text.includes(kw.toLowerCase()))) {
      return { ...s, severity: "watch" as const };
    }
    return s;
  });
}

/* ---------- Main monitor function ---------- */

export async function monitorCompetitor(
  competitorName: string,
  _industry?: string,
): Promise<CompetitorSignal[]> {
  const [news, website, customer, people, social] = await Promise.all([
    collectNews(competitorName),
    collectWebsite(competitorName),
    collectCustomer(competitorName),
    collectPeople(competitorName),
    collectSocial(competitorName),
  ]);

  const allSignals = [...news, ...website, ...customer, ...people, ...social];
  return classifySeverity(allSignals);
}

/* ---------- AI synthesis ---------- */

export async function synthesizeSignals(
  competitor: string,
  signals: CompetitorSignal[],
): Promise<{ synthesis: string; recommendedAction: string }> {
  if (signals.length === 0) {
    return {
      synthesis: `No recent signals detected for ${competitor}.`,
      recommendedAction: "Continue monitoring. No immediate action required.",
    };
  }

  const client = getOpenAIClient();
  const signalSummary = signals
    .map((s) => `[${s.category.toUpperCase()}] ${s.title}: ${s.summary}`)
    .join("\n");

  const r = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a competitive intelligence analyst. Given signals about a competitor, synthesize what they mean TOGETHER as a strategic move.

Return ONLY valid JSON:
{
  "synthesis": "2-3 sentence analysis connecting the signals into a coherent strategic narrative. Be specific about timing windows.",
  "recommendedAction": "1-2 sentence specific recommended response."
}`,
      },
      {
        role: "user",
        content: `Competitor: ${competitor}\n\nSignals:\n${signalSummary}\n\nWhat does this pattern mean? What should we do?`,
      },
    ],
    max_tokens: 300,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = r.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as { synthesis?: string; recommendedAction?: string };
    return {
      synthesis: parsed.synthesis ?? "Unable to synthesize signals.",
      recommendedAction: parsed.recommendedAction ?? "Continue monitoring.",
    };
  } catch {
    return {
      synthesis: "Unable to synthesize signals at this time.",
      recommendedAction: "Review individual signals manually.",
    };
  }
}
