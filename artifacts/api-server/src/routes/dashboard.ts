import { Router, type IRouter, type Request, type Response } from "express";
import { db, reportsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function dashboardFilter(req: Request) {
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(reportsTable.orgId, orgId);
  }
  return eq(reportsTable.userId, req.user!.id);
}

router.get("/dashboard/summary", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  try {
    const [totals] = await db
      .select({
        total: count(),
        complete: sql<number>`count(*) filter (where ${reportsTable.status} = 'complete')`,
        generating: sql<number>`count(*) filter (where ${reportsTable.status} = 'generating')`,
        failed: sql<number>`count(*) filter (where ${reportsTable.status} = 'failed')`,
      })
      .from(reportsTable)
      .where(dashboardFilter(req));

    res.json({
      totalReports: Number(totals?.total ?? 0),
      completedReports: Number(totals?.complete ?? 0),
      generatingReports: Number(totals?.generating ?? 0),
      failedReports: Number(totals?.failed ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch dashboard summary");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

router.get("/dashboard/recent-reports", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  try {
    const reports = await db
      .select()
      .from(reportsTable)
      .where(dashboardFilter(req))
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit);

    res.json(reports);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recent reports");
    res.status(500).json({ error: "Failed to fetch recent reports" });
  }
});

router.get("/dashboard/report-type-stats", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  try {
    const stats = await db
      .select({
        reportType: reportsTable.reportType,
        count: count(),
      })
      .from(reportsTable)
      .where(dashboardFilter(req))
      .groupBy(reportsTable.reportType);

    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch report type stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
