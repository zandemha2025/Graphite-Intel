import { inngest } from "../client";
import { db, workflowDefinitions, workflowExecutions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { WorkflowConfig } from "../workflow-types";

/**
 * Generic cron-dispatch function.
 *
 * Runs every minute and finds all published workflow definitions whose trigger
 * is type="cron" and whose cron expression is due at the current minute.
 * Creates a workflowExecution record and fires a "workflow/execute" Inngest event
 * for each matching workflow.
 *
 * Because Inngest functions must be registered at startup we use a single
 * polling function rather than registering one function per workflow.
 */
export const workflowCronTriggerFunction = inngest.createFunction(
  { id: "workflow-cron-trigger", retries: 1 },
  { cron: "* * * * *" },
  async ({ step }) => {
    const now = new Date();

    const cronWorkflows = await step.run("fetch-cron-workflows", async () => {
      const all = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.isPublished, true),
            eq(workflowDefinitions.status, "published"),
          ),
        );

      return all.filter((wf) => {
        const config = wf.config as WorkflowConfig;
        return config?.trigger?.type === "cron";
      });
    });

    if (cronWorkflows.length === 0) return { triggered: 0 };

    const triggeredIds: number[] = [];

    for (const wf of cronWorkflows) {
      const config = wf.config as WorkflowConfig;
      const trigger = config.trigger as { type: "cron"; cron: string };

      const due = await step.run(`check-due-${wf.id}`, async () => {
        return isCronDue(trigger.cron, now);
      });

      if (!due) continue;

      const executionId = await step.run(`create-execution-${wf.id}`, async () => {
        const [execution] = await db
          .insert(workflowExecutions)
          .values({
            orgId: wf.orgId,
            workflowDefinitionId: wf.id,
            triggeredByUserId: "system:cron",
            title: `Scheduled: ${wf.name}`,
            status: "pending",
            inputs: {},
            outputs: {},
            currentStepIndex: 0,
          })
          .returning();

        return execution!.id;
      });

      await step.run(`fire-execution-${executionId}`, async () => {
        await inngest.send({
          name: "workflow/execute",
          data: { executionId, orgId: wf.orgId },
        });
      });

      triggeredIds.push(executionId);
    }

    return { triggered: triggeredIds.length, executionIds: triggeredIds };
  },
);

/**
 * Checks whether a 5-field cron expression is due at the given Date.
 * Only minute-level precision; seconds are ignored.
 */
function isCronDue(cronExpr: string, now: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchField(minute!, now.getMinutes(), 0, 59) &&
    matchField(hour!, now.getHours(), 0, 23) &&
    matchField(dayOfMonth!, now.getDate(), 1, 31) &&
    matchField(month!, now.getMonth() + 1, 1, 12) &&
    matchField(dayOfWeek!, now.getDay(), 0, 6)
  );
}

function matchField(expr: string, value: number, _min: number, _max: number): boolean {
  if (expr === "*") return true;

  if (expr.startsWith("*/")) {
    const step = parseInt(expr.slice(2));
    return !isNaN(step) && value % step === 0;
  }

  if (expr.includes(",")) {
    return expr.split(",").some((v) => parseInt(v) === value);
  }

  if (expr.includes("-")) {
    const [a, b] = expr.split("-").map(Number);
    return value >= (a ?? 0) && value <= (b ?? 0);
  }

  return parseInt(expr) === value;
}
