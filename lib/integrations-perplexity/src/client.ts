import OpenAI from "openai";

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface SearchResult {
  answer: string;
  citations: Citation[];
  model: string;
}

export interface SearchOptions {
  model?: "sonar" | "sonar-pro" | "sonar-reasoning";
  returnCitations?: boolean;
  searchRecency?: "month" | "week" | "day" | "hour";
}

export interface ResearchOptions {
  depth?: "standard" | "deep";
  subQueries?: number;
}

export interface CompetitorAspects {
  pricing?: boolean;
  products?: boolean;
  news?: boolean;
  sentiment?: boolean;
}

export interface CompetitorIntelligence {
  company: string;
  summary: string;
  aspects: Record<string, string>;
  citations: Citation[];
}

export interface TrendReport {
  industry: string;
  timeframe: string;
  trends: string[];
  analysis: string;
  citations: Citation[];
}

function getClient(): OpenAI {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PERPLEXITY_API_KEY must be set to use the Perplexity integration.",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.perplexity.ai",
  });
}

function extractCitations(
  response: OpenAI.Chat.ChatCompletion,
): Citation[] {
  // Perplexity returns citations in a non-standard field on the response object
  const raw = response as unknown as Record<string, unknown>;
  const citations = raw["citations"];
  if (!Array.isArray(citations)) return [];
  return citations.map((c: unknown) => {
    if (typeof c === "string") return { url: c };
    const obj = c as Record<string, unknown>;
    return {
      url: typeof obj["url"] === "string" ? obj["url"] : String(obj["url"] ?? ""),
      title: typeof obj["title"] === "string" ? obj["title"] : undefined,
      snippet: typeof obj["snippet"] === "string" ? obj["snippet"] : undefined,
    };
  });
}

export async function search(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const client = getClient();
  const model = options.model ?? "sonar";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "user", content: query },
  ];

  const requestParams: Record<string, unknown> = {
    model,
    messages,
  };

  if (options.searchRecency) {
    requestParams["search_recency_filter"] = options.searchRecency;
  }

  const response = await client.chat.completions.create(
    requestParams as Parameters<typeof client.chat.completions.create>[0],
  );

  const answer = response.choices[0]?.message?.content ?? "";
  const citations = extractCitations(response);

  return { answer, citations, model };
}

export async function research(
  topic: string,
  depth: "standard" | "deep" = "standard",
): Promise<SearchResult> {
  const model = depth === "deep" ? "sonar-pro" : "sonar";
  const prompt =
    depth === "deep"
      ? `Conduct comprehensive research on: ${topic}. Provide detailed analysis with key findings, trends, notable players, and supporting data.`
      : `Research the following topic and provide a clear, well-structured summary: ${topic}`;

  return search(prompt, { model, returnCitations: true });
}

export async function monitorCompetitor(
  company: string,
  aspects: CompetitorAspects = {},
): Promise<CompetitorIntelligence> {
  const client = getClient();

  const aspectList: string[] = [];
  if (aspects.pricing !== false) aspectList.push("pricing and plans");
  if (aspects.products !== false) aspectList.push("products and features");
  if (aspects.news !== false) aspectList.push("recent news and announcements");
  if (aspects.sentiment !== false) aspectList.push("market sentiment and reviews");

  const prompt = `Provide competitive intelligence for ${company}. Cover: ${aspectList.join(", ")}. Be specific and cite recent sources.`;

  const response = await client.chat.completions.create({
    model: "sonar-pro",
    messages: [{ role: "user", content: prompt }],
  } as Parameters<typeof client.chat.completions.create>[0]);

  const summary = response.choices[0]?.message?.content ?? "";
  const citations = extractCitations(response);

  // Parse the response into aspect buckets (best-effort)
  const aspectResults: Record<string, string> = {};
  for (const aspect of aspectList) {
    const keyword = aspect.split(" ")[0];
    const regex = new RegExp(`(?:${keyword}[^\n]*\n?)([^\n]+(?:\n(?![A-Z])[^\n]+)*)`, "i");
    const match = summary.match(regex);
    if (match) aspectResults[aspect] = match[1].trim();
  }

  return { company, summary, aspects: aspectResults, citations };
}

export async function getTrends(
  industry: string,
  timeframe: string = "month",
): Promise<TrendReport> {
  const prompt = `What are the key market trends in the ${industry} industry over the past ${timeframe}? List specific trends with evidence and cite your sources.`;

  const result = await search(prompt, {
    model: "sonar-pro",
    searchRecency: timeframe === "day" || timeframe === "hour"
      ? (timeframe as "day" | "hour")
      : timeframe === "week"
        ? "week"
        : "month",
    returnCitations: true,
  });

  // Extract bullet-point trends from the answer
  const trendLines = result.answer
    .split("\n")
    .filter((line) => /^[-*•\d]/.test(line.trim()))
    .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter(Boolean);

  return {
    industry,
    timeframe,
    trends: trendLines.length > 0 ? trendLines : [result.answer],
    analysis: result.answer,
    citations: result.citations,
  };
}
