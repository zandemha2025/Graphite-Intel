import { inngest } from "../client";
import { db, workflowDefinitions, workflowExecutions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { WorkflowConfig } from "../workflow-types";

/**
 * Handles "workflow/webhook.received" events.
 *
 * The route POST /workflow-webhook/:webhookId fires this event when an
 * external system calls the webhook endpoint. This function finds all
 * published workflows whose trigger.webhookId matches and creates an
 * execution for each one, forwarding the incoming payload as inputs.
 */
export const workflowWebhookTriggerFunction = inngest.createFunction(
  { id: "workflow-webhook-trigger", retries: 2 },
  { event: "workflow/webhook.received" },
  async ({ event, step }) => {
    const { webhookId, orgId, payload } = event.data;

    const matchedWorkflows = await step.run("find-webhook-workflows", async () => {
      const all = await db
        .select()
        .from(workflowDefinitions)
        .where(
          and(
            eq(workflowDefinitions.orgId, orgId),
            eq(workflowDefinitions.isPublished, true),
            eq(workflowDefinitions.status, "published"),
          ),
        );

      return all.filter((wf) => {
        const config = wf.config as WorkflowConfig;
        return (
          config?.trigger?.type === "webhook" &&
          (config.trigger as { type: "webhook"; webhookId: string }).webhookId === webhookId
        );
      });
    });

    if (matchedWorkflows.length === 0) {
      return { triggered: 0, webhookId };
    }

    const executionIds: number[] = [];

    for (const wf of matchedWorkflows) {
      const executionId = await step.run(`create-execution-${wf.id}`, async () => {
        const [execution] = await db
          .insert(workflowExecutions)
          .values({
            orgId: wf.orgId,
            workflowDefinitionId: wf.id,
            triggeredByUserId: "system:webhook",
            title: `Webhook: ${wf.name}`,
            status: "pending",
            inputs: (payload as Record<string, unknown>) ?? {},
            outputs: {},
            currentStepIndex: 0,
          })
          .returning();

        return execution!.id;
      });

      await step.run(`fire-execution-${executionId}`, async () => {
        await inngest.send({
          name: "workflow/execute",
          data: { executionId, orgId },
        });
      });

      executionIds.push(executionId);
    }

    return { triggered: executionIds.length, executionIds, webhookId };
  },
);
