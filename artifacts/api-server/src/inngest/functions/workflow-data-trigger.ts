import { inngest } from "../client";
import { db, workflowDefinitions, workflowExecutions } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { WorkflowConfig, DataChangeTrigger } from "../workflow-types";

/**
 * Handles "connector/data.synced" events.
 *
 * When a Pipedream connector (or any data source) completes a sync, this
 * function finds all published workflow definitions that have a `data_change`
 * trigger matching the connector/data type and creates an execution for each,
 * forwarding the sync payload as input.
 *
 * Example: "When new Gong calls sync, run the Deal Risk Analysis workflow"
 */
export const workflowDataTriggerFunction = inngest.createFunction(
  { id: "workflow-data-trigger", retries: 2 },
  { event: "connector/data.synced" },
  async ({ event, step }) => {
    const { connectorId, orgId, dataType, recordCount, payload } = event.data;

    const matchedWorkflows = await step.run("find-data-change-workflows", async () => {
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
        if (config?.trigger?.type !== "data_change") return false;

        const trigger = config.trigger as DataChangeTrigger;

        // If connectorId is specified, it must match
        if (trigger.connectorId && trigger.connectorId !== connectorId) {
          return false;
        }

        // If dataType is specified, it must match
        if (trigger.dataType && trigger.dataType !== dataType) {
          return false;
        }

        return true;
      });
    });

    if (matchedWorkflows.length === 0) {
      return { triggered: 0, connectorId, dataType };
    }

    const executionIds: number[] = [];

    for (const wf of matchedWorkflows) {
      const executionId = await step.run(`create-execution-${wf.id}`, async () => {
        const [execution] = await db
          .insert(workflowExecutions)
          .values({
            orgId: wf.orgId,
            workflowDefinitionId: wf.id,
            triggeredByUserId: "system:data_change",
            title: `Data sync: ${wf.name}`,
            status: "pending",
            inputs: {
              connectorId,
              dataType: dataType ?? null,
              recordCount,
              syncedAt: event.data.syncedAt,
              ...(payload ?? {}),
            },
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

    return { triggered: executionIds.length, executionIds, connectorId, dataType };
  },
);

/**
 * Handles "metrics/threshold.crossed" events.
 *
 * When a monitored metric crosses a configured threshold, this function finds
 * all published workflow definitions with a matching `threshold` trigger and
 * creates executions for them.
 */
export const workflowThresholdTriggerFunction = inngest.createFunction(
  { id: "workflow-threshold-trigger", retries: 2 },
  { event: "metrics/threshold.crossed" },
  async ({ event, step }) => {
    const { orgId, metric, currentValue, previousValue, crossedAt } = event.data;

    const matchedWorkflows = await step.run("find-threshold-workflows", async () => {
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
        if (config?.trigger?.type !== "threshold") return false;

        const trigger = config.trigger as {
          type: "threshold";
          metric: string;
          condition: "above" | "below";
          value: number;
        };

        // Metric must match
        if (trigger.metric !== metric) return false;

        // Check if the threshold was actually crossed in the expected direction
        if (trigger.condition === "above") {
          return currentValue >= trigger.value && previousValue < trigger.value;
        }
        if (trigger.condition === "below") {
          return currentValue <= trigger.value && previousValue > trigger.value;
        }

        return false;
      });
    });

    if (matchedWorkflows.length === 0) {
      return { triggered: 0, metric };
    }

    const executionIds: number[] = [];

    for (const wf of matchedWorkflows) {
      const executionId = await step.run(`create-execution-${wf.id}`, async () => {
        const [execution] = await db
          .insert(workflowExecutions)
          .values({
            orgId: wf.orgId,
            workflowDefinitionId: wf.id,
            triggeredByUserId: "system:threshold",
            title: `Threshold: ${wf.name}`,
            status: "pending",
            inputs: {
              metric,
              currentValue,
              previousValue,
              crossedAt,
            },
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

    return { triggered: executionIds.length, executionIds, metric };
  },
);
