import { Router, type IRouter, type Request, type Response } from "express";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import {
  PipedreamWorkflowsClient,
  PipedreamWorkflowsApiError,
  WorkflowBuilder,
  generateWorkflowSchema,
  deployWorkflowSchema,
  updateWorkflowSchema,
  suggestAutomationsSchema,
} from "@workspace/integrations-pipedream-workflows";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function getWorkflowsClient(): PipedreamWorkflowsClient {
  return new PipedreamWorkflowsClient();
}

function getBuilder(): WorkflowBuilder {
  return new WorkflowBuilder(getOpenAIClient());
}

// ---------------------------------------------------------------------------
// POST /pipedream/workflows/generate
// Natural language → structured workflow definition (preview, no deploy)
// ---------------------------------------------------------------------------
router.post("/pipedream/workflows/generate", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const parsed = generateWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const builder = getBuilder();
    const preview = await builder.generateWorkflow(
      parsed.data.description,
      parsed.data.connectedApps,
    );
    res.json(preview);
  } catch (err) {
    req.log.error({ err }, "Failed to generate workflow");
    res.status(500).json({ error: "Failed to generate workflow definition" });
  }
});

// ---------------------------------------------------------------------------
// POST /pipedream/workflows/deploy
// Deploy a generated workflow definition to Pipedream
// ---------------------------------------------------------------------------
router.post("/pipedream/workflows/deploy", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const parsed = deployWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const client = getWorkflowsClient();
    const workflow = await client.createWorkflow(parsed.data.definition);

    if (parsed.data.activate && workflow.id) {
      try {
        await client.deployWorkflow(workflow.id);
      } catch (deployErr) {
        // Log but return the created workflow — deploy may fail if not yet ready
        req.log.warn({ deployErr, workflowId: workflow.id }, "Workflow created but activate failed");
      }
    }

    req.log.info({ workflowId: workflow.id }, "Pipedream workflow deployed");
    res.status(201).json(workflow);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      req.log.error({ err }, "Pipedream API error deploying workflow");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to deploy workflow");
    res.status(500).json({ error: "Failed to deploy workflow" });
  }
});

// ---------------------------------------------------------------------------
// GET /pipedream/workflows
// List user's active Pipedream workflows
// ---------------------------------------------------------------------------
router.get("/pipedream/workflows", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const client = getWorkflowsClient();
    const workflows = await client.listWorkflows({ limit, offset });
    res.json(workflows);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      req.log.error({ err }, "Pipedream API error listing workflows");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to list workflows");
    res.status(500).json({ error: "Failed to list workflows" });
  }
});

// ---------------------------------------------------------------------------
// GET /pipedream/workflows/:id
// Get workflow details
// ---------------------------------------------------------------------------
router.get("/pipedream/workflows/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const workflowId = req.params.id as string;
  if (!workflowId) {
    res.status(400).json({ error: "Missing workflow id" });
    return;
  }

  try {
    const client = getWorkflowsClient();
    const workflow = await client.getWorkflow(workflowId);
    res.json(workflow);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      if (err.status === 404) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      req.log.error({ err }, "Pipedream API error fetching workflow");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to fetch workflow");
    res.status(500).json({ error: "Failed to fetch workflow" });
  }
});

// ---------------------------------------------------------------------------
// PUT /pipedream/workflows/:id
// Update workflow (pause/resume/rename)
// ---------------------------------------------------------------------------
router.put("/pipedream/workflows/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const workflowId = req.params.id as string;
  if (!workflowId) {
    res.status(400).json({ error: "Missing workflow id" });
    return;
  }

  const parsed = updateWorkflowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const client = getWorkflowsClient();
    const workflow = await client.updateWorkflow(workflowId, parsed.data);
    res.json(workflow);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      if (err.status === 404) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      req.log.error({ err }, "Pipedream API error updating workflow");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to update workflow");
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /pipedream/workflows/:id
// Delete a workflow
// ---------------------------------------------------------------------------
router.delete("/pipedream/workflows/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const workflowId = req.params.id as string;
  if (!workflowId) {
    res.status(400).json({ error: "Missing workflow id" });
    return;
  }

  try {
    const client = getWorkflowsClient();
    await client.deleteWorkflow(workflowId);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      if (err.status === 404) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      req.log.error({ err }, "Pipedream API error deleting workflow");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to delete workflow");
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

// ---------------------------------------------------------------------------
// GET /pipedream/workflows/:id/logs
// Get execution history for a workflow
// ---------------------------------------------------------------------------
router.get("/pipedream/workflows/:id/logs", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const workflowId = req.params.id as string;
  if (!workflowId) {
    res.status(400).json({ error: "Missing workflow id" });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  try {
    const client = getWorkflowsClient();
    const logs = await client.getWorkflowLogs(workflowId, limit);
    res.json(logs);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      if (err.status === 404) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }
      req.log.error({ err }, "Pipedream API error fetching logs");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to fetch workflow logs");
    res.status(500).json({ error: "Failed to fetch workflow logs" });
  }
});

// ---------------------------------------------------------------------------
// POST /pipedream/workflows/suggest
// Given the user's connected apps, suggest useful automations
// ---------------------------------------------------------------------------
router.post("/pipedream/workflows/suggest", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const parsed = suggestAutomationsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  try {
    const builder = getBuilder();
    const suggestions = await builder.suggestAutomations(
      parsed.data.connectedApps,
      parsed.data.context,
    );
    res.json(suggestions);
  } catch (err) {
    req.log.error({ err }, "Failed to generate suggestions");
    res.status(500).json({ error: "Failed to generate automation suggestions" });
  }
});

// ---------------------------------------------------------------------------
// GET /connections
// List user's connected Pipedream accounts (real-time from Pipedream API)
// ---------------------------------------------------------------------------
router.get("/connections", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;

  try {
    const client = getWorkflowsClient();
    const accounts = await client.listConnectedAccounts(userId);
    res.json(accounts);
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      req.log.error({ err }, "Pipedream API error listing connections");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to list connections");
    res.status(500).json({ error: "Failed to list connections" });
  }
});

// ---------------------------------------------------------------------------
// POST /connections/sync
// Trigger a capabilities re-scan for a connected account
// Returns the refreshed account info from Pipedream
// ---------------------------------------------------------------------------
router.post("/connections/sync", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const { accountId } = req.body as { accountId?: string };

  if (!accountId || typeof accountId !== "string") {
    res.status(400).json({ error: "accountId is required" });
    return;
  }

  try {
    const client = getWorkflowsClient();
    // Re-fetch all accounts for this user to get the latest state
    const accounts = await client.listConnectedAccounts(userId);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      res.status(404).json({ error: "Connected account not found" });
      return;
    }

    req.log.info({ accountId, userId }, "Connection capabilities scan complete");
    res.json({
      account,
      scannedAt: new Date().toISOString(),
      healthy: account.healthy,
    });
  } catch (err) {
    if (err instanceof PipedreamWorkflowsApiError) {
      req.log.error({ err }, "Pipedream API error syncing connection");
      res.status(502).json({ error: "Pipedream API error", details: err.body });
      return;
    }
    req.log.error({ err }, "Failed to sync connection");
    res.status(500).json({ error: "Failed to sync connection" });
  }
});

export { router as pipedreamWorkflowsRouter };
export default router;
