import { Router, type IRouter, type Request, type Response } from "express";
import { db, auditLogs } from "@workspace/db";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";

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

// GET /audit/logs - List org audit logs (admin only)
router.get("/audit/logs", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;

  // Parse query parameters
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const offset = parseInt(req.query.offset as string) || 0;
  const userId = req.query.userId as string | undefined;
  const resourceType = req.query.resourceType as string | undefined;
  const action = req.query.action as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  try {
    const conditions = [eq(auditLogs.orgId, orgId)];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType));
    }
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(and(...conditions));

    const total = Number(countResult?.total ?? 0);

    res.json({
      logs,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch audit logs");
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// GET /audit/logs/:resourceType/:resourceId - Get audit trail for specific resource
router.get("/audit/logs/:resourceType/:resourceId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;
  const resourceType = req.params.resourceType as string;
  const resourceId = req.params.resourceId as string;

  if (!resourceType || !resourceId) {
    res.status(400).json({ error: "resourceType and resourceId are required" });
    return;
  }

  try {
    const parsedResourceId = parseInt(resourceId);
    if (isNaN(parsedResourceId)) {
      res.status(400).json({ error: "resourceId must be a number" });
      return;
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.orgId, orgId),
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, parsedResourceId),
        ),
      )
      .orderBy(desc(auditLogs.timestamp));

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch resource audit trail");
    res.status(500).json({ error: "Failed to fetch resource audit trail" });
  }
});

export default router;
