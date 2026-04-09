/**
 * Notifications API -- user notifications with read/unread tracking.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, notifications } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET /notifications/unread-count -- return count of unread notifications
// ---------------------------------------------------------------------------

router.get("/notifications/unread-count", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);

  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ count: result?.count ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to get unread count");
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// ---------------------------------------------------------------------------
// GET /notifications -- list notifications for the user
// ---------------------------------------------------------------------------

router.get("/notifications", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);

  try {
    const limitParam = parseInt(req.query.limit as string);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 10 : limitParam;

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /notifications/:id/read -- mark a notification as read
// ---------------------------------------------------------------------------

router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = String(req.user!.id);
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

export default router;
