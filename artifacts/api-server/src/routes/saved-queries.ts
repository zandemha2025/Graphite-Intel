/**
 * CRUD endpoints for saved vault search queries.
 * Users can save, list, update, delete, and re-run favourite searches.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, savedVaultQueries } from "@workspace/db";
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
 * GET /vault/saved-queries
 * List saved queries for the org (own + shared).
 */
router.get("/vault/saved-queries", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const queries = await db
      .select()
      .from(savedVaultQueries)
      .where(
        and(
          eq(savedVaultQueries.orgId, orgId),
          or(
            eq(savedVaultQueries.createdByUserId, userId),
            eq(savedVaultQueries.isShared, "org"),
          ),
        ),
      )
      .orderBy(savedVaultQueries.updatedAt);

    res.json(queries);
  } catch (err) {
    req.log.error({ err }, "Failed to list saved queries");
    res.status(500).json({ error: "Failed to list saved queries" });
  }
});

/**
 * POST /vault/saved-queries
 * Create a new saved query.
 */
router.post("/vault/saved-queries", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { name, description, query, searchMode, projectIds, filters, isShared } = req.body;

    if (!name || !query) {
      res.status(400).json({ error: "Name and query are required" });
      return;
    }

    const [saved] = await db
      .insert(savedVaultQueries)
      .values({
        orgId,
        createdByUserId: userId,
        name,
        description: description ?? null,
        query,
        searchMode: searchMode ?? "hybrid",
        projectIds: projectIds ?? [],
        filters: filters ?? null,
        isShared: isShared ?? "private",
      })
      .returning();

    res.status(201).json(saved);
  } catch (err) {
    req.log.error({ err }, "Failed to create saved query");
    res.status(500).json({ error: "Failed to create saved query" });
  }
});

/**
 * PATCH /vault/saved-queries/:id
 * Update a saved query.
 */
router.patch("/vault/saved-queries/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid query id" });
    return;
  }

  try {
    // Only the creator can update
    const [existing] = await db
      .select()
      .from(savedVaultQueries)
      .where(
        and(
          eq(savedVaultQueries.id, id),
          eq(savedVaultQueries.orgId, orgId),
          eq(savedVaultQueries.createdByUserId, userId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Saved query not found" });
      return;
    }

    const { name, description, query, searchMode, projectIds, filters, isShared } = req.body;

    const [updated] = await db
      .update(savedVaultQueries)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(query !== undefined && { query }),
        ...(searchMode !== undefined && { searchMode }),
        ...(projectIds !== undefined && { projectIds }),
        ...(filters !== undefined && { filters }),
        ...(isShared !== undefined && { isShared }),
      })
      .where(eq(savedVaultQueries.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update saved query");
    res.status(500).json({ error: "Failed to update saved query" });
  }
});

/**
 * DELETE /vault/saved-queries/:id
 * Delete a saved query.
 */
router.delete("/vault/saved-queries/:id", async (req: Request, res: Response) => {
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
      .from(savedVaultQueries)
      .where(
        and(
          eq(savedVaultQueries.id, id),
          eq(savedVaultQueries.orgId, orgId),
          eq(savedVaultQueries.createdByUserId, userId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Saved query not found" });
      return;
    }

    await db.delete(savedVaultQueries).where(eq(savedVaultQueries.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete saved query");
    res.status(500).json({ error: "Failed to delete saved query" });
  }
});

/**
 * POST /vault/saved-queries/:id/use
 * Increment the use count and update lastUsedAt (called when user runs a saved query).
 */
router.post("/vault/saved-queries/:id/use", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid query id" });
    return;
  }

  try {
    const [updated] = await db
      .update(savedVaultQueries)
      .set({
        lastUsedAt: new Date(),
        useCount: sql`COALESCE(${savedVaultQueries.useCount}, 0) + 1`,
      })
      .where(and(eq(savedVaultQueries.id, id), eq(savedVaultQueries.orgId, orgId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Saved query not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update query usage");
    res.status(500).json({ error: "Failed to update query usage" });
  }
});

export { router as savedQueriesRouter };
export default router;
