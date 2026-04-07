import { Router, type IRouter, type Request, type Response } from "express";
import { db, companyProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  monitorCompetitor,
  synthesizeSignals,
  type CompetitorBrief,
} from "../lib/competitor-monitor";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function profileFilter(req: Request) {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(companyProfiles.orgId, orgId);
  }
  return eq(companyProfiles.userId, userId);
}

/** Parse the competitors CSV string into an array */
function parseCompetitors(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

/* ---------- GET /api/intelligence/monitor/:competitor ---------- */

router.get(
  "/intelligence/monitor/:competitor",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const rawParam = req.params.competitor;
    const competitorName = decodeURIComponent(
      Array.isArray(rawParam) ? rawParam[0] : rawParam,
    );
    if (!competitorName) {
      res.status(400).json({ error: "Competitor name is required" });
      return;
    }

    try {
      const signals = await monitorCompetitor(competitorName);
      const { synthesis, recommendedAction } = await synthesizeSignals(
        competitorName,
        signals,
      );

      const brief: CompetitorBrief = {
        competitor: competitorName,
        signals,
        synthesis,
        recommendedAction,
      };

      res.json(brief);
    } catch (err) {
      req.log.error({ err }, "Failed to monitor competitor");
      res.status(500).json({ error: "Failed to monitor competitor" });
    }
  },
);

/* ---------- GET /api/intelligence/brief ---------- */

router.get("/intelligence/brief", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  try {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(profileFilter(req))
      .limit(1);

    if (!profile) {
      res.json({
        briefs: [],
        message: "No company profile found. Set up your context first.",
      });
      return;
    }

    const competitors = parseCompetitors(profile.competitors);

    if (competitors.length === 0) {
      res.json({
        briefs: [],
        message:
          "No competitors tracked. Add competitors in Context or use the Track button.",
      });
      return;
    }

    // Monitor all competitors in parallel (cap at 5 to avoid rate limits)
    const briefs: CompetitorBrief[] = await Promise.all(
      competitors.slice(0, 5).map(async (name) => {
        const signals = await monitorCompetitor(name);
        const { synthesis, recommendedAction } = await synthesizeSignals(
          name,
          signals,
        );
        return { competitor: name, signals, synthesis, recommendedAction };
      }),
    );

    res.json({ briefs });
  } catch (err) {
    req.log.error({ err }, "Failed to generate intelligence brief");
    res.status(500).json({ error: "Failed to generate intelligence brief" });
  }
});

/* ---------- POST /api/intelligence/track ---------- */

router.post("/intelligence/track", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Competitor name is required" });
    return;
  }

  try {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(profileFilter(req))
      .limit(1);

    if (!profile) {
      res.status(400).json({ error: "No company profile found" });
      return;
    }

    const competitors = parseCompetitors(profile.competitors);
    const trimmed = name.trim();

    if (competitors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      res.json({ message: "Competitor already tracked", competitors });
      return;
    }

    competitors.push(trimmed);
    const updatedCsv = competitors.join(", ");

    await db
      .update(companyProfiles)
      .set({ competitors: updatedCsv })
      .where(eq(companyProfiles.id, profile.id));

    res.json({ message: "Competitor added", competitors });
  } catch (err) {
    req.log.error({ err }, "Failed to track competitor");
    res.status(500).json({ error: "Failed to track competitor" });
  }
});

/* ---------- DELETE /api/intelligence/track/:name ---------- */

router.delete(
  "/intelligence/track/:name",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const rawName = req.params.name;
    const competitorName = decodeURIComponent(
      Array.isArray(rawName) ? rawName[0] : rawName,
    );

    try {
      const [profile] = await db
        .select()
        .from(companyProfiles)
        .where(profileFilter(req))
        .limit(1);

      if (!profile) {
        res.status(400).json({ error: "No company profile found" });
        return;
      }

      let competitors = parseCompetitors(profile.competitors);
      competitors = competitors.filter(
        (c) => c.toLowerCase() !== competitorName.toLowerCase(),
      );
      const updatedCsv = competitors.join(", ");

      await db
        .update(companyProfiles)
        .set({ competitors: updatedCsv })
        .where(eq(companyProfiles.id, profile.id));

      res.json({ message: "Competitor removed", competitors });
    } catch (err) {
      req.log.error({ err }, "Failed to remove competitor");
      res.status(500).json({ error: "Failed to remove competitor" });
    }
  },
);

export default router;
