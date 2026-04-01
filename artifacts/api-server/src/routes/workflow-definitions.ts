import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  workflowDefinitions,
  workflowSteps,
  workflowExecutions,
  workflowExecutionSteps,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /workflow-definitions
 * List organization workflow definitions with optional filtering by status and isPublished
 */
router.get("/workflow-definitions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const status = req.query.status as string | undefined;
  const isPublished = req.query.isPublished as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const conditions = [eq(workflowDefinitions.orgId, orgId)];

    if (status) {
      conditions.push(eq(workflowDefinitions.status, status));
    }

    if (isPublished !== undefined) {
      conditions.push(
        eq(workflowDefinitions.isPublished, isPublished === "true")
      );
    }

    const definitions = await db
      .select()
      .from(workflowDefinitions)
      .where(and(...conditions))
      .orderBy(desc(workflowDefinitions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(definitions);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch workflow definitions");
    res
      .status(500)
      .json({ error: "Failed to fetch workflow definitions" });
  }
});

/**
 * GET /workflow-definitions/:id
 * Get single workflow definition with all its steps
 */
router.get(
  "/workflow-definitions/:id",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow definition id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    try {
      const [definition] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!definition) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, id))
        .orderBy(workflowSteps.stepIndex);

      res.json({ ...definition, steps });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch workflow definition");
      res.status(500).json({ error: "Failed to fetch workflow definition" });
    }
  }
);

/**
 * POST /workflow-definitions
 * Create a new workflow definition with its steps
 */
router.post("/workflow-definitions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const userId = req.user!.id;
  const { name, description, icon, config, steps } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  if (!config || typeof config !== "object") {
    res.status(400).json({ error: "config is required" });
    return;
  }

  if (!Array.isArray(steps)) {
    res.status(400).json({ error: "steps must be an array" });
    return;
  }

  try {
    let definition: any;
    await db.transaction(async (tx) => {
      [definition] = await tx
        .insert(workflowDefinitions)
        .values({
          orgId,
          createdByUserId: userId,
          name,
          description: description || null,
          icon: icon || null,
          config,
          status: "draft",
          isPublished: false,
        })
        .returning();

      // Insert steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map(
          (
            step: {
              type: string;
              name?: string;
              description?: string;
              config: object;
            },
            index: number
          ) => ({
            workflowDefinitionId: definition.id,
            stepIndex: index,
            type: step.type,
            name: step.name || null,
            description: step.description || null,
            config: step.config,
          })
        );

        await tx.insert(workflowSteps).values(stepsToInsert);
      }
    });

    const stepsResult = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowDefinitionId, definition!.id))
      .orderBy(workflowSteps.stepIndex);

    res.status(201).json({ ...definition, steps: stepsResult });
  } catch (err) {
    req.log.error({ err }, "Failed to create workflow definition");
    res.status(500).json({ error: "Failed to create workflow definition" });
  }
});

/**
 * PUT /workflow-definitions/:id
 * Update a workflow definition and its steps
 * Draft definitions can be updated directly; published definitions create a new version
 */
