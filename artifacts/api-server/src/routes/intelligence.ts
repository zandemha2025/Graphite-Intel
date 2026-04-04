import { Router, type IRouter, type Request, type Response } from "express";
import {
  search,
  research,
  monitorCompetitor,
  getTrends,
} from "@workspace/integrations-perplexity";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/intelligence/search — real-time web intelligence query
// ---------------------------------------------------------------------------
router.post(
  "/intelligence/search",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const { query, model, searchRecency } = req.body as {
      query?: string;
      model?: "sonar" | "sonar-pro" | "sonar-reasoning";
      searchRecency?: "month" | "week" | "day" | "hour";
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    try {
      const result = await search(query.trim(), {
        model,
        returnCitations: true,
        searchRecency,
      });
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Perplexity search failed");
      res.status(500).json({ error: "Intelligence search failed" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/intelligence/research — deep research on a topic
// ---------------------------------------------------------------------------
router.post(
  "/intelligence/research",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const { topic, depth } = req.body as {
      topic?: string;
      depth?: "standard" | "deep";
    };

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    if (depth !== undefined && depth !== "standard" && depth !== "deep") {
      res.status(400).json({ error: "depth must be 'standard' or 'deep'" });
      return;
    }

    try {
      const result = await research(topic.trim(), depth ?? "standard");
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Perplexity research failed");
      res.status(500).json({ error: "Intelligence research failed" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/intelligence/competitors — competitor monitoring
// ---------------------------------------------------------------------------
router.post(
  "/intelligence/competitors",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const { company, aspects } = req.body as {
      company?: string;
      aspects?: {
        pricing?: boolean;
        products?: boolean;
        news?: boolean;
        sentiment?: boolean;
      };
    };

    if (
      !company ||
      typeof company !== "string" ||
      company.trim().length === 0
    ) {
      res.status(400).json({ error: "company is required" });
      return;
    }

    try {
      const result = await monitorCompetitor(company.trim(), aspects ?? {});
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Perplexity competitor monitoring failed");
      res.status(500).json({ error: "Competitor intelligence failed" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/intelligence/trends — market trends
// ---------------------------------------------------------------------------
router.post(
  "/intelligence/trends",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const { industry, timeframe } = req.body as {
      industry?: string;
      timeframe?: string;
    };

    if (
      !industry ||
      typeof industry !== "string" ||
      industry.trim().length === 0
    ) {
      res.status(400).json({ error: "industry is required" });
      return;
    }

    try {
      const result = await getTrends(industry.trim(), timeframe ?? "month");
      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Perplexity trends analysis failed");
      res.status(500).json({ error: "Market trends analysis failed" });
    }
  },
);

export default router;
