/**
 * Context Definitions API -- org-level glossary of terms and definitions.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, contextDefinitions } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET /context/definitions -- list all definitions for the user's org
// ---------------------------------------------------------------------------

router.get("/context/definitions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId;

  if (!orgId) {
    res.json([]);
    return;
  }

  try {
    const rows = await db
      .select()
      .from(contextDefinitions)
      .where(eq(contextDefinitions.orgId, orgId));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list context definitions");
    res.status(500).json({ error: "Failed to list context definitions" });
  }
});

// ---------------------------------------------------------------------------
// POST /context/definitions -- create a new definition
// ---------------------------------------------------------------------------

router.post("/context/definitions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId;
  const userId = req.user!.id;

  if (!orgId) {
    res.status(400).json({ error: "Organization is required" });
    return;
  }

  try {
    const { term, value, category } = req.body;

    if (!term || typeof term !== "string") {
      res.status(400).json({ error: "term is required" });
      return;
    }
    if (!value || typeof value !== "string") {
      res.status(400).json({ error: "value is required" });
      return;
    }

    const [definition] = await db
      .insert(contextDefinitions)
      .values({
        orgId,
        userId: String(userId),
        term: term.trim(),
        value,
        category: category ?? "market",
      })
      .returning();

    res.status(201).json(definition);
  } catch (err) {
    req.log.error({ err }, "Failed to create context definition");
    res.status(500).json({ error: "Failed to create context definition" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /context/definitions/:id -- update a definition
// ---------------------------------------------------------------------------

router.patch("/context/definitions/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid definition id" });
    return;
  }

  if (!orgId) {
    res.status(400).json({ error: "Organization is required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(contextDefinitions)
      .where(and(eq(contextDefinitions.id, id), eq(contextDefinitions.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Definition not found" });
      return;
    }

    const { term, value, category } = req.body;

    const [updated] = await db
      .update(contextDefinitions)
      .set({
        ...(term !== undefined && { term: term.trim() }),
        ...(value !== undefined && { value }),
        ...(category !== undefined && { category }),
      })
      .where(eq(contextDefinitions.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update context definition");
    res.status(500).json({ error: "Failed to update context definition" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /context/definitions/:id -- delete a definition
// ---------------------------------------------------------------------------

router.delete("/context/definitions/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid definition id" });
    return;
  }

  if (!orgId) {
    res.status(400).json({ error: "Organization is required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(contextDefinitions)
      .where(and(eq(contextDefinitions.id, id), eq(contextDefinitions.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Definition not found" });
      return;
    }

    await db.delete(contextDefinitions).where(eq(contextDefinitions.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete context definition");
    res.status(500).json({ error: "Failed to delete context definition" });
  }
});

export default router;