router.put(
  "/workflow-definitions/:id",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow definition id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    const { name, description, icon, config, steps } = req.body;

    try {
      const [existing] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!existing) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      let definition: any;

      if (existing.status === "draft") {
        // Update draft in place
        await db.transaction(async (tx) => {
          [definition] = await tx
            .update(workflowDefinitions)
            .set({
              name: name || existing.name,
              description: description !== undefined ? description : existing.description,
              icon: icon !== undefined ? icon : existing.icon,
              config: config || existing.config,
              updatedAt: new Date(),
            })
            .where(eq(workflowDefinitions.id, id))
            .returning();

          // Delete existing steps
          await tx
            .delete(workflowSteps)
            .where(eq(workflowSteps.workflowDefinitionId, id));

          // Insert new steps
          if (Array.isArray(steps) && steps.length > 0) {
            const stepsToInsert = steps.map(
              (
                step: {
                  type: string;
                  name?: string;
                  description?: string;
                  config: object;
                },
                index: number
              ) => ({
                workflowDefinitionId: id,
                stepIndex: index,
                type: step.type,
                name: step.name || null,
                description: step.description || null,
                config: step.config,
              })
            );

            await tx.insert(workflowSteps).values(stepsToInsert);
          }
        });
      } else {
        // Published definitions: create new version
        await db.transaction(async (tx) => {
          [definition] = await tx
            .insert(workflowDefinitions)
            .values({
              orgId,
              createdByUserId: existing.createdByUserId,
              name: name || existing.name,
              description: description !== undefined ? description : existing.description,
              icon: icon !== undefined ? icon : existing.icon,
              config: config || existing.config,
              status: "draft",
              isPublished: false,
              version: (existing.version || 1) + 1,
            })
            .returning();

          // Insert steps for new version
          if (Array.isArray(steps) && steps.length > 0) {
            const stepsToInsert = steps.map(
              (
                step: {
                  type: string;
                  name?: string;
                  description?: string;
                  config: object;
                },
                index: number
              ) => ({
                workflowDefinitionId: definition.id,
                stepIndex: index,
                type: step.type,
                name: step.name || null,
                description: step.description || null,
                config: step.config,
              })
            );

            await tx.insert(workflowSteps).values(stepsToInsert);
          }
        });
      }

      const stepsResult = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, definition!.id))
        .orderBy(workflowSteps.stepIndex);

      res.json({ ...definition, steps: stepsResult });
    } catch (err) {
      req.log.error({ err }, "Failed to update workflow definition");
      res.status(500).json({ error: "Failed to update workflow definition" });
    }
  }
);

/**
 * DELETE /workflow-definitions/:id
 * Delete a workflow definition and all its steps
 */
router.delete(
  "/workflow-definitions/:id",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow definition id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    try {
      const [existing] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!existing) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      // Delete cascades to steps via foreign key
      await db
        .delete(workflowDefinitions)
        .where(eq(workflowDefinitions.id, id));

      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete workflow definition");
      res.status(500).json({ error: "Failed to delete workflow definition" });
    }
  }
);

/**
 * POST /workflow-definitions/:id/publish
 * Publish a workflow definition (set isPublished=true, status=published)
 */
router.post(
  "/workflow-definitions/:id/publish",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow definition id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    try {
      const [existing] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!existing) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      const [updated] = await db
        .update(workflowDefinitions)
        .set({
          isPublished: true,
          status: "published",
          updatedAt: new Date(),
        })
        .where(eq(workflowDefinitions.id, id))
        .returning();

      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, id))
        .orderBy(workflowSteps.stepIndex);

      res.json({ ...updated, steps });
    } catch (err) {
      req.log.error({ err }, "Failed to publish workflow definition");
      res.status(500).json({ error: "Failed to publish workflow definition" });
    }
  }
);

/**
 * POST /workflow-definitions/:id/duplicate
 * Clone a workflow definition (including all steps)
 */
router.post(
  "/workflow-definitions/:id/duplicate",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow definition id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    const userId = req.user!.id;

    try {
      const [existing] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId)
          )
        );

      if (!existing) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      const existingSteps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, id))
        .orderBy(workflowSteps.stepIndex);

      let newDefinition: any;

      await db.transaction(async (tx) => {
        [newDefinition] = await tx
          .insert(workflowDefinitions)
          .values({
            orgId,
            createdByUserId: userId,
            name: `${existing.name} (Copy)`,
            description: existing.description,
            icon: existing.icon,
            config: existing.config,
            status: "draft",
            isPublished: false,
            version: 1,
          })
          .returning();

        // Copy steps
        if (existingSteps.length > 0) {
          const stepsToInsert = existingSteps.map((step) => ({
            workflowDefinitionId: newDefinition.id,
            stepIndex: step.stepIndex,
            type: step.type,
            name: step.name,
            description: step.description,
            config: step.config,
          }));

          await tx.insert(workflowSteps).values(stepsToInsert);
        }
      });

      const newSteps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, newDefinition!.id))
        .orderBy(workflowSteps.stepIndex);

      res.status(201).json({ ...newDefinition, steps: newSteps });
    } catch (err) {
      req.log.error({ err }, "Failed to duplicate workflow definition");
      res
        .status(500)
        .json({ error: "Failed to duplicate workflow definition" });
    }
  }
);

export default router;
