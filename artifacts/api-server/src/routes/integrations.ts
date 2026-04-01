import { Router, type IRouter, type Request, type Response } from "express";
import { db, integrations, syncedFiles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  getUserInfo,
  listFolders,
  listFilesInFolder,
  GOOGLE_DRIVE_SCOPES,
} from "../lib/providers/google-drive";
import { ensureFreshToken } from "../lib/oauth-tokens";
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
// List integrations
// ---------------------------------------------------------------------------
router.get("/integrations", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const data = await db
      .select()
      .from(integrations)
      .where(eq(integrations.orgId, orgId))
      .orderBy(integrations.createdAt);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Failed to list integrations" });
  }
});

// ---------------------------------------------------------------------------
// Start Google Drive OAuth
// ---------------------------------------------------------------------------
router.get("/integrations/oauth/google/start", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    const stateToken = randomBytes(32).toString("hex");

    // Store state in session for CSRF verification
    const session = req as any;
    if (!session._oauthState) session._oauthState = {};
    session._oauthState = { state: stateToken, orgId, userId };

    const authUrl = buildAuthUrl(stateToken);

    res.json({ authUrl, state: stateToken });
  } catch (err) {
    req.log.error({ err }, "Failed to start OAuth flow");
    res.status(500).json({ error: "Failed to start OAuth flow" });
  }
});

// ---------------------------------------------------------------------------
// Google Drive OAuth callback — exchange code for tokens
// ---------------------------------------------------------------------------
router.get("/integrations/oauth/google/callback", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { code, state, error } = req.query;

  try {
    if (error) {
      req.log.error({ error }, "OAuth error from Google");
      res.status(400).json({ error: "OAuth authorization failed", details: error });
      return;
    }

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    // Verify CSRF state
    const session = req as any;
    const sessionState = session._oauthState?.state;
    if (!sessionState || sessionState !== state) {
      res.status(400).json({ error: "Invalid state token" });
      return;
    }

    const orgId = session._oauthState.orgId;
    const userId = session._oauthState.userId;
    if (!orgId || !userId) {
      res.status(400).json({ error: "Invalid session state" });
      return;
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch user profile from Google
    const userInfo = await getUserInfo(tokens.accessToken);

    // Create integration record
    const [integration] = await db
      .insert(integrations)
      .values({
        orgId,
        connectedByUserId: userId,
        type: "google_drive",
        name: `Google Drive (${userInfo.email})`,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        scopes: GOOGLE_DRIVE_SCOPES,
        metadata: {
          email: userInfo.email,
          displayName: userInfo.name,
          picture: userInfo.picture,
        },
        isActive: true,
        syncConfig: {
          folderIds: [],
          direction: "pull",
          intervalMinutes: 30,
        },
      })
      .returning();

    // Clear session state
    delete session._oauthState;

    req.log.info({ integrationId: integration.id, email: userInfo.email }, "Google Drive connected");

    // Redirect back to frontend integrations page
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    res.redirect(`${frontendUrl}/settings/integrations?connected=google_drive&id=${integration.id}`);
  } catch (err) {
    req.log.error({ err }, "Failed to handle OAuth callback");
    res.status(500).json({ error: "Failed to complete OAuth flow" });
  }
});

// ---------------------------------------------------------------------------
// Disconnect integration
// ---------------------------------------------------------------------------
router.post("/integrations/:id/disconnect", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    const [updated] = await db
      .update(integrations)
      .set({ isActive: false, accessToken: null, refreshToken: null })
      .where(eq(integrations.id, integrationId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect integration");
    res.status(500).json({ error: "Failed to disconnect integration" });
  }
});

