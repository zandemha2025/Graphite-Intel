import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  executeSearch,
  type SearchOptions,
} from "../lib/search";
import { createEmbedding } from "../lib/ai-client";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * POST /vault/query
 * Execute multi-project search (semantic, fulltext, or hybrid).
 */
router.post("/vault/query", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const {
    query,
    projectIds,
    searchMode = "hybrid",
    filters,
    limit = 20,
    offset = 0,
    threshold = 0.3,
  } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const validModes = ["semantic", "fulltext", "hybrid"];
  if (!validModes.includes(searchMode)) {
    res.status(400).json({
      error: `searchMode must be one of: ${validModes.join(", ")}`,
    });
    return;
  }

  try {
    const searchOptions: SearchOptions = {
      query,
      orgId,
      projectIds: projectIds?.length ? projectIds : undefined,
      mode: searchMode,
      filters: filters
        ? {
            dateRange: filters.dateRange
              ? {
                  from: new Date(filters.dateRange.from),
                  to: new Date(filters.dateRange.to),
                }
              : undefined,
            fileTypes: filters.fileTypes,
            tags: filters.tags,
          }
        : undefined,
      limit: Math.min(limit, 100),
      offset,
      semanticThreshold: threshold,
    };

    // Generate embedding if needed for semantic/hybrid modes
    let queryEmbedding: number[] | undefined;
    if (searchMode !== "fulltext") {
      const [embedding] = await createEmbedding(query);
      queryEmbedding = embedding;
    }

    const results = await executeSearch(searchOptions, queryEmbedding);

    res.json({
      results,
      total: results.length,
      query,
      searchMode,
      projectsSearched: projectIds || [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to execute vault query");
    res.status(500).json({ error: "Failed to execute search query" });
  }
});

/**
 * GET /search/suggest
 * Autocomplete suggestions from document titles.
 */
router.get("/search/suggest", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const q = req.query.q as string;
  if (!q || q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }

  try {
    const results = await db.execute(sql`
      SELECT DISTINCT d.title, d.id
      FROM documents d
      WHERE d.org_id = ${orgId}
        AND d.search_vector @@ plainto_tsquery('english', ${q})
      ORDER BY d.title
      LIMIT 10
    `);

    res.json({
      suggestions: (results.rows as any[]).map((r) => ({
        id: r.id,
        title: r.title,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch search suggestions");
    res.status(500).json({ error: "Failed to fetch search suggestions" });
  }
});

export default router;
