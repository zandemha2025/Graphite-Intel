/**
 * Playbook CRUD, AI generation, and run execution endpoints.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, playbooks, playbookRuns, activityFeed } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { inngest } from "../inngest/client";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Playbook CRUD
// ---------------------------------------------------------------------------

/**
 * GET /playbooks
 * List playbooks (filterable by category, isTemplate).
 */
router.get("/playbooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const category = req.query.category as string | undefined;
    const isTemplate = req.query.isTemplate === "true";
    const includeSystem = req.query.includeTemplates !== "false"; // include system templates by default

    const conditions = [];

    if (isTemplate) {
      // Templates: org-owned or system (orgId=0)
      if (includeSystem) {
        conditions.push(
          or(eq(playbooks.orgId, orgId), eq(playbooks.orgId, 0)),
        );
      } else {
        conditions.push(eq(playbooks.orgId, orgId));
      }
      conditions.push(eq(playbooks.isTemplate, true));
    } else {
      conditions.push(eq(playbooks.orgId, orgId));
    }

    if (category) {
      conditions.push(eq(playbooks.category, category));
    }

    const results = await db
      .select()
      .from(playbooks)
      .where(and(...conditions))
      .orderBy(desc(playbooks.updatedAt));

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list playbooks");
    res.status(500).json({ error: "Failed to list playbooks" });
  }
});

/**
 * GET /playbooks/:id
 * Get playbook with steps.
 */
router.get("/playbooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(
        and(
          eq(playbooks.id, id),
          or(eq(playbooks.orgId, orgId), eq(playbooks.orgId, 0)), // org-owned or system template
        ),
      );

    if (!playbook) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    res.json(playbook);
  } catch (err) {
    req.log.error({ err }, "Failed to get playbook");
    res.status(500).json({ error: "Failed to get playbook" });
  }
});

/**
 * POST /playbooks
 * Create playbook (manual or from template).
 */
router.post("/playbooks", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { name, description, category, steps, sourceDocumentIds, isTemplate, tags, fromTemplateId } = req.body;

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    let playbookSteps = steps ?? [];

    // Clone from template
    if (fromTemplateId) {
      const [template] = await db
        .select()
        .from(playbooks)
        .where(
          and(eq(playbooks.id, fromTemplateId), eq(playbooks.isTemplate, true)),
        );

      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      playbookSteps = template.steps;
    }

    const [playbook] = await db
      .insert(playbooks)
      .values({
        orgId,
        createdByUserId: userId,
        name,
        description: description ?? null,
        category: category ?? "custom",
        steps: playbookSteps,
        sourceDocumentIds: sourceDocumentIds ?? null,
        isTemplate: isTemplate ?? false,
        isPublished: false,
        tags: tags ?? null,
      })
      .returning();

    // Log activity
    await db.insert(activityFeed).values({
      orgId,
      userId,
      action: "created",
      resourceType: "playbook",
      resourceId: playbook.id,
      resourceTitle: name,
    });

    res.status(201).json(playbook);
  } catch (err) {
    req.log.error({ err }, "Failed to create playbook");
    res.status(500).json({ error: "Failed to create playbook" });
  }
});

/**
 * PATCH /playbooks/:id
 * Update playbook (edit steps, publish, etc.).
 */
router.patch("/playbooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    const { name, description, category, steps, isPublished, tags } = req.body;

    const [updated] = await db
      .update(playbooks)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(steps !== undefined && { steps }),
        ...(isPublished !== undefined && { isPublished }),
        ...(tags !== undefined && { tags }),
      })
      .where(eq(playbooks.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update playbook");
    res.status(500).json({ error: "Failed to update playbook" });
  }
});

/**
 * DELETE /playbooks/:id
 */
router.delete("/playbooks/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.orgId, orgId)));

    if (!existing) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    await db.delete(playbooks).where(eq(playbooks.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete playbook");
    res.status(500).json({ error: "Failed to delete playbook" });
  }
});

// ---------------------------------------------------------------------------
// AI Generation
// ---------------------------------------------------------------------------

/**
 * POST /playbooks/:id/generate
 * Trigger AI generation of playbook steps from source documents.
 */
