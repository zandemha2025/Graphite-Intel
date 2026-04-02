/**
 * Comments endpoints — threaded comments on any resource.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, comments, activityFeed } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /comments/:resourceType/:resourceId
 * List comments on a resource (top-level first, then threaded).
 */
router.get("/comments/:resourceType/:resourceId", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const { resourceType, resourceId: rawId } = req.params;
  const resourceId = parseInt(rawId as string);

  if (isNaN(resourceId)) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }

  try {
    const allComments = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.orgId, orgId),
          eq(comments.resourceType, resourceType as string),
          eq(comments.resourceId, resourceId),
        ),
      )
      .orderBy(comments.createdAt);

    // Build threaded structure
    const topLevel = allComments.filter((c) => !c.parentId);
    const repliesMap = new Map<number, typeof allComments>();
    for (const c of allComments) {
      if (c.parentId) {
        const existing = repliesMap.get(c.parentId) ?? [];
        existing.push(c);
        repliesMap.set(c.parentId, existing);
      }
    }

    const threaded = topLevel.map((c) => ({
      ...c,
      replies: repliesMap.get(c.id) ?? [],
    }));

    res.json(threaded);
  } catch (err) {
    req.log.error({ err }, "Failed to list comments");
    res.status(500).json({ error: "Failed to list comments" });
  }
});

/**
 * POST /comments
 * Create a comment (or reply).
 */
router.post("/comments", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { resourceType, resourceId, content, parentId, anchor } = req.body;

    if (!resourceType || !resourceId || !content) {
      res.status(400).json({ error: "resourceType, resourceId, and content are required" });
      return;
    }

    const [comment] = await db
      .insert(comments)
      .values({
        orgId,
        resourceType,
        resourceId,
        parentId: parentId ?? null,
        userId,
        content,
        anchor: anchor ?? null,
      })
      .returning();

    // Log activity
    await db.insert(activityFeed).values({
      orgId,
      userId,
      action: "commented",
      resourceType,
      resourceId,
      metadata: { commentId: comment.id, isReply: !!parentId },
    });

    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }, "Failed to create comment");
    res.status(500).json({ error: "Failed to create comment" });
  }
});

/**
 * PATCH /comments/:id
 * Edit a comment (only by the author).
 */
router.patch("/comments/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.orgId, orgId), eq(comments.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Comment not found or not yours" });
      return;
    }

    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const [updated] = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update comment");
    res.status(500).json({ error: "Failed to update comment" });
  }
});

/**
 * DELETE /comments/:id
 * Delete a comment (only by the author or org admin).
 */
router.delete("/comments/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    // Allow deletion by author or org admin/owner
    const isAuthor = existing.userId === userId;
    const isAdmin = req.user!.orgRole === "admin" || req.user!.orgRole === "owner";
    if (!isAuthor && !isAdmin) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    await db.delete(comments).where(eq(comments.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete comment");
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

/**
 * POST /comments/:id/resolve
 * Mark a comment thread as resolved.
 */
router.post("/comments/:id/resolve", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    const [updated] = await db
      .update(comments)
      .set({ isResolved: true, resolvedByUserId: userId })
      .where(eq(comments.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to resolve comment");
    res.status(500).json({ error: "Failed to resolve comment" });
  }
});

export { router as commentsRouter };
export default router;
