import { Router, type IRouter, type Request, type Response } from "express";
import { db, integrations, syncedFiles, documents } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /integrations
 * List all integrations for the organization.
 */
router.get("/integrations", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const integrationsData = await db
      .select()
      .from(integrations)
      .where(eq(integrations.orgId, orgId))
      .orderBy(integrations.createdAt);
    res.json(integrationsData);
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Failed to list integrations" });
  }
});

/**
 * GET /integrations/oauth/google/start
 * Begin Google Drive OAuth flow.
 * Generates a state token, builds authorization URL, and returns it for redirect.
 * TODO: Configure actual Google OAuth credentials and client ID.
 */
router.get("/integrations/oauth/google/start", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;

  try {
    // Generate a secure state token for CSRF protection
    const stateToken = randomBytes(32).toString("hex");

    // Store state token in session temporarily (ideally in Redis or DB)
    // For now, include it in session
    const session = req as any;
    if (!session._oauthState) {
      session._oauthState = {};
    }
    session._oauthState.state = stateToken;
    session._oauthState.orgId = orgId;
    session._oauthState.userId = userId;

    // TODO: Replace with actual Google OAuth client ID from environment
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "YOUR_CLIENT_ID.apps.googleusercontent.com";
    const REDIRECT_URI = `${process.env.API_BASE_URL || "http://localhost:3000"}/integrations/oauth/google/callback`;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ].join(" "));
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("state", stateToken);

    res.json({
      authUrl: authUrl.toString(),
      state: stateToken,
      message: "TODO: Implement actual Google OAuth credentials. Redirect user to authUrl.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to start OAuth flow");
    res.status(500).json({ error: "Failed to start OAuth flow" });
  }
});

/**
 * GET /integrations/oauth/google/callback
 * Handle OAuth callback after user grants permissions.
 * Exchanges authorization code for tokens and stores them.
 * TODO: Complete token exchange implementation.
 */
router.get("/integrations/oauth/google/callback", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { code, state, error } = req.query;

  try {
    if (error) {
      req.log.error({ error }, "OAuth error from provider");
      res.status(400).json({ error: "OAuth authorization failed", details: error });
      return;
    }

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    // Verify state token to prevent CSRF
    const session = req as any;
    const sessionState = session._oauthState?.state;
    if (!sessionState || sessionState !== state) {
      res.status(400).json({ error: "Invalid state token. CSRF protection triggered." });
      return;
    }

    const orgId = session._oauthState?.orgId;
    const userId = session._oauthState?.userId;

    if (!orgId || !userId) {
      res.status(400).json({ error: "Invalid session state" });
      return;
    }

    // TODO: Exchange authorization code for access token and refresh token
    // const tokens = await exchangeCodeForTokens(code);
    // const { access_token, refresh_token, expires_in } = tokens;

    // For now, create a stub integration record
    const [integration] = await db
      .insert(integrations)
      .values({
        orgId,
        connectedByUserId: userId,
        type: "google_drive",
        name: "Google Drive",
        accessToken: "STUB_ACCESS_TOKEN", // TODO: Replace with actual token
        refreshToken: "STUB_REFRESH_TOKEN", // TODO: Replace with actual token
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: [
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/drive.metadata.readonly",
        ],
        metadata: {
          // TODO: Get from Google API after token exchange
          email: "user@gmail.com",
          displayName: "User",
        },
        isActive: true,
        syncConfig: {
          folderIds: [],
          direction: "pull",
          intervalMinutes: 30,
        },
      })
      .returning();

    // Clear session tokens
    delete session._oauthState;

    req.log.info(
      { integrationId: integration.id, orgId },
      "TODO: Complete token exchange and fetch user metadata from Google API"
    );

    res.json({
      success: true,
      integration,
      message: "Integration created. TODO: Implement actual token exchange.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to handle OAuth callback");
    res.status(500).json({ error: "Failed to complete OAuth flow" });
  }
});

/**
 * POST /integrations/:id/disconnect
 * Deactivate an integration.
 */
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
      .set({ isActive: false })
      .where(eq(integrations.id, integrationId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect integration");
    res.status(500).json({ error: "Failed to disconnect integration" });
  }
});

/**
 * POST /integrations/:id/sync
 * Trigger a manual sync for an integration.
 * Creates a sync record and queues the job.
 * TODO: Trigger Inngest event for actual sync.
 */
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

    // Update lastSyncAt timestamp
    const [updated] = await db
      .update(integrations)
      .set({ lastSyncAt: new Date() })
      .where(eq(integrations.id, integrationId))
      .returning();

    // TODO: Trigger Inngest event to process sync
    req.log.info(
      { integrationId, orgId },
      "TODO: Send sync job to Inngest queue"
    );

    res.status(202).json({
      integration: updated,
      message: "Sync queued. TODO: Implement actual sync with Inngest.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger sync");
    res.status(500).json({ error: "Failed to trigger sync" });
  }
});

/**
 * GET /integrations/:id/drive/folders
 * List folders from Google Drive for this integration.
 * TODO: Implement actual Google Drive API call.
 */
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
      res.status(400).json({ error: "This operation is only supported for Google Drive integrations" });
      return;
    }

    if (!integration.isActive) {
      res.status(400).json({ error: "Integration is not active" });
      return;
    }

    // TODO: Call Google Drive API using integration.accessToken
    // const drive = google.drive({ version: "v3", auth: oauth2Client });
    // const folders = await drive.files.list({
    //   q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    //   spaces: "drive",
    //   fields: "files(id, name, webViewLink)",
    //   pageSize: 100,
    // });

    req.log.info(
      { integrationId, orgId },
      "TODO: Implement Google Drive API call to list folders"
    );

    res.json({
      folders: [],
      message: "TODO: Implement actual Google Drive API call. accessToken: " + (integration.accessToken ? "set" : "missing"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list Drive folders");
    res.status(500).json({ error: "Failed to list folders" });
  }
});

/**
 * GET /integrations/:id/sync-status
 * Get sync progress and status for an integration.
 */
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

    // Get synced files for this integration
    const syncedFilesList = await db
      .select()
      .from(syncedFiles)
      .where(eq(syncedFiles.integrationId, integrationId));

    const totalFiles = syncedFilesList.length;
    const syncedCount = syncedFilesList.filter((f) => f.syncStatus === "synced").length;
    const pendingCount = syncedFilesList.filter((f) => f.syncStatus === "pending").length;
    const failedCount = syncedFilesList.filter((f) => f.syncStatus === "failed").length;

    res.json({
      integration,
      syncStatus: {
        totalFiles,
        syncedCount,
        pendingCount,
        failedCount,
        lastSyncAt: integration.lastSyncAt,
        isActive: integration.isActive,
      },
      files: syncedFilesList,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get sync status");
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

export { router as integrationsRouter };
export default router;
