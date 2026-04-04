import { Router, type IRouter, type Request, type Response } from "express";
import {
  scrapeUrl,
  crawlSite,
  extractDataRaw,
  mapSite,
} from "@workspace/integrations-firecrawl";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * POST /api/scrape
 * Body: { url: string }
 * Returns: { markdown, metadata }
 */
router.post("/scrape", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const result = await scrapeUrl(url);
    res.json({ markdown: result.markdown, metadata: result.metadata });
  } catch (err) {
    req.log.error({ err }, "Scrape failed");
    res.status(500).json({ error: "Scrape failed. Please try again." });
  }
});

/**
 * POST /api/crawl
 * Body: { url: string, maxDepth?: number, limit?: number }
 * Returns: { urls, pages }
 */
router.post("/crawl", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { url, maxDepth, limit } = req.body as {
    url?: string;
    maxDepth?: number;
    limit?: number;
  };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const result = await crawlSite(url, { maxDepth, limit });
    res.json({ urls: result.urls, pages: result.pages });
  } catch (err) {
    req.log.error({ err }, "Crawl failed");
    res.status(500).json({ error: "Crawl failed. Please try again." });
  }
});

/**
 * POST /api/extract
 * Body: { url: string, schema: object }
 * Returns: { data }
 */
router.post("/extract", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { url, schema } = req.body as {
    url?: string;
    schema?: Record<string, unknown>;
  };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    res.status(400).json({ error: "schema must be a JSON Schema object" });
    return;
  }

  try {
    const data = await extractDataRaw(url, schema);
    res.json({ data });
  } catch (err) {
    req.log.error({ err }, "Extract failed");
    res.status(500).json({ error: "Extract failed. Please try again." });
  }
});

/**
 * POST /api/map
 * Body: { url: string }
 * Returns: { urls }
 */
router.post("/map", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const urls = await mapSite(url);
    res.json({ urls });
  } catch (err) {
    req.log.error({ err }, "Map failed");
    res.status(500).json({ error: "Map failed. Please try again." });
  }
});

export default router;
