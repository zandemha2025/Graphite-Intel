/**
 * Central registry of all Inngest functions.
 * Import and re-export every function here so the serve() handler picks them all up.
 */
export { workflowExecuteFunction } from "./functions/workflow-execute";
export { integrationSyncFunction } from "./functions/integration-sync";
export { integrationSyncFileFunction } from "./functions/integration-sync-file";
export { playbookGenerateFunction } from "./functions/playbook-generate";

export { adsCampaignPublishFunction } from "./functions/ads-campaign-publish";
export { adsMetricsSyncFunction } from "./functions/ads-metrics-sync";
export { adsAutoOptimizeFunction } from "./functions/ads-auto-optimize";
export { adsReportGenerateFunction } from "./functions/ads-report-generate";

// Conversational workflow trigger functions
export { workflowCronTriggerFunction } from "./functions/workflow-cron-trigger";
export { workflowWebhookTriggerFunction } from "./functions/workflow-webhook-trigger";

export { documentExtractionFunction } from "./functions/document-extraction";

// Future functions (uncomment as implemented):
// export { documentIndexFunction } from "./functions/document-index";
// export { webhookProcessFunction } from "./functions/webhook-process";
