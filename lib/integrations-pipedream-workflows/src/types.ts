import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Workflow trigger — what starts the automation
// ---------------------------------------------------------------------------

export type TriggerType = "http" | "schedule" | "app_event";

export interface WorkflowTrigger {
  type: TriggerType;
  appSlug?: string;    // e.g. "hubspot" for app_event triggers
  eventType?: string;  // e.g. "contact.created"
  schedule?: string;   // cron expression e.g. "0 9 * * 1-5"
  httpMethod?: "GET" | "POST";
  description?: string;
}

// ---------------------------------------------------------------------------
// Workflow step — a single action in the automation chain
// ---------------------------------------------------------------------------

export type StepType = "action" | "filter" | "code" | "send_http";

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  appSlug?: string;
  componentKey?: string; // Pipedream component key e.g. "hubspot-get-contacts"
  props?: Record<string, unknown>;
  code?: string;         // For custom Node.js code steps
  description?: string;
}

// ---------------------------------------------------------------------------
// Complete workflow definition (the structured payload sent to Pipedream)
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

// ---------------------------------------------------------------------------
// Deployed Pipedream workflow (response from Pipedream REST API)
// ---------------------------------------------------------------------------

export interface PipedreamWorkflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  url?: string;
  created_at: string;
  updated_at: string;
  org_id?: string;
}

// ---------------------------------------------------------------------------
// Workflow execution / event summary
// ---------------------------------------------------------------------------

export type ExecutionStatus = "success" | "error" | "running" | "cancelled";

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: ExecutionStatus;
  started_at: string;
  ended_at?: string;
  error?: string;
  duration_ms?: number;
}

// ---------------------------------------------------------------------------
// AI-generated workflow preview (before deployment)
// ---------------------------------------------------------------------------

export interface WorkflowPreview {
  naturalLanguageInput: string;
  definition: WorkflowDefinition;
  estimatedApps: string[];
  readableDescription: string;
}

// ---------------------------------------------------------------------------
// Automation suggestion (for /suggest endpoint)
// ---------------------------------------------------------------------------

export interface AutomationSuggestion {
  title: string;
  description: string;
  triggerSummary: string;
  outcomeSummary: string;
  apps: string[];
  naturalLanguage: string; // Ready-to-use input for POST /pipedream/workflows/generate
  complexity: "simple" | "medium" | "complex";
}

// ---------------------------------------------------------------------------
// Client config
// ---------------------------------------------------------------------------

export interface PipedreamWorkflowsConfig {
  clientId?: string;
  clientSecret?: string;
  apiBase?: string; // defaults to https://api.pipedream.com
}

// ---------------------------------------------------------------------------
// OAuth token response
// ---------------------------------------------------------------------------

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ---------------------------------------------------------------------------
// Zod schemas for request validation (used in routes)
// ---------------------------------------------------------------------------

export const generateWorkflowSchema = z.object({
  description: z.string().min(10),
  connectedApps: z.array(z.string()).optional(),
});

export const deployWorkflowSchema = z.object({
  definition: z.object({
    name: z.string().min(1),
    description: z.string(),
    trigger: z.object({
      type: z.enum(["http", "schedule", "app_event"]),
      appSlug: z.string().optional(),
      eventType: z.string().optional(),
      schedule: z.string().optional(),
      httpMethod: z.enum(["GET", "POST"]).optional(),
    }),
    steps: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["action", "filter", "code", "send_http"]),
        appSlug: z.string().optional(),
        componentKey: z.string().optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        code: z.string().optional(),
      })
    ),
  }),
  activate: z.boolean().optional().default(true),
});

export const updateWorkflowSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const suggestAutomationsSchema = z.object({
  connectedApps: z.array(z.string()).min(1),
  context: z.string().optional(),
});

export type GenerateWorkflowInput = z.infer<typeof generateWorkflowSchema>;
export type DeployWorkflowInput = z.infer<typeof deployWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type SuggestAutomationsInput = z.infer<typeof suggestAutomationsSchema>;
