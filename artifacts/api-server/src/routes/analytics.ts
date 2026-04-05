import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  analyticsEvents,
  reportsTable,
  conversations,
  documents,
  workflowRuns,
  orgMembers,
  usersTable,
} from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!requireAuth(req, res)) return false;
  if (req.user!.orgRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// GET /analytics/summary - Org-wide metrics summary (admin only)
router.get("/analytics/summary", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  try {
    // Count total reports
    const [reportsCount] = await db
      .select({ count: count() })
      .from(reportsTable)
      .where(eq(reportsTable.orgId, orgId));

    // Count total documents
    const [documentsCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.orgId, orgId));

    // Count total workflow runs
    const [workflowsCount] = await db
      .select({ count: count() })
      .from(workflowRuns)
      .where(eq(workflowRuns.orgId, orgId));

    // Count total conversations
    const [conversationsCount] = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.orgId, orgId));

    // Count total users
    const [usersCount] = await db
      .select({ count: count() })
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));

    // Calculate cost this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [costData] = await db
      .select({ total: sql<number>`COALESCE(SUM(${analyticsEvents.dollarsCost}), 0)` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.orgId, orgId),
          gte(analyticsEvents.timestamp, monthStart),
          lte(analyticsEvents.timestamp, now),
        ),
      );

    res.json({
      totalReports: reportsCount.count,
      totalDocuments: documentsCount.count,
      totalWorkflows: workflowsCount.count,
      totalConversations: conversationsCount.count,
      totalUsers: usersCount.count,
      costThisMonth: costData?.total || 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch analytics summary");
    res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
});

