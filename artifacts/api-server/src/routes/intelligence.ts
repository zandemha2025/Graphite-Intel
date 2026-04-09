import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  companyProfiles,
  intelligenceConfigs,
  kpiAlerts,
  kpiThresholds,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
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

/* ---------- GET /api/intelligence/daily-brief ---------- */

router.get(
  "/intelligence/daily-brief",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    try {
      const [profile] = await db
        .select()
        .from(companyProfiles)
        .where(profileFilter(req))
        .limit(1);

      if (!profile) {
        res.json({
          brief: null,
          highlights: [],
          generatedAt: new Date().toISOString(),
          competitors: [],
        });
        return;
      }

      const competitors = parseCompetitors(profile.competitors);

      if (competitors.length === 0) {
        res.json({
          brief: "No competitors tracked. Add competitors in Context to receive daily briefs.",
          highlights: [],
          generatedAt: new Date().toISOString(),
          competitors: [],
        });
        return;
      }

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

      const highlights = briefs.map((b) => ({
        competitor: b.competitor,
        headline: b.synthesis.substring(0, 200),
        action: b.recommendedAction,
      }));

      const brief = briefs
        .map((b) => `**${b.competitor}**: ${b.synthesis}`)
        .join("\n\n");

      res.json({
        brief,
        highlights,
        generatedAt: new Date().toISOString(),
        competitors,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to generate daily brief");
      res.status(500).json({ error: "Failed to generate daily brief" });
    }
  },
);

/* ---------- POST /api/intelligence/daily-brief/generate ---------- */

router.post(
  "/intelligence/daily-brief/generate",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    try {
      const [profile] = await db
        .select()
        .from(companyProfiles)
        .where(profileFilter(req))
        .limit(1);

      if (!profile) {
        res.json({
          brief: null,
          highlights: [],
          generatedAt: new Date().toISOString(),
          competitors: [],
        });
        return;
      }

      const competitors = parseCompetitors(profile.competitors);

      if (competitors.length === 0) {
        res.json({
          brief: "No competitors tracked. Add competitors in Context to receive daily briefs.",
          highlights: [],
          generatedAt: new Date().toISOString(),
          competitors: [],
        });
        return;
      }

      // Always fresh -- re-fetch all competitor signals
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

      const highlights = briefs.map((b) => ({
        competitor: b.competitor,
        headline: b.synthesis.substring(0, 200),
        action: b.recommendedAction,
      }));

      const brief = briefs
        .map((b) => `**${b.competitor}**: ${b.synthesis}`)
        .join("\n\n");

      res.json({
        brief,
        highlights,
        generatedAt: new Date().toISOString(),
        competitors,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to regenerate daily brief");
      res.status(500).json({ error: "Failed to regenerate daily brief" });
    }
  },
);

/* ---------- GET /api/intelligence/monitoring-preferences ---------- */

router.get(
  "/intelligence/monitoring-preferences",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.json({
        schedule: "off",
        delivery: { inApp: true, email: null, slack: null },
      });
      return;
    }

    try {
      const [config] = await db
        .select()
        .from(intelligenceConfigs)
        .where(eq(intelligenceConfigs.orgId, orgId))
        .limit(1);

      if (!config) {
        res.json({
          schedule: "off",
          delivery: { inApp: true, email: null, slack: null },
        });
        return;
      }

      res.json({
        schedule: config.monitoringSchedule,
        delivery: {
          inApp: config.deliveryInApp,
          email: config.deliveryEmail,
          slack: config.deliverySlack,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch monitoring preferences");
      res.status(500).json({ error: "Failed to fetch monitoring preferences" });
    }
  },
);

/* ---------- POST /api/intelligence/monitoring-preferences ---------- */

router.post(
  "/intelligence/monitoring-preferences",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.status(400).json({ error: "Organization required" });
      return;
    }

    const { schedule, delivery } = req.body;

    try {
      const [existing] = await db
        .select()
        .from(intelligenceConfigs)
        .where(eq(intelligenceConfigs.orgId, orgId))
        .limit(1);

      const values = {
        monitoringSchedule: schedule ?? "off",
        deliveryInApp: delivery?.inApp ?? true,
        deliveryEmail: delivery?.email ?? null,
        deliverySlack: delivery?.slack ?? null,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(intelligenceConfigs)
          .set(values)
          .where(eq(intelligenceConfigs.orgId, orgId));
      } else {
        await db
          .insert(intelligenceConfigs)
          .values({ orgId, ...values });
      }

      res.json({
        schedule: values.monitoringSchedule,
        delivery: {
          inApp: values.deliveryInApp,
          email: values.deliveryEmail,
          slack: values.deliverySlack,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to save monitoring preferences");
      res.status(500).json({ error: "Failed to save monitoring preferences" });
    }
  },
);

/* ---------- GET /api/intelligence/alert-config ---------- */

router.get(
  "/intelligence/alert-config",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    const defaults = {
      alerts: {
        competitorMoves: true,
        marketShifts: true,
        negativeSentiment: true,
        campaignAnomalies: true,
      },
      delivery: { inApp: true, email: null, slack: null },
    };

    if (!orgId) {
      res.json(defaults);
      return;
    }

    try {
      const [config] = await db
        .select()
        .from(intelligenceConfigs)
        .where(eq(intelligenceConfigs.orgId, orgId))
        .limit(1);

      if (!config) {
        res.json(defaults);
        return;
      }

      res.json({
        alerts: {
          competitorMoves: config.alertCompetitorMoves,
          marketShifts: config.alertMarketShifts,
          negativeSentiment: config.alertNegativeSentiment,
          campaignAnomalies: config.alertCampaignAnomalies,
        },
        delivery: {
          inApp: config.deliveryInApp,
          email: config.deliveryEmail,
          slack: config.deliverySlack,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch alert config");
      res.status(500).json({ error: "Failed to fetch alert config" });
    }
  },
);

/* ---------- POST /api/intelligence/alert-config ---------- */

router.post(
  "/intelligence/alert-config",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.status(400).json({ error: "Organization required" });
      return;
    }

    const { alerts, delivery } = req.body;

    try {
      const [existing] = await db
        .select()
        .from(intelligenceConfigs)
        .where(eq(intelligenceConfigs.orgId, orgId))
        .limit(1);

      const values = {
        alertCompetitorMoves: alerts?.competitorMoves ?? true,
        alertMarketShifts: alerts?.marketShifts ?? true,
        alertNegativeSentiment: alerts?.negativeSentiment ?? true,
        alertCampaignAnomalies: alerts?.campaignAnomalies ?? true,
        deliveryInApp: delivery?.inApp ?? true,
        deliveryEmail: delivery?.email ?? null,
        deliverySlack: delivery?.slack ?? null,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(intelligenceConfigs)
          .set(values)
          .where(eq(intelligenceConfigs.orgId, orgId));
      } else {
        await db
          .insert(intelligenceConfigs)
          .values({ orgId, ...values });
      }

      res.json({
        alerts: {
          competitorMoves: values.alertCompetitorMoves,
          marketShifts: values.alertMarketShifts,
          negativeSentiment: values.alertNegativeSentiment,
          campaignAnomalies: values.alertCampaignAnomalies,
        },
        delivery: {
          inApp: values.deliveryInApp,
          email: values.deliveryEmail,
          slack: values.deliverySlack,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Failed to save alert config");
      res.status(500).json({ error: "Failed to save alert config" });
    }
  },
);

/* ---------- GET /api/intelligence/kpi-alerts ---------- */

router.get(
  "/intelligence/kpi-alerts",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.json([]);
      return;
    }

    try {
      const alerts = await db
        .select()
        .from(kpiAlerts)
        .where(
          and(
            eq(kpiAlerts.orgId, orgId),
            eq(kpiAlerts.dismissed, false),
          ),
        )
        .orderBy(desc(kpiAlerts.createdAt));

      res.json(alerts);
    } catch (err) {
      req.log.error({ err }, "Failed to fetch KPI alerts");
      res.status(500).json({ error: "Failed to fetch KPI alerts" });
    }
  },
);

/* ---------- PATCH /api/intelligence/kpi-alerts/:id/dismiss ---------- */

router.patch(
  "/intelligence/kpi-alerts/:id/dismiss",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;
    const id = parseInt(req.params.id as string);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid alert id" });
      return;
    }

    if (!orgId) {
      res.status(400).json({ error: "Organization required" });
      return;
    }

    try {
      const [updated] = await db
        .update(kpiAlerts)
        .set({ dismissed: true })
        .where(and(eq(kpiAlerts.id, id), eq(kpiAlerts.orgId, orgId)))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Alert not found" });
        return;
      }

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to dismiss KPI alert");
      res.status(500).json({ error: "Failed to dismiss KPI alert" });
    }
  },
);

/* ---------- GET /api/intelligence/kpi-thresholds ---------- */

router.get(
  "/intelligence/kpi-thresholds",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.json([]);
      return;
    }

    try {
      const thresholds = await db
        .select()
        .from(kpiThresholds)
        .where(eq(kpiThresholds.orgId, orgId));

      res.json(thresholds);
    } catch (err) {
      req.log.error({ err }, "Failed to fetch KPI thresholds");
      res.status(500).json({ error: "Failed to fetch KPI thresholds" });
    }
  },
);

