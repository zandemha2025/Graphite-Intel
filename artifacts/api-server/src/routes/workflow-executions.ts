import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  workflowDefinitions,
  workflowExecutions,
  workflowExecutionSteps,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { inngest } from "../inngest/client";
import { compileWorkflow } from "../inngest/workflow-compiler";

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
 * For workflowDefinitionId-based executions, dispatches the
 * "workflow/execute" Inngest event to run the workflow asynchronously.
 * Legacy template executions are created but not yet async-executed.
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

    // Trigger Inngest workflow execution for definition-based workflows.
    // Legacy template executions remain in "pending" until a legacy executor
    // is implemented — the workflow-execute Inngest function requires a
    // workflowDefinitionId to load steps.
    if (workflowDefinitionId) {
      await inngest.send({
        name: "workflow/execute",
        data: {
          executionId: execution.id,
          orgId,
        },
      });
      req.log.info(
        { executionId: execution.id, workflowDefinitionId },
        "Dispatched workflow/execute event",
      );
    } else {
      req.log.warn(
        { executionId: execution.id, legacyTemplateKey },
        "Legacy template execution created — no async executor available yet",
      );
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

/**
 * POST /workflow-webhook/:webhookId
 * Public endpoint that receives incoming webhook payloads and fires the
 * "workflow/webhook.received" Inngest event.
 *
 * The orgId is resolved from a query parameter (?org=<id>) or the X-Org-Id header.
 * Callers must supply one of these; requests without a resolvable orgId are rejected.
 *
 * Webhook trigger workflows must be published and have a matching webhookId in
 * their trigger config to receive executions.
 */
router.post(
  "/workflow-webhook/:webhookId",
  async (req: Request, res: Response) => {
    const { webhookId } = req.params;

    const rawOrgId =
      (req.query.org as string | undefined) ??
      (req.headers["x-org-id"] as string | undefined);

    const orgId = rawOrgId ? parseInt(rawOrgId) : undefined;

    if (!orgId || isNaN(orgId)) {
      res.status(400).json({ error: "org query param or X-Org-Id header required" });
      return;
    }

    const payload: unknown = req.body ?? {};

    try {
      await inngest.send({
        name: "workflow/webhook.received",
        data: { webhookId: webhookId!, orgId, payload },
      });

      res.status(202).json({ accepted: true, webhookId });
    } catch (err) {
      req.log.error({ err }, "Failed to dispatch webhook event");
      res.status(500).json({ error: "Failed to dispatch webhook event" });
    }
  },
);

/**
 * GET /workflow-definitions/:id/compile
 * Returns the compiled descriptor for a workflow definition — validates the
 * trigger config, step types, and returns webhook URL / cron expression if applicable.
 */
router.get(
  "/workflow-definitions/:id/compile",
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
      const { workflowSteps } = await import("@workspace/db");
      const { asc } = await import("drizzle-orm");

      const [definition] = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.id, id),
            eq(workflowDefinitions.orgId, orgId),
          ),
        );

      if (!definition) {
        res.status(404).json({ error: "Workflow definition not found" });
        return;
      }

      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, id))
        .orderBy(asc(workflowSteps.stepIndex));

      const compiled = compileWorkflow(definition, steps);

      res.json(compiled);
    } catch (err) {
      req.log.error({ err }, "Failed to compile workflow definition");
      res.status(500).json({ error: "Failed to compile workflow definition" });
    }
  },
);

export default router;
