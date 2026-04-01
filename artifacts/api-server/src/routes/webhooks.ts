/**
 * Webhook receiver for third-party push notifications.
 * Google Drive sends change notifications here when files are modified.
 *
 * NOTE: These endpoints are NOT behind auth middleware — they receive
 * unauthenticated POST requests from Google's servers. We verify them
 * by matching the X-Goog-Channel-ID header to a known webhook record.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { integrationWebhooks } from "@workspace/db";
import { eq } from "drizzle-orm";
import { inngest } from "../inngest/client";

const router: IRouter = Router();

/**
 * POST /webhooks/google-drive
 * Receives push notifications from Google Drive Changes API.
 * Google sends a "sync" message first (to verify the channel), then
 * "change" messages whenever files are modified.
 */
router.post("/webhooks/google-drive", async (req: Request, res: Response) => {
  try {
    const channelId = req.headers["x-goog-channel-id"] as string;
    const resourceState = req.headers["x-goog-resource-state"] as string;
    const resourceId = req.headers["x-goog-resource-id"] as string;

    if (!channelId) {
      res.status(400).json({ error: "Missing channel ID" });
      return;
    }

    // Look up the webhook record
    const [webhook] = await db
      .select()
      .from(integrationWebhooks)
      .where(eq(integrationWebhooks.channelId, channelId));

    if (!webhook || webhook.status !== "active") {
      // Unknown or expired channel — tell Google to stop sending
      res.status(404).end();
      return;
    }

    // Update last notification timestamp
    await db
      .update(integrationWebhooks)
      .set({
        lastNotificationAt: new Date(),
        resourceId: resourceId || webhook.resourceId,
      })
      .where(eq(integrationWebhooks.id, webhook.id));

    if (resourceState === "sync") {
      // Initial sync message from Google — just acknowledge
      req.log?.info?.({ channelId }, "Google Drive webhook sync received");
      res.status(200).end();
      return;
    }

    if (resourceState === "change") {
      // File change detected — trigger an incremental sync
      await inngest.send({
        name: "integration/sync.requested",
        data: {
          integrationId: webhook.integrationId,
          orgId: 0, // Will be resolved from integration record
          fullSync: false,
        },
      });

      req.log?.info?.({ channelId, integrationId: webhook.integrationId }, "Google Drive change notification → sync triggered");
    }

    // Always respond 200 to Google so it doesn't retry
    res.status(200).end();
  } catch (err) {
    // Still respond 200 to avoid Google retrying on our errors
    req.log?.error?.({ err }, "Error processing Google Drive webhook");
    res.status(200).end();
  }
});

/**
 * GET /webhooks/google-drive
 * Google sometimes sends a GET for channel verification.
 */
router.get("/webhooks/google-drive", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

export { router as webhooksRouter };
export default router;