router.post("/playbooks/:id/generate", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.orgId, orgId)));

    if (!playbook) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    const sourceDocumentIds = (req.body.sourceDocumentIds as number[]) ?? (playbook.sourceDocumentIds as number[]) ?? [];

    if (sourceDocumentIds.length === 0) {
      res.status(400).json({ error: "No source documents specified" });
      return;
    }

    // Update source docs on playbook
    await db
      .update(playbooks)
      .set({ sourceDocumentIds })
      .where(eq(playbooks.id, id));

    // Trigger Inngest generation
    await inngest.send({
      name: "playbook/generate",
      data: { playbookId: id, orgId, sourceDocumentIds },
    });

    res.status(202).json({ message: "Playbook generation started", playbookId: id });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger playbook generation");
    res.status(500).json({ error: "Failed to generate playbook" });
  }
});

/**
 * POST /playbooks/:id/version
 * Create a new version (copies current, increments version number).
 */
router.post("/playbooks/:id/version", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    const [current] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, id), eq(playbooks.orgId, orgId)));

    if (!current) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    const [newVersion] = await db
      .insert(playbooks)
      .values({
        orgId,
        createdByUserId: userId,
        name: current.name,
        description: current.description,
        category: current.category,
        steps: current.steps,
        sourceDocumentIds: current.sourceDocumentIds as number[],
        isTemplate: current.isTemplate ?? false,
        isPublished: false,
        version: (current.version ?? 1) + 1,
        parentId: current.id,
        tags: current.tags as string[],
      })
      .returning();

    res.status(201).json(newVersion);
  } catch (err) {
    req.log.error({ err }, "Failed to create playbook version");
    res.status(500).json({ error: "Failed to create version" });
  }
});

/**
 * GET /playbooks/:id/versions
 * List all versions of a playbook (follows parentId chain).
 */
router.get("/playbooks/:id/versions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid playbook id" });
    return;
  }

  try {
    // Get all versions that share the same root
    // Walk up to find root, then find all with that root
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.id, id), or(eq(playbooks.orgId, orgId), eq(playbooks.orgId, 0))));

    if (!playbook) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    // Find root by walking parentId
    let rootId = playbook.id;
    let currentParentId = playbook.parentId;
    while (currentParentId) {
      const [parent] = await db
        .select({ id: playbooks.id, parentId: playbooks.parentId })
        .from(playbooks)
        .where(eq(playbooks.id, currentParentId));
      if (!parent) break;
      rootId = parent.id;
      currentParentId = parent.parentId;
    }

    // Find all versions from root
    const versions = await db
      .select()
      .from(playbooks)
      .where(
        or(
          eq(playbooks.id, rootId),
          eq(playbooks.parentId, rootId),
        ),
      )
      .orderBy(playbooks.version);

    res.json(versions);
  } catch (err) {
    req.log.error({ err }, "Failed to list playbook versions");
    res.status(500).json({ error: "Failed to list versions" });
  }
});

// ---------------------------------------------------------------------------
// Playbook Runs
// ---------------------------------------------------------------------------

/**
 * POST /playbook-runs
 * Start a playbook run against target documents.
 */
router.post("/playbook-runs", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const { playbookId, title, targetDocumentIds } = req.body;

    if (!playbookId || !targetDocumentIds?.length) {
      res.status(400).json({ error: "playbookId and targetDocumentIds are required" });
      return;
    }

    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(
        and(eq(playbooks.id, playbookId), or(eq(playbooks.orgId, orgId), eq(playbooks.orgId, 0))),
      );

    if (!playbook) {
      res.status(404).json({ error: "Playbook not found" });
      return;
    }

    const steps = (playbook.steps as unknown[]) ?? [];
    const initialStepResults = steps.map((_: unknown, i: number) => ({
      stepIndex: i,
      status: "pending" as const,
    }));

    const [run] = await db
      .insert(playbookRuns)
      .values({
        orgId,
        playbookId,
        triggeredByUserId: userId,
        title: title ?? `${playbook.name} Run`,
        targetDocumentIds,
        status: "running",
        stepResults: initialStepResults,
        completedSteps: 0,
        totalSteps: steps.length,
        startedAt: new Date(),
      })
      .returning();

    // Log activity
    await db.insert(activityFeed).values({
      orgId,
      userId,
      action: "created",
      resourceType: "playbook_run",
      resourceId: run.id,
      resourceTitle: run.title,
    });

    res.status(201).json(run);
  } catch (err) {
    req.log.error({ err }, "Failed to start playbook run");
    res.status(500).json({ error: "Failed to start playbook run" });
  }
});

