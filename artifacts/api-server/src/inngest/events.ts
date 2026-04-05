/**
 * Typed event definitions for the Inngest event bus.
 * All cross-feature events flow through here for type safety.
 */
export type GrphintelEvents = {
  // Workflow events
  "workflow/execute": {
    data: { executionId: number; orgId: number };
  };
  "workflow/step.completed": {
    data: { executionId: number; stepIndex: number; output: unknown };
  };
  "workflow/human-review.requested": {
    data: { executionId: number; stepIndex: number; reviewData: unknown };
  };
  "workflow/human-review.completed": {
    data: {
      executionId: number;
      stepIndex: number;
      approved: boolean;
      feedback?: string;
      modifiedData?: Record<string, unknown>;
    };
  };

  // Integration events
  "integration/sync.requested": {
    data: { integrationId: number; orgId: number; fullSync?: boolean };
  };
  "integration/sync.file": {
    data: {
      integrationId: number;
      externalFileId: string;
      action: "upsert" | "delete";
    };
  };
  "integration/webhook.received": {
    data: { provider: string; integrationId: number; payload: unknown };
  };

  // Document events
  "document/uploaded": {
    data: { documentId: number; orgId: number };
  };
  "document/index.requested": {
    data: { documentId: number; orgId: number };
  };
  "document/chunks.ready": {
    data: { documentId: number; chunkCount: number };
  };

  // Playbook events
  "playbook/generate": {
    data: {
      playbookId: number;
      orgId: number;
      sourceDocumentIds: number[];
      prompt?: string;
    };
  };
  "playbook/execute": {
    data: { playbookRunId: number; orgId: number };
  };

  // Workflow trigger events
  "workflow/webhook.received": {
    data: {
      webhookId: string;
      orgId: number;
      payload: unknown;
    };
  };
  "workflow/event.received": {
    data: {
      eventName: string;
      orgId: number;
      payload: unknown;
    };
  };

  // Connector / data-sync events
  "connector/data.sync": {
    data: { connectorId: number };
  };
  "connector/data.synced": {
    data: {
      connectorId: string;
      orgId: number;
      dataType?: string;
      recordCount: number;
      syncedAt: string;
      /** Optional sample of synced data forwarded as workflow input */
      payload?: Record<string, unknown>;
    };
  };

  // Threshold check events (fired by metrics monitoring)
  "metrics/threshold.crossed": {
    data: {
      orgId: number;
      metric: string;
      currentValue: number;
      previousValue: number;
      crossedAt: string;
    };
  };

  // Vault extraction events
  "vault/extraction.requested": {
    data: { extractionId: number };
  };

  // Ads events
  "ads/campaign.publish": {
    data: { campaignId: number; orgId: number; platforms: string[] };
  };
  "ads/metrics.sync": {
    data: {
      adAccountId: number;
      orgId: number;
      dateRange: { from: string; to: string };
    };
  };
  "ads/optimize.run": {
    data: {
      campaignId: number;
      orgId: number;
      mode: "recommend" | "auto";
    };
  };
  "ads/report.generate": {
    data: {
      orgId: number;
      reportType: string;
      campaignIds?: number[];
      dateRange: { from: string; to: string };
    };
  };
};
