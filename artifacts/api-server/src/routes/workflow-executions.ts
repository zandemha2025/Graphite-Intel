import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  workflowDefinitions,
  workflowExecutions,
  workflowExecutionSteps,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { inngest } from "../inngest/client";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /workflow-executions
 * List organization workflow executions with optional filtering
 */
router.get("/workflow-executions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const status = req.query.status as string | undefined;
  const workflowDefinitionId = req.query.workflowDefinitionId as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const conditions = [eq(workflowExecutions.orgId, orgId)];

    if (status) {
      conditions.push(eq(workflowExecutions.status, status));
    }

    if (workflowDefinitionId) {
      const wdId = parseInt(workflowDefinitionId);
      if (!isNaN(wdId)) {
        conditions.push(eq(workflowExecutions.workflowDefinitionId, wdId));
      }
    }

    const executions = await db
      .select()
      .from(workflowExecutions)
      .where(and(...conditions))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(executions);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch workflow executions");
    res.status(500).json({ error: "Failed to fetch workflow executions" });
  }
});

/**
 * GET /workflow-executions/:id
 * Get single execution with step traces
 */
router.get(
  "/workflow-executions/:id",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow execution id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    try {
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.id, id),
            eq(workflowExecutions.orgId, orgId)
          )
        );

      if (!execution) {
        res.status(404).json({ error: "Workflow execution not found" });
        return;
      }

      const steps = await db
        .select()
        .from(workflowExecutionSteps)
        .where(eq(workflowExecutionSteps.executionId, id))
        .orderBy(workflowExecutionSteps.stepIndex);

      res.json({ ...execution, steps });
    } catch (err) {
      req.log.error({ err }, "Failed to fetch workflow execution");
      res.status(500).json({ error: "Failed to fetch workflow execution" });
    }
  }
);

/**
 * POST /workflow-executions
 * Trigger a new execution
 *
 * Accepts either:
 * - workflowDefinitionId: id of a published workflow definition
 * - legacyTemplateKey: key of a legacy workflow template + inputs
 *
 * Creates execution record and returns it with status "pending".
 * TODO: Trigger Inngest function here when Inngest is integrated
 */
router.post("/workflow-executions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const userId = req.user!.id;
  const { workflowDefinitionId, legacyTemplateKey, title, inputs } = req.body;

  // Validate input: must provide either workflowDefinitionId or legacyTemplateKey
  if (!workflowDefinitionId && !legacyTemplateKey) {
    res.status(400).json({
      error: "Either workflowDefinitionId or legacyTemplateKey is required",
    });
    return;
  }

  if (workflowDefinitionId && typeof workflowDefinitionId !== "number") {
    res.status(400).json({ error: "workflowDefinitionId must be a number" });
    return;
  }

  if (legacyTemplateKey && typeof legacyTemplateKey !== "string") {
    res.status(400).json({ error: "legacyTemplateKey must be a string" });
    return;
  }

  if (!inputs || typeof inputs !== "object") {
    res.status(400).json({ error: "inputs must be an object" });
    return;
  }

  try {
    // Validate workflow definition exists if provided
    if (workflowDefinitionId) {
      const [wf] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, workflowDefinitionId),
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.isPublished, true)
          )
        );

      if (!wf) {
        res
          .status(400)
          .json({ error: "Workflow definition not found or not published" });
        return;
      }
    }

    const executionTitle =
      title ||
      (workflowDefinitionId
        ? `Execution #${Date.now()}`
        : `Legacy Execution #${Date.now()}`);

    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        orgId,
        workflowDefinitionId: workflowDefinitionId || null,
        legacyTemplateKey: legacyTemplateKey || null,
        triggeredByUserId: userId,
        title: executionTitle,
        status: "pending",
        inputs: inputs || {},
        outputs: {},
        currentStepIndex: 0,
      })
      .returning();

    // Trigger Inngest workflow execution
    if (workflowDefinitionId) {
      await inngest.send({
        name: "workflow/execute",
        data: {
          executionId: execution.id,
          orgId,
        },
      });
    }

    res.status(201).json(execution);
  } catch (err) {
    req.log.error({ err }, "Failed to create workflow execution");
    res.status(500).json({ error: "Failed to create workflow execution" });
  }
});

/**
 * POST /workflow-executions/:id/cancel
 * Cancel a workflow execution (set status to cancelled)
 */
router.post(
  "/workflow-executions/:id/cancel",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid workflow execution id" });
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
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.id, id),
            eq(workflowExecutions.orgId, orgId)
          )
        );

      if (!existing) {
        res.status(404).json({ error: "Workflow execution not found" });
        return;
      }

      // Only allow cancelling pending or in-progress executions
      if (!["pending", "in-progress"].includes(existing.status)) {
        res.status(400).json({
          error: `Cannot cancel execution with status '${existing.status}'`,
        });
        return;
      }

      const [updated] = await db
        .update(workflowExecutions)
        .set({
          status: "cancelled",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to cancel workflow execution");
      res.status(500).json({ error: "Failed to cancel workflow execution" });
    }
  }
);

export default router;
