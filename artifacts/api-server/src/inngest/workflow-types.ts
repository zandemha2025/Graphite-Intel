/**
 * Typed interfaces for workflow triggers and steps.
 * These define the shape of the JSONB config fields in workflow_definitions and workflow_steps.
 */

// ============================================================
// Trigger Types
// ============================================================

export interface CronTrigger {
  type: "cron";
  /** Standard 5-field cron expression e.g. "0 9 * * 1" (Mon 9am) */
  cron: string;
  timezone?: string;
}

export interface WebhookTrigger {
  type: "webhook";
  /** Stable identifier used to route incoming webhook requests to this workflow */
  webhookId: string;
  secret?: string;
}

export interface EventTrigger {
  type: "event";
  /** Inngest event name to listen for, e.g. "integration/sync.requested" */
  eventName: string;
  /** Optional: only trigger when this field in event.data matches filterValue */
  filterField?: string;
  filterValue?: string | number;
}

export interface ManualTrigger {
  type: "manual";
}

export type WorkflowTrigger = CronTrigger | WebhookTrigger | EventTrigger | ManualTrigger;

// ============================================================
// Step Config Types
// ============================================================

export interface DataPullStepConfig {
  stepType: "data_pull";
  /** Where to pull data from */
  source: "vault" | "document" | "integration" | "url";
  query?: string;
  integrationId?: number;
  documentId?: number;
  url?: string;
  limit?: number;
}

export interface TransformStepConfig {
  stepType: "transform";
  /** Natural language instruction describing the transformation */
  instruction: string;
  /** Context key whose value becomes the input; defaults to the entire context */
  inputKey?: string;
  outputFormat?: "json" | "text" | "markdown";
}

export interface AIAnalysisStepConfig {
  stepType: "ai_analysis";
  systemPrompt?: string;
  analysisPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  outputFormat?: "json" | "text" | "markdown";
}

export interface ConditionStepConfig {
  stepType: "condition";
  /** JavaScript expression evaluated against the step context */
  expression: string;
  /** Step index to jump to when expression is truthy */
  trueStepIndex: number;
  /** Step index to jump to when expression is falsy (-1 = end workflow) */
  falseStepIndex: number;
}

export interface ActionStepConfig {
  stepType: "action";
  action: "send_email" | "create_document" | "update_integration" | "call_webhook" | "notify";
  params: Record<string, unknown>;
}

export type WorkflowStepConfig =
  | DataPullStepConfig
  | TransformStepConfig
  | AIAnalysisStepConfig
  | ConditionStepConfig
  | ActionStepConfig;

// ============================================================
// WorkflowConfig — stored in workflowDefinitions.config JSONB
// ============================================================

export interface WorkflowConfig {
  trigger: WorkflowTrigger;
  /** Declares which inputs the workflow accepts when triggered manually */
  inputSchema?: Record<string, { type: string; description?: string; required?: boolean }>;
  tags?: string[];
  /** Original natural language description that generated this workflow, if any */
  nlDescription?: string;
}

// ============================================================
// Parsed Workflow Definition (output of the NL parser)
// ============================================================

export interface ParsedWorkflowStep {
  type: string;
  name: string;
  description?: string;
  config: WorkflowStepConfig;
}

export interface ParsedWorkflowDefinition {
  name: string;
  description: string;
  icon?: string;
  config: WorkflowConfig;
  steps: ParsedWorkflowStep[];
}
