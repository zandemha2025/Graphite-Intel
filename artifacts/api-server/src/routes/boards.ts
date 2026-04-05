/**
 * CRUD endpoints for boards (dashboards, reports, monitors).
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, boards } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /boards
 * List boards for the org (own + shared).
 */
router.get("/boards", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = Number(req.user!.id);

  try {
    const rows = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.orgId, orgId),
          or(
            eq(boards.createdByUserId, userId),
            eq(boards.isShared, true),
          ),
        ),
      )
      .orderBy(desc(boards.updatedAt));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list boards");
    res.status(500).json({ error: "Failed to list boards" });
  }
});

/**
 * POST /boards
 * Create a new board.
 */
router.post("/boards", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = Number(req.user!.id);

  try {
    const { title, description, type, config, isShared } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const [board] = await db
      .insert(boards)
      .values({
        orgId,
        createdByUserId: userId,
        title,
        description: description ?? null,
        type: type ?? "live",
        config: config ?? null,
        isShared: isShared ?? false,
      })
      .returning();

    res.status(201).json(board);
  } catch (err) {
    req.log.error({ err }, "Failed to create board");
    res.status(500).json({ error: "Failed to create board" });
  }
});

/**
 * GET /boards/:id
 * Get a single board.
 */
router.get("/boards/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = Number(req.user!.id);
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    const [board] = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, id),
          eq(boards.orgId, orgId),
          or(
            eq(boards.createdByUserId, userId),
            eq(boards.isShared, true),
          ),
        ),
      );

    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.json(board);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch board");
    res.status(500).json({ error: "Failed to fetch board" });
  }
});

/**
 * PATCH /boards/:id
 * Update a board (title, description, type, config, isShared).
 */
router.patch("/boards/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = Number(req.user!.id);
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    // Only the creator can update
    const [existing] = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, id),
          eq(boards.orgId, orgId),
          eq(boards.createdByUserId, userId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    const { title, description, type, config, isShared } = req.body;

    const [updated] = await db
      .update(boards)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(config !== undefined && { config }),
        ...(isShared !== undefined && { isShared }),
      })
      .where(eq(boards.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update board");
    res.status(500).json({ error: "Failed to update board" });
  }
});

/**
 * DELETE /boards/:id
 * Delete a board.
 */
router.delete("/boards/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = Number(req.user!.id);
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, id),
          eq(boards.orgId, orgId),
          eq(boards.createdByUserId, userId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    await db.delete(boards).where(eq(boards.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete board");
    res.status(500).json({ error: "Failed to delete board" });
  }
});

export default router;
