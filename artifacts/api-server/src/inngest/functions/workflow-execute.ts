import { inngest } from "../client";
import {
  db,
  workflowDefinitions,
  workflowSteps,
  workflowExecutions,
  workflowExecutionSteps,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { executePromptStep } from "../steps/prompt-step";
import { executeToolStep } from "../steps/tool-step";
import { evaluateBranch } from "../steps/branch-step";
import { executeLoop } from "../steps/loop-step";
import { executeDataPullStep, type DataPullStepConfig } from "../steps/data-pull-step";
import { executeActionStep, type ActionStepConfig } from "../steps/action-step";
import type {
  TransformStepConfig,
  AIAnalysisStepConfig,
  ConditionStepConfig,
} from "../workflow-types";

/**
 * Core workflow orchestration function.
 *
 * 1. Loads the workflow definition and its steps
 * 2. Iterates through steps sequentially (or branches/loops as defined)
 * 3. Executes each step based on its type
 * 4. Records step-level traces with timing and token costs
 * 5. Pauses at human_review steps and waits for an event to resume
 */
export const workflowExecuteFunction = inngest.createFunction(
  {
    id: "workflow-execute",
    retries: 0, // We handle retries per-step, not per-function
    concurrency: [{ limit: 10, scope: "account" }],
  },
  { event: "workflow/execute" },
  async ({ event, step }) => {
    const { executionId, orgId } = event.data;

    // 1. Mark execution as running
    await step.run("mark-running", async () => {
      await db
        .update(workflowExecutions)
        .set({
          status: "running",
          startedAt: new Date(),
          inngestRunId: event.id ?? null,
        })
        .where(eq(workflowExecutions.id, executionId));
    });

    // 2. Load definition and steps
    const { definition, steps: definedSteps } = await step.run(
      "load-definition",
      async () => {
        const [exec] = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, executionId));

        if (!exec?.workflowDefinitionId) {
          throw new Error("No workflow definition linked to this execution");
        }

        const [def] = await db
          .select()
          .from(workflowDefinitions)
          .where(eq(workflowDefinitions.id, exec.workflowDefinitionId));

        if (!def) {
          throw new Error(
            `Workflow definition ${exec.workflowDefinitionId} not found`,
          );
        }

        const stps = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.workflowDefinitionId, def.id))
          .orderBy(asc(workflowSteps.stepIndex));

        return { definition: def, steps: stps };
      },
    );

    // 3. Execute steps sequentially
    let stepContext: Record<string, unknown> = {};
    let currentIndex = 0;

    while (currentIndex < definedSteps.length) {
      const currentStep = definedSteps[currentIndex];

      const stepResult = await step.run(
        `step-${currentIndex}-${currentStep.type}`,
        async () => {
          // Create execution step trace
          const [execStep] = await db
            .insert(workflowExecutionSteps)
            .values({
              executionId,
              stepIndex: currentIndex,
              stepType: currentStep.type,
              stepName: currentStep.name,
              status: "running",
              input: { ...(currentStep.config as Record<string, unknown>), context: stepContext },
              startedAt: new Date(),
            })
            .returning();

          try {
            let output: unknown;
            let tokensUsed = 0;

            switch (currentStep.type) {
              case "prompt": {
                const result = await executePromptStep(
                  currentStep.config as any,
                  stepContext,
                );
                output = result;
                tokensUsed = result.tokensUsed;
                break;
              }
              case "tool":
                output = await executeToolStep(
                  currentStep.config as any,
                  stepContext,
                );
                break;
              case "branch":
                output = await evaluateBranch(
                  currentStep.config as any,
                  stepContext,
                );
                break;
              case "loop":
                output = await executeLoop(
                  currentStep.config as any,
                  stepContext,
                );
                break;
              case "human_review":
                output = { needsReview: true, reviewData: stepContext };
                break;

              // ── New conversational workflow step types ──────────────────

              case "data_pull": {
                output = await executeDataPullStep(
                  currentStep.config as DataPullStepConfig,
                  stepContext,
                );
                break;
              }

              case "transform": {
                const tConfig = currentStep.config as TransformStepConfig;
                const inputValue = tConfig.inputKey
                  ? stepContext[tConfig.inputKey]
                  : stepContext;
                const result = await executePromptStep(
                  {
                    systemPrompt: `You are a data transformation assistant. ${tConfig.outputFormat ? `Output format: ${tConfig.outputFormat}.` : ""}`,
                    userPrompt: `${tConfig.instruction}\n\nInput data:\n${typeof inputValue === "string" ? inputValue : JSON.stringify(inputValue, null, 2)}`,
                  },
                  stepContext,
                );
                output = result;
                tokensUsed = result.tokensUsed;
                break;
              }

              case "ai_analysis": {
                const aConfig = currentStep.config as AIAnalysisStepConfig;
                const result = await executePromptStep(
                  {
                    systemPrompt: aConfig.systemPrompt,
                    userPrompt: aConfig.analysisPrompt,
                    model: aConfig.model,
                    temperature: aConfig.temperature,
                    maxTokens: aConfig.maxTokens,
                  },
                  stepContext,
                );
                output = result;
                tokensUsed = result.tokensUsed;
                break;
              }

              case "condition": {
                const cConfig = currentStep.config as ConditionStepConfig;
                // Reuse the branch evaluator with a two-branch condition
                output = await evaluateBranch(
                  {
                    conditions: [
                      {
                        expression: cConfig.expression,
                        nextStepIndex: cConfig.trueStepIndex,
                      },
                    ],
                    defaultNextStepIndex: cConfig.falseStepIndex,
                  },
                  stepContext,
                );
                break;
              }

              case "action": {
                output = await executeActionStep(
                  currentStep.config as ActionStepConfig,
                  stepContext,
                );
                break;
              }

              default:
                throw new Error(`Unknown step type: ${currentStep.type}`);
            }

            await db
              .update(workflowExecutionSteps)
              .set({
                status: "completed",
                output,
                tokensCost: tokensUsed || null,
                completedAt: new Date(),
              })
              .where(eq(workflowExecutionSteps.id, execStep.id));

            return { output, type: currentStep.type };
          } catch (err) {
            await db
              .update(workflowExecutionSteps)
              .set({
                status: "failed",
                errorMessage: (err as Error).message,
                completedAt: new Date(),
              })
              .where(eq(workflowExecutionSteps.id, execStep.id));
            throw err;
          }
        },
      );

      // Handle human review pause
      if (currentStep.type === "human_review") {
        // Create review record and pause execution
        await step.run(`create-review-${currentIndex}`, async () => {
          // Dynamic import to avoid circular dependency
          const { humanReviews } = await import("@workspace/db");
          await (db as any)
            .insert(humanReviews)
            .values({
              orgId,
              executionId,
              stepIndex: currentIndex,
              reviewData: stepContext,
              status: "pending",
            });

          await db
            .update(workflowExecutions)
            .set({
              status: "awaiting_review",
              currentStepIndex: currentIndex,
            })
            .where(eq(workflowExecutions.id, executionId));
        });

        // Wait for human review event (timeout: 7 days)
        const reviewResult = await step.waitForEvent("wait-for-review", {
          event: "workflow/human-review.completed",
          match: "data.executionId",
          timeout: "7d",
        });

        if (!reviewResult || !(reviewResult.data as any).approved) {
          await step.run("mark-rejected", async () => {
            await db
              .update(workflowExecutions)
              .set({
                status: "rejected",
                completedAt: new Date(),
                errorMessage: reviewResult
                  ? "Review rejected"
                  : "Review timed out",
              })
              .where(eq(workflowExecutions.id, executionId));
          });
          return { status: "rejected" };
        }

        // Review approved — merge any modified data
        if ((reviewResult.data as any).modifiedData) {
          stepContext = {
            ...stepContext,
            ...(reviewResult.data as any).modifiedData,
          };
        }

        // Resume execution
        await step.run(`resume-after-review-${currentIndex}`, async () => {
          await db
            .update(workflowExecutions)
            .set({ status: "running" })
            .where(eq(workflowExecutions.id, executionId));
        });
      } else {
        // Merge step output into context for next steps
        stepContext = {
          ...stepContext,
          [`step_${currentIndex}`]: stepResult.output,
        };

        // Handle branch: output determines next step index
        if (
          currentStep.type === "branch" &&
          typeof (stepResult.output as any)?.nextStepIndex === "number" &&
          (stepResult.output as any).nextStepIndex >= 0
        ) {
          currentIndex = (stepResult.output as any).nextStepIndex;
          continue;
        }
      }

      // Update progress
      await step.run(`update-progress-${currentIndex}`, async () => {
        await db
          .update(workflowExecutions)
          .set({ currentStepIndex: currentIndex + 1 })
          .where(eq(workflowExecutions.id, executionId));
      });

      currentIndex++;
    }

    // 4. Mark execution as complete
    await step.run("mark-complete", async () => {
      await db
        .update(workflowExecutions)
        .set({
          status: "completed",
          outputs: stepContext,
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));
    });

    return { status: "completed", outputs: stepContext };
  },
);