/**
 * GET /playbook-runs
 * List runs (filterable by status, playbookId).
 */
router.get("/playbook-runs", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const status = req.query.status as string | undefined;
    const playbookId = req.query.playbookId ? parseInt(req.query.playbookId as string) : undefined;
    const limit = Math.min(parseInt((req.query.limit as string) ?? "50"), 100);
    const offset = parseInt((req.query.offset as string) ?? "0");

    const conditions = [eq(playbookRuns.orgId, orgId)];
    if (status) conditions.push(eq(playbookRuns.status, status));
    if (playbookId) conditions.push(eq(playbookRuns.playbookId, playbookId));

    const runs = await db
      .select()
      .from(playbookRuns)
      .where(and(...conditions))
      .orderBy(desc(playbookRuns.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(runs);
  } catch (err) {
    req.log.error({ err }, "Failed to list playbook runs");
    res.status(500).json({ error: "Failed to list runs" });
  }
});

/**
 * GET /playbook-runs/:id
 * Get run with step results.
 */
router.get("/playbook-runs/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid run id" });
    return;
  }

  try {
    const [run] = await db
      .select()
      .from(playbookRuns)
      .where(and(eq(playbookRuns.id, id), eq(playbookRuns.orgId, orgId)));

    if (!run) {
      res.status(404).json({ error: "Playbook run not found" });
      return;
    }

    // Also fetch the playbook for step definitions
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.id, run.playbookId));

    res.json({ run, playbook });
  } catch (err) {
    req.log.error({ err }, "Failed to get playbook run");
    res.status(500).json({ error: "Failed to get run" });
  }
});

/**
 * PATCH /playbook-runs/:id/steps/:stepIndex
 * Mark a step complete / add notes.
 */
router.patch("/playbook-runs/:id/steps/:stepIndex", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const runId = parseInt(req.params.id as string);
  const stepIndex = parseInt(req.params.stepIndex as string);

  if (isNaN(runId) || isNaN(stepIndex)) {
    res.status(400).json({ error: "Invalid run or step index" });
    return;
  }

  try {
    const [run] = await db
      .select()
      .from(playbookRuns)
      .where(and(eq(playbookRuns.id, runId), eq(playbookRuns.orgId, orgId)));

    if (!run) {
      res.status(404).json({ error: "Playbook run not found" });
      return;
    }

    const { status, notes, result } = req.body;
    const stepResults = (run.stepResults as any[]) ?? [];

    if (stepIndex < 0 || stepIndex >= stepResults.length) {
      res.status(400).json({ error: "Step index out of range" });
      return;
    }

    // Update the specific step
    stepResults[stepIndex] = {
      ...stepResults[stepIndex],
      status: status ?? stepResults[stepIndex].status,
      notes: notes ?? stepResults[stepIndex].notes,
      result: result ?? stepResults[stepIndex].result,
      completedByUserId: status === "completed" ? userId : stepResults[stepIndex].completedByUserId,
      completedAt: status === "completed" ? new Date().toISOString() : stepResults[stepIndex].completedAt,
    };

    const completedCount = stepResults.filter((s) => s.status === "completed").length;
    const allDone = completedCount === stepResults.length;

    const [updated] = await db
      .update(playbookRuns)
      .set({
        stepResults,
        completedSteps: completedCount,
        status: allDone ? "completed" : "running",
        completedAt: allDone ? new Date() : null,
      })
      .where(eq(playbookRuns.id, runId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update playbook step");
    res.status(500).json({ error: "Failed to update step" });
  }
});

export { router as playbooksRouter };
export default router;