// GET /analytics/usage-by-user - Usage breakdown per team member (admin)
router.get("/analytics/usage-by-user", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  try {
    const members = await db
      .select({
        userId: orgMembers.userId,
        userName: sql<string>`CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      })
      .from(orgMembers)
      .leftJoin(usersTable, eq(orgMembers.userId, usersTable.id))
      .where(eq(orgMembers.orgId, orgId));

    const usage = await Promise.all(
      members.map(async (member) => {
        const [reportsCount] = await db
          .select({ count: count() })
          .from(reportsTable)
          .where(and(eq(reportsTable.orgId, orgId), eq(reportsTable.userId, member.userId)));

        const [conversationsCount] = await db
          .select({ count: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.orgId, orgId),
              eq(conversations.userId, member.userId),
            ),
          );

        const [workflowsCount] = await db
          .select({ count: count() })
          .from(workflowRuns)
          .where(
            and(
              eq(workflowRuns.orgId, orgId),
              eq(workflowRuns.userId, member.userId),
            ),
          );

        const [documentsCount] = await db
          .select({ count: count() })
          .from(documents)
          .where(
            and(
              eq(documents.orgId, orgId),
              eq(documents.userId, member.userId),
            ),
          );

        return {
          userId: member.userId,
          userName: member.userName,
          reportsCount: reportsCount.count,
          conversationsCount: conversationsCount.count,
          workflowsCount: workflowsCount.count,
          documentsCount: documentsCount.count,
        };
      }),
    );

    res.json(usage);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch usage by user");
    res.status(500).json({ error: "Failed to fetch usage by user" });
  }
});

// GET /analytics/usage-by-feature - Usage per feature over time (admin)
router.get("/analytics/usage-by-feature", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  // Parse query parameters
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const granularity = (req.query.granularity as string) || "day";

  if (!["day", "week", "month"].includes(granularity)) {
    res.status(400).json({ error: "Invalid granularity. Must be day, week, or month" });
    return;
  }

  try {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.orgId, orgId),
          gte(analyticsEvents.timestamp, start),
          lte(analyticsEvents.timestamp, end),
        ),
      )
      .orderBy(analyticsEvents.timestamp);

    // Group events by feature and time period
    const grouped = new Map<string, Map<string, number>>();

    events.forEach((event) => {
      const feature = event.feature || "unknown";
      const timestamp = event.timestamp;

      // Calculate bucket based on granularity
      let bucket: string;
      if (granularity === "day") {
        bucket = timestamp.toISOString().split("T")[0];
      } else if (granularity === "week") {
        const date = new Date(timestamp);
        const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
        bucket = startOfWeek.toISOString().split("T")[0];
      } else {
        // month
        bucket = timestamp.toISOString().slice(0, 7);
      }

      if (!grouped.has(feature)) {
        grouped.set(feature, new Map());
      }
      const featureData = grouped.get(feature)!;
      featureData.set(bucket, (featureData.get(bucket) || 0) + 1);
    });

    // Convert to array format
    const result = Array.from(grouped.entries()).map(([feature, buckets]) => ({
      feature,
      data: Array.from(buckets.entries())
        .map(([bucket, count]) => ({ timestamp: bucket, count }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch usage by feature");
    res.status(500).json({ error: "Failed to fetch usage by feature" });
  }
});

// GET /analytics/cost-tracking - Token/cost breakdown (admin)
router.get("/analytics/cost-tracking", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total tokens and cost
    const [totalData] = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${analyticsEvents.tokensCost}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${analyticsEvents.dollarsCost}), 0)`,
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.orgId, orgId));

    // Get cost trend (last 30 days)
    const costTrendData = await db
      .select({
        date: sql<string>`DATE(${analyticsEvents.timestamp})`,
        cost: sql<number>`COALESCE(SUM(${analyticsEvents.dollarsCost}), 0)`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.orgId, orgId),
          gte(analyticsEvents.timestamp, thirtyDaysAgo),
        ),
      )
      .groupBy(sql`DATE(${analyticsEvents.timestamp})`)
      .orderBy(sql`DATE(${analyticsEvents.timestamp})`);

    // Get cost by feature
    const costByFeatureData = await db
      .select({
        feature: analyticsEvents.feature,
        cost: sql<number>`COALESCE(SUM(${analyticsEvents.dollarsCost}), 0)`,
        tokens: sql<number>`COALESCE(SUM(${analyticsEvents.tokensCost}), 0)`,
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.orgId, orgId))
      .groupBy(analyticsEvents.feature)
      .orderBy(sql`SUM(${analyticsEvents.dollarsCost}) DESC`);

    res.json({
      totalTokens: totalData?.totalTokens || 0,
      totalCost: totalData?.totalCost || 0,
      costByFeature: costByFeatureData.map((item) => ({
        feature: item.feature || "unknown",
        cost: item.cost || 0,
        tokens: item.tokens || 0,
      })),
      costTrend: costTrendData.map((item) => ({
        date: item.date,
        cost: item.cost || 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch cost tracking");
    res.status(500).json({ error: "Failed to fetch cost tracking" });
  }
});

// GET /analytics/usage-over-time - Daily event counts for last 30 days (admin)
router.get("/analytics/usage-over-time", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyCounts = await db
      .select({
        date: sql<string>`DATE(${analyticsEvents.timestamp})`,
        count: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.orgId, orgId),
          gte(analyticsEvents.timestamp, thirtyDaysAgo),
        ),
      )
      .groupBy(sql`DATE(${analyticsEvents.timestamp})`)
      .orderBy(sql`DATE(${analyticsEvents.timestamp})`);

    // Fill in missing days with 0 counts
    const result: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const found = dailyCounts.find((r) => r.date === dateStr);
      result.push({ date: dateStr, count: found ? Number(found.count) : 0 });
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch usage over time");
    res.status(500).json({ error: "Failed to fetch usage over time" });
  }
});

// GET /analytics/recent-activity - Last 50 analytics events (admin)
router.get("/analytics/recent-activity", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  try {
    const events = await db
      .select({
        id: analyticsEvents.id,
        eventType: analyticsEvents.eventType,
        feature: analyticsEvents.feature,
        resourceType: analyticsEvents.resourceType,
        resourceId: analyticsEvents.resourceId,
        tokensInput: analyticsEvents.tokensInput,
        tokensOutput: analyticsEvents.tokensOutput,
        dollarsCost: analyticsEvents.dollarsCost,
        timestamp: analyticsEvents.timestamp,
        userId: analyticsEvents.userId,
        userName: sql<string>`CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})`,
      })
      .from(analyticsEvents)
      .leftJoin(usersTable, eq(analyticsEvents.userId, usersTable.id))
      .where(eq(analyticsEvents.orgId, orgId))
      .orderBy(sql`${analyticsEvents.timestamp} DESC`)
      .limit(50);

    res.json(
      events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        feature: e.feature || null,
        resourceType: e.resourceType || null,
        resourceId: e.resourceId,
        tokensInput: e.tokensInput ? Number(e.tokensInput) : null,
        tokensOutput: e.tokensOutput ? Number(e.tokensOutput) : null,
        dollarsCost: e.dollarsCost ? Number(e.dollarsCost) : null,
        timestamp: e.timestamp.toISOString(),
        userId: e.userId,
        userName: e.userName?.trim() || null,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recent activity");
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

export default router;
