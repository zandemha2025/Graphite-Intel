import { Router, type IRouter, type Request, type Response } from "express";
import { db, genericWebhooks } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ---------- GET /webhooks ---------- */

router.get("/webhooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const hooks = await db
      .select()
      .from(genericWebhooks)
      .where(eq(genericWebhooks.orgId, orgId))
      .orderBy(desc(genericWebhooks.createdAt));

    res.json(hooks);
  } catch (err) {
    req.log.error({ err }, "Failed to list webhooks");
    res.status(500).json({ error: "Failed to list webhooks" });
  }
});

/* ---------- POST /webhooks ---------- */

router.post("/webhooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const { name, workflowId } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const secret = randomBytes(32).toString("hex");

    const [webhook] = await db
      .insert(genericWebhooks)
      .values({
        orgId,
        name,
        secret,
        workflowId: workflowId ?? null,
      })
      .returning();

    res.status(201).json(webhook);
  } catch (err) {
    req.log.error({ err }, "Failed to create webhook");
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

/* ---------- DELETE /webhooks/:id ---------- */

router.delete("/webhooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid webhook id" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(genericWebhooks)
      .where(
        and(
          eq(genericWebhooks.id, id),
          eq(genericWebhooks.orgId, orgId),
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete webhook");
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

/* ---------- POST /webhooks/:id/test ---------- */

router.post("/webhooks/:id/test", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid webhook id" });
    return;
  }

  try {
    const [updated] = await db
      .update(genericWebhooks)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: sql`COALESCE(${genericWebhooks.triggerCount}, 0) + 1`,
      })
      .where(
        and(
          eq(genericWebhooks.id, id),
          eq(genericWebhooks.orgId, orgId),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    res.json({
      success: true,
      webhookId: updated.id,
      triggeredAt: updated.lastTriggeredAt,
      triggerCount: updated.triggerCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to test webhook");
    res.status(500).json({ error: "Failed to test webhook" });
  }
});

export { router as genericWebhooksRouter };
export default router;
