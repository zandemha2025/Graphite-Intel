/**
 * Inngest function: connector/data.sync
 *
 * Triggered when a new Pipedream account is registered or when a user
 * requests a manual re-sync. Pulls all default data for the connected
 * app, normalizes it into documents, and embeds for RAG.
 */
import { inngest } from "../client";
import { syncConnectorData, type SyncResult } from "../../lib/connector-sync";

export const connectorDataSyncFunction = inngest.createFunction(
  {
    id: "connector-data-sync",
    retries: 2,
    concurrency: [{ limit: 5 }], // max 5 connector syncs at once
  },
  { event: "connector/data.sync" },
  async ({ event, step }) => {
    const { connectorId } = event.data;

    const result: SyncResult = await step.run("sync-connector-data", async () => {
      return syncConnectorData(connectorId);
    });

    // Log any per-action errors without failing the whole function
    if (result.errors.length > 0) {
      await step.run("log-sync-errors", async () => {
        console.warn(
          `[connector-data-sync] Connector ${connectorId} (${result.appSlug}) completed with ${result.errors.length} action error(s):`,
          result.errors.map((e) => `${e.actionKey}: ${e.message}`),
        );
      });
    }

    return {
      connectorId,
      appSlug: result.appSlug,
      category: result.category,
      actionsAttempted: result.actionsAttempted,
      recordsSynced: result.recordsSynced,
      errorCount: result.errors.length,
    };
  },
);
