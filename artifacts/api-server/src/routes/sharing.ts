/**
 * Resource sharing endpoints.
 * Share documents, reports, vault projects, etc. with other org members or guest emails.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, resourceShares, activityFeed } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * POST /sharing/share
 * Share a resource with a user or email.
 */
router.post("/sharing/share", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { resourceType, resourceId, sharedWithUserId, sharedWithEmail, permission, expiresAt } = req.body;

    if (!resourceType || !resourceId) {
      res.status(400).json({ error: "resourceType and resourceId are required" });
      return;
    }

    if (!sharedWithUserId && !sharedWithEmail) {
      res.status(400).json({ error: "Either sharedWithUserId or sharedWithEmail is required" });
      return;
    }

    const [share] = await db
      .insert(resourceShares)
      .values({
        orgId,
        resourceType,
        resourceId,
        sharedByUserId: userId,
        sharedWithUserId: sharedWithUserId ?? null,
        sharedWithEmail: sharedWithEmail ?? null,
        permission: permission ?? "read",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    // Log activity
    await db.insert(activityFeed).values({
      orgId,
      userId,
      action: "shared",
      resourceType,
      resourceId,
      metadata: { sharedWithUserId, sharedWithEmail, permission },
    });

    res.status(201).json(share);
  } catch (err) {
    req.log.error({ err }, "Failed to create share");
    res.status(500).json({ error: "Failed to share resource" });
  }
});

/**
 * GET /sharing/resource/:type/:id
 * List who has access to a resource.
 */
router.get("/sharing/resource/:type/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const resourceType = req.params.type;
  const resourceId = parseInt(req.params.id as string);

  if (isNaN(resourceId)) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }

  try {
    const shares = await db
      .select()
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.orgId, orgId),
          eq(resourceShares.resourceType, resourceType as string),
          eq(resourceShares.resourceId, resourceId),
          eq(resourceShares.isActive, true),
        ),
      )
      .orderBy(resourceShares.createdAt);

    res.json(shares);
  } catch (err) {
    req.log.error({ err }, "Failed to list resource shares");
    res.status(500).json({ error: "Failed to list shares" });
  }
});

/**
 * DELETE /sharing/:shareId
 * Revoke a share.
 */
router.delete("/sharing/:shareId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const shareId = parseInt(req.params.shareId as string);

  if (isNaN(shareId)) {
    res.status(400).json({ error: "Invalid share id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(resourceShares)
      .where(and(eq(resourceShares.id, shareId), eq(resourceShares.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Share not found" });
      return;
    }

    const [updated] = await db
      .update(resourceShares)
      .set({ isActive: false })
      .where(eq(resourceShares.id, shareId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to revoke share");
    res.status(500).json({ error: "Failed to revoke share" });
  }
});

/**
 * PATCH /sharing/:shareId
 * Update share permission or expiry.
 */
router.patch("/sharing/:shareId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const shareId = parseInt(req.params.shareId as string);

  if (isNaN(shareId)) {
    res.status(400).json({ error: "Invalid share id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(resourceShares)
      .where(and(eq(resourceShares.id, shareId), eq(resourceShares.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Share not found" });
      return;
    }

    const { permission, expiresAt } = req.body;

    const [updated] = await db
      .update(resourceShares)
      .set({
        ...(permission !== undefined && { permission }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      })
      .where(eq(resourceShares.id, shareId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update share");
    res.status(500).json({ error: "Failed to update share" });
  }
});

/**
 * GET /sharing/shared-with-me
 * List all resources shared with the current user.
 */
router.get("/sharing/shared-with-me", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const shares = await db
      .select()
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.orgId, orgId),
          eq(resourceShares.isActive, true),
          eq(resourceShares.sharedWithUserId, userId),
        ),
      )
      .orderBy(resourceShares.createdAt);

    res.json(shares);
  } catch (err) {
    req.log.error({ err }, "Failed to list shared resources");
    res.status(500).json({ error: "Failed to list shared resources" });
  }
});

/**
 * GET /sharing/shared-by-me
 * List all resources the current user has shared with others.
 */
router.get("/sharing/shared-by-me", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const shares = await db
      .select()
      .from(resourceShares)
      .where(
        and(
          eq(resourceShares.orgId, orgId),
          eq(resourceShares.isActive, true),
          eq(resourceShares.sharedByUserId, userId),
        ),
      )
      .orderBy(resourceShares.createdAt);

    res.json(shares);
  } catch (err) {
    req.log.error({ err }, "Failed to list shared-by-me resources");
    res.status(500).json({ error: "Failed to list shared resources" });
  }
});

export { router as sharingRouter };
export default router;
