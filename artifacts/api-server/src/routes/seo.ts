/**
 * SEO & Market Intelligence routes — powered by SerpAPI.
 *
 * POST /api/seo/search       — Google organic search results
 * POST /api/seo/trends       — Google Trends interest over time
 * POST /api/seo/news         — Google News results
 * POST /api/seo/shopping     — Google Shopping / price comparison
 * POST /api/seo/competitive  — Competitive analysis (combines search + trends + news)
 */
import { Router, type IRouter, type Request, type Response } from "express";
import {
  getSerpApiClient,
  SerpApiError,
  type GoogleSearchResult,
  type GoogleTrendsResult,
  type GoogleNewsResult,
  type GoogleShoppingResult,
} from "@workspace/integrations-serpapi";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function handleSerpError(err: unknown, label: string, req: Request, res: Response): void {
  if (err instanceof SerpApiError) {
    req.log.warn({ status: err.status, body: err.body }, `SerpAPI error in ${label}`);
    res.status(err.status === 401 ? 502 : 400).json({ error: err.message });
    return;
  }
  req.log.error({ err }, `Unexpected error in ${label}`);
  res.status(500).json({ error: `Failed to ${label}` });
}

// ---------------------------------------------------------------------------
// POST /api/seo/search — Google organic search
// ---------------------------------------------------------------------------

router.post("/api/seo/search", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { q, gl, hl, location, num, start } = req.body as {
    q: string;
    gl?: string;
    hl?: string;
    location?: string;
    num?: number;
    start?: number;
  };

  if (!q?.trim()) {
    res.status(400).json({ error: "q (search query) is required" });
    return;
  }

  try {
    const client = getSerpApiClient();
    const result: GoogleSearchResult = await client.googleSearch(q, {
      gl,
      hl,
      location,
      num,
      start,
    });

    res.json({
      query: q,
      organic_results: result.organic_results,
      knowledge_graph: result.knowledge_graph ?? null,
      related_questions: result.related_questions ?? [],
      answer_box: result.answer_box ?? null,
      related_searches: result.related_searches ?? [],
      pagination: result.pagination ?? null,
      metadata: result.search_metadata,
    });
  } catch (err) {
    handleSerpError(err, "search", req, res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/seo/trends — Google Trends
// ---------------------------------------------------------------------------

router.post("/api/seo/trends", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { q, date, geo, dataType, cat } = req.body as {
    q: string;
    date?: string;
    geo?: string;
    dataType?: "TIMESERIES" | "GEO_MAP" | "RELATED_TOPICS" | "RELATED_QUERIES";
    cat?: number;
  };

  if (!q?.trim()) {
    res.status(400).json({ error: "q (query or comma-separated queries) is required" });
    return;
  }

  try {
    const client = getSerpApiClient();
    const result: GoogleTrendsResult = await client.googleTrends(q, {
      date,
      geo,
      dataType,
      cat,
    });

    res.json({
      query: q,
      interest_over_time: result.interest_over_time ?? null,
      compared_breakdown_by_region: result.compared_breakdown_by_region ?? [],
      related_topics: result.related_topics ?? null,
      related_queries: result.related_queries ?? null,
      metadata: result.search_metadata,
    });
  } catch (err) {
    handleSerpError(err, "trends", req, res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/seo/news — Google News
// ---------------------------------------------------------------------------

router.post("/api/seo/news", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { q, gl, hl, topicToken } = req.body as {
    q: string;
    gl?: string;
    hl?: string;
    topicToken?: string;
  };

  if (!q?.trim()) {
    res.status(400).json({ error: "q (search query) is required" });
    return;
  }

  try {
    const client = getSerpApiClient();
    const result: GoogleNewsResult = await client.googleNews(q, {
      gl,
      hl,
      topicToken,
    });

    res.json({
      query: q,
      news_results: result.news_results,
      metadata: result.search_metadata,
    });
  } catch (err) {
    handleSerpError(err, "news", req, res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/seo/shopping — Google Shopping
// ---------------------------------------------------------------------------

router.post("/api/seo/shopping", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { q, gl, hl, location, num, tbs } = req.body as {
    q: string;
    gl?: string;
    hl?: string;
    location?: string;
    num?: number;
    tbs?: string;
  };

  if (!q?.trim()) {
    res.status(400).json({ error: "q (search query) is required" });
    return;
  }

  try {
    const client = getSerpApiClient();
    const result: GoogleShoppingResult = await client.googleShopping(q, {
      gl,
      hl,
      location,
      num,
      tbs,
    });

    res.json({
      query: q,
      shopping_results: result.shopping_results,
      filters: result.filters ?? [],
      metadata: result.search_metadata,
    });
  } catch (err) {
    handleSerpError(err, "shopping", req, res);
  }
});

// ---------------------------------------------------------------------------
// POST /api/seo/competitive — Competitive analysis
//
// Combines organic search, news, and trends for a target query/domain.
// Runs all three SerpAPI calls in parallel for speed.
// ---------------------------------------------------------------------------

router.post("/api/seo/competitive", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { q, gl, hl } = req.body as {
    q: string;
    gl?: string;
    hl?: string;
  };

  if (!q?.trim()) {
    res.status(400).json({ error: "q (query or brand/domain) is required" });
    return;
  }

  try {
    const client = getSerpApiClient();

    const [searchResult, newsResult, trendsResult] = await Promise.allSettled([
      client.googleSearch(q, { gl, hl, num: 20 }),
      client.googleNews(q, { gl, hl }),
      client.googleTrends(q, { geo: gl?.toUpperCase(), dataType: "TIMESERIES" }),
    ]);

    res.json({
      query: q,
      organic: searchResult.status === "fulfilled"
        ? {
            results: searchResult.value.organic_results,
            knowledge_graph: searchResult.value.knowledge_graph ?? null,
            answer_box: searchResult.value.answer_box ?? null,
            related_questions: searchResult.value.related_questions ?? [],
          }
        : { error: (searchResult.reason as Error).message },
      news: newsResult.status === "fulfilled"
        ? { results: newsResult.value.news_results }
        : { error: (newsResult.reason as Error).message },
      trends: trendsResult.status === "fulfilled"
        ? {
            interest_over_time: trendsResult.value.interest_over_time ?? null,
            related_queries: trendsResult.value.related_queries ?? null,
          }
        : { error: (trendsResult.reason as Error).message },
    });
  } catch (err) {
    handleSerpError(err, "competitive analysis", req, res);
  }
});

export default router;