/* ---------- POST /api/intelligence/kpi-thresholds ---------- */

router.post(
  "/intelligence/kpi-thresholds",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId;

    if (!orgId) {
      res.status(400).json({ error: "Organization required" });
      return;
    }

    const { thresholds, checkFrequency } = req.body;

    if (!thresholds || typeof thresholds !== "object") {
      res.status(400).json({ error: "thresholds object is required" });
      return;
    }

    try {
      // Delete existing thresholds for this org
      await db
        .delete(kpiThresholds)
        .where(eq(kpiThresholds.orgId, orgId));

      // Insert new thresholds for each metric
      const rows = Object.entries(thresholds).map(
        ([metric, config]: [string, any]) => ({
          orgId,
          metric,
          direction: config.direction as string,
          percent: config.percent as number,
          checkFrequency: checkFrequency ?? "6h",
        }),
      );

      if (rows.length > 0) {
        await db.insert(kpiThresholds).values(rows);
      }

      const inserted = await db
        .select()
        .from(kpiThresholds)
        .where(eq(kpiThresholds.orgId, orgId));

      res.json(inserted);
    } catch (err) {
      req.log.error({ err }, "Failed to save KPI thresholds");
      res.status(500).json({ error: "Failed to save KPI thresholds" });
    }
  },
);

export default router;
