import { Router, type IRouter, type Request, type Response } from "express";
import { db, scheduledQueries } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const VALID_SCHEDULES = ["daily", "weekly"];

/** Compute nextRunAt based on schedule type */
function computeNextRun(schedule: string): Date {
  const now = new Date();
  if (schedule === "weekly") {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  // daily
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

/* ---------- GET /scheduled-queries ---------- */

router.get("/scheduled-queries", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const queries = await db
      .select()
      .from(scheduledQueries)
      .where(
        and(
          eq(scheduledQueries.orgId, orgId),
          eq(scheduledQueries.userId, userId),
        ),
      )
      .orderBy(desc(scheduledQueries.createdAt));

    res.json(queries);
  } catch (err) {
    req.log.error({ err }, "Failed to list scheduled queries");
    res.status(500).json({ error: "Failed to list scheduled queries" });
  }
});

/* ---------- POST /scheduled-queries ---------- */

router.post("/scheduled-queries", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const { query, schedule } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  if (!schedule || !VALID_SCHEDULES.includes(schedule)) {
    res.status(400).json({ error: "schedule must be 'daily' or 'weekly'" });
    return;
  }

  try {
    const [created] = await db
      .insert(scheduledQueries)
      .values({
        orgId,
        userId,
        query,
        schedule,
        nextRunAt: computeNextRun(schedule),
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create scheduled query");
    res.status(500).json({ error: "Failed to create scheduled query" });
  }
});

/* ---------- PATCH /scheduled-queries/:id ---------- */

router.patch("/scheduled-queries/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid query id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(scheduledQueries)
      .where(
        and(
          eq(scheduledQueries.id, id),
          eq(scheduledQueries.orgId, orgId),
          eq(scheduledQueries.userId, userId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Scheduled query not found" });
      return;
    }

    const { active, schedule } = req.body;

    if (schedule !== undefined && !VALID_SCHEDULES.includes(schedule)) {
      res.status(400).json({ error: "schedule must be 'daily' or 'weekly'" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (active !== undefined) updates.active = active;
    if (schedule !== undefined) {
      updates.schedule = schedule;
      updates.nextRunAt = computeNextRun(schedule);
    }

    const [updated] = await db
      .update(scheduledQueries)
      .set(updates)
      .where(eq(scheduledQueries.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update scheduled query");
    res.status(500).json({ error: "Failed to update scheduled query" });
  }
});

/* ---------- DELETE /scheduled-queries/:id ---------- */

router.delete("/scheduled-queries/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid query id" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(scheduledQueries)
      .where(
        and(
          eq(scheduledQueries.id, id),
          eq(scheduledQueries.orgId, orgId),
          eq(scheduledQueries.userId, userId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Scheduled query not found" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete scheduled query");
    res.status(500).json({ error: "Failed to delete scheduled query" });
  }
});

export { router as scheduledQueriesRouter };
export default router;
