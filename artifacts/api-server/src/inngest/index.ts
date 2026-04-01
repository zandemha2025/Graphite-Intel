/**
 * Central registry of all Inngest functions.
 * Import and re-export every function here so the serve() handler picks them all up.
 */
export { workflowExecuteFunction } from "./functions/workflow-execute";

// Future functions (uncomment as implemented):
// export { integrationSyncFunction } from "./functions/integration-sync";
// export { documentIndexFunction } from "./functions/document-index";
// export { webhookProcessFunction } from "./functions/webhook-process";
// export { playbookGenerateFunction } from "./functions/playbook-generate";
// export { adsCampaignPublishFunction } from "./functions/ads-campaign-publish";
// export { adsMetricsSyncFunction } from "./functions/ads-metrics-sync";
// export { adsAutoOptimizeFunction } from "./functions/ads-auto-optimize";
// export { adsReportGenerateFunction } from "./functions/ads-report-generate";
