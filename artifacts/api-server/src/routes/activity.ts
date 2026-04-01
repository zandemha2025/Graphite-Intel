/**
 * Activity feed endpoint — org-wide activity stream.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, activityFeed } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /activity
 * Get org activity feed (paginated, filterable by user/resource type).
 * Query params: ?userId=... &resourceType=... &limit=50 &offset=0
 */
router.get("/activity", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const userId = req.query.userId as string | undefined;
    const resourceType = req.query.resourceType as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) ?? "50"), 100);
    const offset = parseInt((req.query.offset as string) ?? "0");

    const conditions = [eq(activityFeed.orgId, orgId)];
    if (userId) conditions.push(eq(activityFeed.userId, userId));
    if (resourceType) conditions.push(eq(activityFeed.resourceType, resourceType));

    const items = await db
      .select()
      .from(activityFeed)
      .where(and(...conditions))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityFeed)
      .where(and(...conditions));

    res.json({ items, total: Number(count), limit, offset });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch activity feed");
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export { router as activityRouter };
export default router;
