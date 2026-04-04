/**
 * Data Fusion Service
 *
 * Orchestrates live market intelligence from all configured sources:
 * - SerpAPI  (web search + news)
 * - Firecrawl (URL scraping for links mentioned in queries)
 *
 * Gracefully degrades — if a service is not configured (missing API key) or
 * fails, it is skipped and the remaining sources are used.
 */

import { getSerpApiClient } from "@workspace/integrations-serpapi";
import { scrapeUrl } from "@workspace/integrations-firecrawl";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FusionSourceItem {
  title: string;
  snippet?: string;
  link?: string;
  date?: string;
}

export interface FusionSource {
  name: string;
  items: FusionSourceItem[];
}

export interface FusionContext {
  /** Formatted text block ready to be injected into an AI system prompt. */
  contextText: string;
  /** Structured data broken down by source. */
  sources: FusionSource[];
  /** Names of sources that successfully returned data. */
  sourcesUsed: string[];
}

export type QueryIntent = "market_research" | "competitive_analysis" | "news" | "general";

export type ResearchDepth = "quick" | "deep";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function classifyIntent(query: string): QueryIntent {
  if (/competitor|vs\s|compare|market share|rival|competitive/i.test(query)) {
    return "competitive_analysis";
  }
  if (/news|latest|recent|update|announce|press release/i.test(query)) {
    return "news";
  }
  if (/market|industry|trend|growth|forecast|sector|revenue|valuation/i.test(query)) {
    return "market_research";
  }
  return "general";
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = text.match(urlRegex) ?? [];
  // Deduplicate and cap at 2 to keep latency manageable
  return [...new Set(matches)].slice(0, 2);
}

function buildContextText(sources: FusionSource[]): string {
  if (sources.length === 0) return "";

  const blocks = sources.map((src) => {
    const itemLines = src.items
      .map((item) => {
        let line = `- **${item.title}**`;
        if (item.date) line += ` (${item.date})`;
        if (item.snippet) line += `\n  ${item.snippet.trim()}`;
        if (item.link) line += `\n  URL: ${item.link}`;
        return line;
      })
      .join("\n");
    return `### ${src.name}\n${itemLines}`;
  });

  return blocks.join("\n\n");
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Gather live market intelligence for a user query.
 * Uses Promise.allSettled so one failing source never blocks others.
 */
export async function gatherMarketContext(
  query: string,
  options: { depth?: ResearchDepth; sources?: string[] } = {},
): Promise<FusionContext> {
  const { depth = "quick", sources: requestedSources } = options;
  const intent = classifyIntent(query);
  const urls = extractUrls(query);

  const sourcesUsed: string[] = [];
  const sources: FusionSource[] = [];

  const tasks: Promise<void>[] = [];

  const wantSerp = !requestedSources || requestedSources.includes("serpapi");
  const wantFirecrawl = !requestedSources || requestedSources.includes("firecrawl");

  // ---------------------------------------------------------------------------
  // SerpAPI — web search + conditional news
  // ---------------------------------------------------------------------------
  if (wantSerp) {
    tasks.push(
      (async () => {
        try {
          const serp = getSerpApiClient();
          const numResults = depth === "deep" ? 10 : 5;

          const serpTasks: Promise<unknown>[] = [
            serp.googleSearch(query, { num: numResults }),
          ];

          const wantNews =
            intent === "news" ||
            intent === "market_research" ||
            intent === "competitive_analysis";

          if (wantNews) {
            serpTasks.push(serp.googleNews(query));
          }

          const [searchSettled, newsSettled] = await Promise.allSettled(serpTasks);

          // Web search results
          if (searchSettled?.status === "fulfilled") {
            const result = searchSettled.value as Awaited<ReturnType<typeof serp.googleSearch>>;

            // Featured answer box
            if (result.answer_box?.snippet) {
              sources.push({
                name: "Featured Answer",
                items: [
                  {
                    title: result.answer_box.title ?? "Direct Answer",
                    snippet: result.answer_box.snippet,
                    link: result.answer_box.link,
                  },
                ],
              });
            }

            // Organic results
            const organic = (result.organic_results ?? []).slice(0, numResults).map((r) => ({
              title: r.title,
              snippet: r.snippet,
              link: r.link,
            }));
            if (organic.length > 0) {
              sources.push({ name: "Web Search Results", items: organic });
              sourcesUsed.push("SerpAPI Search");
            }

            // Related questions (deep mode only)
            if (depth === "deep" && result.related_questions?.length) {
              const questions = result.related_questions.slice(0, 3).map((q) => ({
                title: q.question,
                snippet: q.snippet,
                link: q.link,
              }));
              sources.push({ name: "Related Questions", items: questions });
            }
          }

          // News results
          if (wantNews && newsSettled?.status === "fulfilled") {
            const news = newsSettled.value as Awaited<ReturnType<typeof serp.googleNews>>;
            const newsItems = (news.news_results ?? []).slice(0, 5).map((n) => ({
              title: n.title,
              snippet: n.snippet,
              link: n.link,
              date: n.date,
            }));
            if (newsItems.length > 0) {
              sources.push({ name: "Recent News", items: newsItems });
              sourcesUsed.push("SerpAPI News");
            }
          }
        } catch {
          // SerpAPI not configured or unavailable — skip silently
        }
      })(),
    );
  }

  // ---------------------------------------------------------------------------
  // Firecrawl — scrape any URLs mentioned in the query
  // ---------------------------------------------------------------------------
  if (wantFirecrawl && urls.length > 0) {
    tasks.push(
      (async () => {
        try {
          const scrapeResults = await Promise.allSettled(urls.map((u) => scrapeUrl(u)));
          const items: FusionSourceItem[] = [];

          for (let i = 0; i < scrapeResults.length; i++) {
            const r = scrapeResults[i];
            if (r.status === "fulfilled") {
              const md = (r.value.markdown ?? "").trim();
              // Truncate to keep prompt size manageable
              const maxChars = depth === "deep" ? 2000 : 800;
              items.push({
                title: r.value.metadata.title ?? urls[i],
                snippet: md.slice(0, maxChars),
                link: urls[i],
              });
            }
          }

          if (items.length > 0) {
            sources.push({ name: "Scraped Pages", items });
            sourcesUsed.push("Firecrawl");
          }
        } catch {
          // Firecrawl not configured or unavailable — skip silently
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);

  const contextText = buildContextText(sources);

  return { contextText, sources, sourcesUsed };
}