// ---------------------------------------------------------------------------
// Trigger manual sync
// ---------------------------------------------------------------------------
router.post("/integrations/:id/sync", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    if (!integration.isActive) {
      res.status(400).json({ error: "Integration is not active" });
      return;
    }

    // Mark sync status
    await db
      .update(integrations)
      .set({ syncStatus: "syncing", lastSyncAt: new Date() })
      .where(eq(integrations.id, integrationId));

    // Fire Inngest event to process the sync asynchronously
    const fullSync = req.body?.fullSync === true;
    await inngest.send({
      name: "integration/sync.requested",
      data: { integrationId, orgId, fullSync },
    });

    req.log.info({ integrationId, orgId, fullSync }, "Integration sync triggered");

    res.status(202).json({
      message: "Sync started",
      integrationId,
      fullSync,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

// ---------------------------------------------------------------------------
// Update sync config (folder selection, interval, etc.)
// ---------------------------------------------------------------------------
router.patch("/integrations/:id/config", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    const { folderIds, direction, intervalMinutes, name } = req.body;

    const currentConfig = (integration.syncConfig as Record<string, unknown>) ?? {};
    const newConfig = {
      ...currentConfig,
      ...(folderIds !== undefined && { folderIds }),
      ...(direction !== undefined && { direction }),
      ...(intervalMinutes !== undefined && { intervalMinutes }),
    };

    const [updated] = await db
      .update(integrations)
      .set({
        syncConfig: newConfig,
        ...(name !== undefined && { name }),
      })
      .where(eq(integrations.id, integrationId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update integration config");
    res.status(500).json({ error: "Failed to update config" });
  }
});

// ---------------------------------------------------------------------------
// List Google Drive folders
// ---------------------------------------------------------------------------
router.get("/integrations/:id/drive/folders", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    if (integration.type !== "google_drive") {
      res.status(400).json({ error: "Only supported for Google Drive integrations" });
      return;
    }

    if (!integration.isActive) {
      res.status(400).json({ error: "Integration is not active" });
      return;
    }

    // Ensure token is fresh
    const accessToken = await ensureFreshToken(integration);

    const parentId = (req.query.parentId as string) || undefined;
    const folders = await listFolders(accessToken, parentId);

    res.json({ folders });
  } catch (err) {
    req.log.error({ err }, "Failed to list Drive folders");
    res.status(500).json({ error: "Failed to list folders" });
  }
});

// ---------------------------------------------------------------------------
// List files in a Drive folder
// ---------------------------------------------------------------------------
router.get("/integrations/:id/drive/files", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    if (integration.type !== "google_drive") {
      res.status(400).json({ error: "Only supported for Google Drive integrations" });
      return;
    }

    const accessToken = await ensureFreshToken(integration);
    const folderId = (req.query.folderId as string) || "root";
    const pageToken = (req.query.pageToken as string) || undefined;

    const result = await listFilesInFolder(accessToken, folderId, pageToken);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list Drive files");
    res.status(500).json({ error: "Failed to list files" });
  }
});

// ---------------------------------------------------------------------------
// Get sync status
// ---------------------------------------------------------------------------
router.get("/integrations/:id/sync-status", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const integrationId = parseInt(req.params.id as string);

  if (isNaN(integrationId)) {
    res.status(400).json({ error: "Invalid integration id" });
    return;
  }

  try {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    const files = await db
      .select()
      .from(syncedFiles)
      .where(eq(syncedFiles.integrationId, integrationId));

    const totalFiles = files.length;
    const syncedCount = files.filter((f) => f.syncStatus === "synced").length;
    const pendingCount = files.filter((f) => f.syncStatus === "pending").length;
    const failedCount = files.filter((f) => f.syncStatus === "failed").length;

    res.json({
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        isActive: integration.isActive,
        syncStatus: (integration as any).syncStatus ?? "idle",
        lastSyncAt: integration.lastSyncAt,
        lastError: (integration as any).lastError,
        totalFilesSynced: (integration as any).totalFilesSynced ?? 0,
      },
      syncProgress: {
        totalFiles,
        syncedCount,
        pendingCount,
        failedCount,
      },
      recentFiles: files.slice(0, 20),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get sync status");
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

export { router as integrationsRouter };
export default router;
