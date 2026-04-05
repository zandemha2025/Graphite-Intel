import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  executeSearch,
  type SearchOptions,
} from "../lib/search";
import OpenAI from "openai";

const router: IRouter = Router();
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY });
  return _openai;
}

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
      const embeddingResponse = await getOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      queryEmbedding = embeddingResponse.data[0].embedding;
    }

    const results = await executeSearch(searchOptions, queryEmbedding);

    // Get a rough total count by running an unbounded search (capped at 500)
    let totalCount = results.length + offset;
    if (results.length === searchOptions.limit) {
      // There may be more results; do a count query for full-text as proxy
      try {
        const tsquery = sql`plainto_tsquery('english', ${query})`;
        const countResult = await db.execute(sql`
          SELECT COUNT(*)::int AS cnt
          FROM document_chunks dc
          JOIN documents d ON d.id = dc.document_id
          WHERE d.org_id = ${orgId}
            AND dc.chunk_search_vector @@ ${tsquery}
        `);
        const fullCount = (countResult.rows[0] as any)?.cnt ?? totalCount;
        totalCount = Math.max(totalCount, fullCount);
      } catch {
        // Fall back to estimated total
      }
    }

    res.json({
      results,
      total: totalCount,
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
