import { Router, type IRouter, type Request, type Response } from "express";
import { db, pipedreamConnectors } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  PipedreamConnectClient,
  PipedreamApiError,
  DATA_SOURCE_REGISTRY,
  DATA_SOURCES,
  pullDataRequestSchema,
  type DataSource,
} from "@workspace/pipedream-connect";
import { inngest } from "../inngest/client";
import { listSyncedData, getAppProfile } from "../lib/connector-sync";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function getClient(): PipedreamConnectClient {
  return new PipedreamConnectClient();
}

// ---------------------------------------------------------------------------
// List supported data sources and their available actions
// ---------------------------------------------------------------------------
router.get("/connectors/sources", (_req: Request, res: Response) => {
  const sources = DATA_SOURCES.map((key) => ({
    key,
    ...DATA_SOURCE_REGISTRY[key],
  }));
  res.json({ sources });
});

// ---------------------------------------------------------------------------
// Create a Pipedream Connect user token (for the frontend widget)
// ---------------------------------------------------------------------------
router.post("/connectors/token", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;

  try {
    const client = getClient();
    const token = await client.createUserToken(userId);
    res.json({ token: token.token, expires_at: token.expires_at });
  } catch (err) {
    req.log.error({ err }, "Failed to create Pipedream token");
    res.status(500).json({ error: "Failed to create connect token" });
  }
});

// ---------------------------------------------------------------------------
// Register a connected account after the Pipedream widget completes OAuth
// ---------------------------------------------------------------------------
router.post("/connectors/accounts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  const { pipedream_account_id, data_source, name } = req.body as {
    pipedream_account_id: string;
    data_source: string;
    name?: string;
  };

  if (!pipedream_account_id || typeof pipedream_account_id !== "string") {
    res.status(400).json({ error: "Missing pipedream_account_id" });
    return;
  }

  if (!data_source || !DATA_SOURCES.includes(data_source as DataSource)) {
    res.status(400).json({ error: `Invalid data_source. Must be one of: ${DATA_SOURCES.join(", ")}` });
    return;
  }

  const source = data_source as DataSource;
  const meta = DATA_SOURCE_REGISTRY[source];

  try {
    // Verify the account exists in Pipedream before persisting
    const client = getClient();
    const account = await client.getAccount(pipedream_account_id);

    const [connector] = await db
      .insert(pipedreamConnectors)
      .values({
        orgId,
        connectedByUserId: userId,
        externalUserId: userId,
        pipedreamAccountId: account.id,
        dataSource: source,
        appSlug: meta.appSlug,
        name: name ?? account.name ?? meta.label,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [pipedreamConnectors.orgId, pipedreamConnectors.pipedreamAccountId],
        set: {
          isActive: true,
          name: name ?? account.name ?? meta.label,
          updatedAt: new Date(),
        },
      })
      .returning();

    req.log.info({ connectorId: connector.id, source }, "Pipedream connector registered");

    // Fire async data sync for the newly connected app
    try {
      await inngest.send({
        name: "connector/data.sync",
        data: { connectorId: connector.id },
      });
      req.log.info({ connectorId: connector.id }, "Queued initial connector data sync");
    } catch (syncErr) {
      // Non-blocking — registration succeeds even if sync queueing fails
      req.log.warn({ syncErr }, "Failed to queue initial connector data sync");
    }

    res.status(201).json(connector);
  } catch (err) {
    if (err instanceof PipedreamApiError) {
      req.log.error({ err }, "Pipedream API error registering account");
      res.status(502).json({ error: "Failed to verify account with Pipedream" });
      return;
    }
    req.log.error({ err }, "Failed to register connector");
    res.status(500).json({ error: "Failed to register connector" });
  }
});

// ---------------------------------------------------------------------------
// List connected accounts for the org
// ---------------------------------------------------------------------------
router.get("/connectors/accounts", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const data = await db
      .select()
      .from(pipedreamConnectors)
      .where(and(eq(pipedreamConnectors.orgId, orgId), eq(pipedreamConnectors.isActive, true)))
      .orderBy(pipedreamConnectors.createdAt);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to list connectors");
    res.status(500).json({ error: "Failed to list connectors" });
  }
});

