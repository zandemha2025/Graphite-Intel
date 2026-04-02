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
