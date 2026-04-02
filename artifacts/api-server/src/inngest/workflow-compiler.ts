import type { WorkflowDefinition, WorkflowStep } from "@workspace/db";
import type { WorkflowConfig, WorkflowTrigger } from "./workflow-types";

export interface CompiledWorkflow {
  definitionId: number;
  name: string;
  trigger: WorkflowTrigger;
  stepCount: number;
  /** Populated when trigger.type === "webhook" */
  webhookUrl?: string;
  /** Populated when trigger.type === "cron" */
  cronExpression?: string;
  /** Populated when trigger.type === "event" */
  eventName?: string;
  status: "ready" | "invalid";
  errors: string[];
}

const VALID_STEP_TYPES = new Set([
  "prompt",
  "tool",
  "branch",
  "loop",
  "human_review",
  "data_pull",
  "transform",
  "ai_analysis",
  "condition",
  "action",
]);

/**
 * Compiles a persisted workflow definition into a runnable descriptor.
 *
 * - Validates trigger configuration
 * - Validates all step types
 * - For webhook triggers: computes the webhook URL
 * - For cron triggers: validates the cron expression
 *
 * Registered Inngest functions (workflowCronTriggerFunction, workflowWebhookTriggerFunction)
 * handle execution at runtime; this compiler validates correctness at definition time.
 */
export function compileWorkflow(
  definition: WorkflowDefinition,
  steps: WorkflowStep[],
): CompiledWorkflow {
  const errors: string[] = [];
  const config = definition.config as WorkflowConfig;

  if (!config?.trigger) {
    errors.push("Missing trigger configuration in workflow config");
  }

  const trigger: WorkflowTrigger = config?.trigger ?? { type: "manual" };

  // Trigger-specific validation
  if (trigger.type === "cron") {
    if (!trigger.cron) {
      errors.push("Cron trigger requires a non-empty cron expression");
    } else if (!isValidCronExpression(trigger.cron)) {
      errors.push(`Invalid cron expression: "${trigger.cron}"`);
    }
  }

  if (trigger.type === "webhook") {
    if (!trigger.webhookId || typeof trigger.webhookId !== "string") {
      errors.push("Webhook trigger requires a non-empty webhookId");
    }
  }

  if (trigger.type === "event") {
    if (!trigger.eventName || typeof trigger.eventName !== "string") {
      errors.push("Event trigger requires a non-empty eventName");
    }
  }

  // Step validation
  if (steps.length === 0) {
    errors.push("Workflow must have at least one step");
  }

  for (const step of steps) {
    if (!VALID_STEP_TYPES.has(step.type)) {
      errors.push(`Step ${step.stepIndex} has unknown type: "${step.type}"`);
    }
    if (!step.config || typeof step.config !== "object") {
      errors.push(`Step ${step.stepIndex} is missing a config object`);
    }
  }

  const compiled: CompiledWorkflow = {
    definitionId: definition.id,
    name: definition.name,
    trigger,
    stepCount: steps.length,
    status: errors.length === 0 ? "ready" : "invalid",
    errors,
  };

  if (trigger.type === "cron") {
    compiled.cronExpression = trigger.cron;
  }
  if (trigger.type === "webhook") {
    compiled.webhookUrl = `/api/workflow-webhook/${trigger.webhookId}`;
  }
  if (trigger.type === "event") {
    compiled.eventName = trigger.eventName;
  }

  return compiled;
}

/**
 * Lightweight validation of a 5-field cron expression.
 * Does not validate all edge cases but catches obviously wrong inputs.
 */
function isValidCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // [min, hour, dom, month, dow]
  const ranges: Array<[number, number]> = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 7],
  ];

  return parts.every((part, i) => {
    if (part === "*") return true;

    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2));
      return !isNaN(step) && step > 0;
    }

    if (part.includes(",")) {
      return part.split(",").every((v) => isInRange(v, ranges[i]!));
    }

    if (part.includes("-")) {
      const [a, b] = part.split("-");
      const start = parseInt(a ?? "");
      const end = parseInt(b ?? "");
      return !isNaN(start) && !isNaN(end) && start <= end;
    }

    return isInRange(part, ranges[i]!);
  });
}

function isInRange(value: string, [min, max]: [number, number]): boolean {
  const n = parseInt(value);
  return !isNaN(n) && n >= min && n <= max;
}