// ---------------------------------------------------------------------------
// Disconnect a connected account
// ---------------------------------------------------------------------------
router.delete("/connectors/accounts/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const connectorId = parseInt(req.params.id as string);

  if (isNaN(connectorId)) {
    res.status(400).json({ error: "Invalid connector id" });
    return;
  }

  try {
    const [connector] = await db
      .select()
      .from(pipedreamConnectors)
      .where(and(eq(pipedreamConnectors.id, connectorId), eq(pipedreamConnectors.orgId, orgId)));

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    // Delete from Pipedream, then mark inactive locally
    try {
      const client = getClient();
      await client.disconnectAccount(connector.pipedreamAccountId);
    } catch (pdErr) {
      // Log but don't block — still mark inactive locally
      req.log.warn({ pdErr }, "Failed to delete account from Pipedream; marking inactive locally");
    }

    await db
      .update(pipedreamConnectors)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pipedreamConnectors.id, connectorId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect connector");
    res.status(500).json({ error: "Failed to disconnect connector" });
  }
});

// ---------------------------------------------------------------------------
// Pull data from a connected account
// ---------------------------------------------------------------------------
router.post("/connectors/accounts/:id/data", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const connectorId = parseInt(req.params.id as string);

  if (isNaN(connectorId)) {
    res.status(400).json({ error: "Invalid connector id" });
    return;
  }

  const parsed = pullDataRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  try {
    const [connector] = await db
      .select()
      .from(pipedreamConnectors)
      .where(and(eq(pipedreamConnectors.id, connectorId), eq(pipedreamConnectors.orgId, orgId)));

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    if (!connector.isActive) {
      res.status(400).json({ error: "Connector is not active" });
      return;
    }

    const client = getClient();
    const result = await client.pullData(connector.pipedreamAccountId, parsed.data);

    // Update last-used timestamp
    await db
      .update(pipedreamConnectors)
      .set({ lastUsedAt: new Date() })
      .where(eq(pipedreamConnectors.id, connectorId));

    res.json(result);
  } catch (err) {
    if (err instanceof PipedreamApiError) {
      req.log.error({ err }, "Pipedream API error pulling data");
      res.status(502).json({ error: "Failed to pull data from Pipedream", status: err.status });
      return;
    }
    req.log.error({ err }, "Failed to pull data");
    res.status(500).json({ error: "Failed to pull data" });
  }
});

// ---------------------------------------------------------------------------
// Trigger a manual re-sync for a connector
// ---------------------------------------------------------------------------
router.post("/connectors/accounts/:id/sync", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const connectorId = parseInt(req.params.id as string);

  if (isNaN(connectorId)) {
    res.status(400).json({ error: "Invalid connector id" });
    return;
  }

  try {
    const [connector] = await db
      .select()
      .from(pipedreamConnectors)
      .where(and(eq(pipedreamConnectors.id, connectorId), eq(pipedreamConnectors.orgId, orgId)));

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    if (!connector.isActive) {
      res.status(400).json({ error: "Connector is not active" });
      return;
    }

    const profile = getAppProfile(connector.appSlug);

    await inngest.send({
      name: "connector/data.sync",
      data: { connectorId: connector.id },
    });

    res.json({
      success: true,
      message: "Sync queued",
      connectorId: connector.id,
      appSlug: connector.appSlug,
      category: profile.category,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger connector sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

// ---------------------------------------------------------------------------
// List synced data for a connector
// ---------------------------------------------------------------------------
router.get("/connectors/accounts/:id/synced-data", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const connectorId = parseInt(req.params.id as string);

  if (isNaN(connectorId)) {
    res.status(400).json({ error: "Invalid connector id" });
    return;
  }

  try {
    // Verify the connector belongs to this org
    const [connector] = await db
      .select()
      .from(pipedreamConnectors)
      .where(and(eq(pipedreamConnectors.id, connectorId), eq(pipedreamConnectors.orgId, orgId)));

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const data = await listSyncedData(connectorId, orgId, limit, offset);

    res.json({
      connectorId,
      appSlug: connector.appSlug,
      ...data,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list synced data");
    res.status(500).json({ error: "Failed to list synced data" });
  }
});

export { router as connectorsRouter };
export default router;
