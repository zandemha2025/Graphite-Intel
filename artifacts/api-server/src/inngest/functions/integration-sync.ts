/**
 * Inngest function: integration/sync.requested
 * Orchestrates syncing files from a connected integration (e.g. Google Drive).
 *
 * Flow:
 * 1. Load integration record + refresh token if needed
 * 2. List files from configured folders
 * 3. Fan out per-file sync events for new/changed files
 * 4. Update integration health status
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { integrations, syncedFiles } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ensureFreshToken } from "../../lib/oauth-tokens";
import {
  listFilesInFolder,
  listChangedFiles,
} from "../../lib/providers/google-drive";

export const integrationSyncFunction = inngest.createFunction(
  {
    id: "integration-sync",
    retries: 2,
    concurrency: [{ limit: 3 }], // max 3 syncs at once
  },
  { event: "integration/sync.requested" },
  async ({ event, step }) => {
    const { integrationId, orgId, fullSync } = event.data;

    // Step 1: Load integration and get fresh token
    const { integration, accessToken } = await step.run("load-integration", async () => {
      const [integ] = await db
        .select()
        .from(integrations)
        .where(and(eq(integrations.id, integrationId), eq(integrations.orgId, orgId)));

      if (!integ) throw new Error(`Integration ${integrationId} not found`);
      if (!integ.isActive) throw new Error(`Integration ${integrationId} is not active`);

      const token = await ensureFreshToken(integ);
      return { integration: integ, accessToken: token };
    });

    // Step 2: Discover files to sync
    const filesToSync = await step.run("discover-files", async () => {
      const syncConfig = (integration.syncConfig as Record<string, unknown>) ?? {};
      const folderIds = (syncConfig.folderIds as string[]) ?? [];

      // If no folders configured, use "root"
      const foldersToScan = folderIds.length > 0 ? folderIds : ["root"];

      // Collect all files from all configured folders
      const allFiles: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime?: string;
      }> = [];

      if (!fullSync && integration.lastSyncAt) {
        // Incremental sync: only files changed since last sync
        let pageToken: string | undefined;
        do {
          const result = await listChangedFiles(
            accessToken,
            new Date(integration.lastSyncAt),
            pageToken,
          );
          allFiles.push(...result.files);
          pageToken = result.nextPageToken;
        } while (pageToken);
      } else {
        // Full sync: list all files in configured folders
        for (const folderId of foldersToScan) {
          let pageToken: string | undefined;
          do {
            const result = await listFilesInFolder(accessToken, folderId, pageToken);
            allFiles.push(...result.files);
            pageToken = result.nextPageToken;
          } while (pageToken);
        }
      }

      // Filter out Google Docs/folders that can't be downloaded meaningfully
      const supportedTypes = allFiles.filter(
        (f) => !f.mimeType.includes("vnd.google-apps.folder"),
      );

      return supportedTypes;
    });

    // Step 3: Check which files are new or changed
    const newOrChangedFiles = await step.run("diff-files", async () => {
      const existingSynced = await db
        .select()
        .from(syncedFiles)
        .where(eq(syncedFiles.integrationId, integrationId));

      const existingMap = new Map(existingSynced.map((f) => [f.externalId, f]));

      return filesToSync.filter((file) => {
        const existing = existingMap.get(file.id);
        if (!existing) return true; // New file

        // Changed file: compare modifiedTime
        if (file.modifiedTime && existing.lastSyncedAt) {
          return new Date(file.modifiedTime) > new Date(existing.lastSyncedAt);
        }
        return false;
      });
    });

    // Step 4: Fan out sync events for each file
    if (newOrChangedFiles.length > 0) {
      await step.run("queue-file-syncs", async () => {
        // Create synced_files records for new files (set status=pending)
        for (const file of newOrChangedFiles) {
          const [existing] = await db
            .select()
            .from(syncedFiles)
            .where(
              and(
                eq(syncedFiles.integrationId, integrationId),
                eq(syncedFiles.externalId, file.id),
              ),
            );

          if (!existing) {
            await db.insert(syncedFiles).values({
              integrationId,
              externalId: file.id,
              externalName: file.name,
              mimeType: file.mimeType,
              syncStatus: "pending",
            });
          } else {
            await db
              .update(syncedFiles)
              .set({ syncStatus: "pending" })
              .where(eq(syncedFiles.id, existing.id));
          }
        }

        // Send per-file sync events
        const events = newOrChangedFiles.map((file) => ({
          name: "integration/sync.file" as const,
          data: {
            integrationId,
            externalFileId: file.id,
            action: "upsert" as const,
          },
        }));

        // Inngest allows batching up to 100 events
        const BATCH_SIZE = 100;
        for (let i = 0; i < events.length; i += BATCH_SIZE) {
          await inngest.send(events.slice(i, i + BATCH_SIZE));
        }
      });
    }

    // Step 5: Update integration status
    await step.run("update-status", async () => {
      await db
        .update(integrations)
        .set({
          syncStatus: "idle",
          lastSyncAt: new Date(),
          consecutiveFailures: 0,
          lastError: null,
        })
        .where(eq(integrations.id, integrationId));
    });

    return {
      integrationId,
      totalDiscovered: filesToSync.length,
      newOrChanged: newOrChangedFiles.length,
    };
  },
);
