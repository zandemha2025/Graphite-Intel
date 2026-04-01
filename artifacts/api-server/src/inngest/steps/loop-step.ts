import { executePromptStep, type PromptStepConfig } from "./prompt-step";
import { executeToolStep, type ToolStepConfig } from "./tool-step";

export interface LoopStepConfig {
  iterateOver: string; // Key in context that holds the array
  maxIterations?: number;
  breakCondition?: string; // JS expression; if truthy, stop loop
  stepType: "prompt" | "tool";
  stepConfig: PromptStepConfig | ToolStepConfig;
}

export interface LoopStepResult {
  iterations: number;
  results: unknown[];
  stoppedEarly: boolean;
}

/**
 * Executes a sub-step repeatedly for each item in a context array.
 */
export async function executeLoop(
  config: LoopStepConfig,
  context: Record<string, unknown>,
): Promise<LoopStepResult> {
  const items = context[config.iterateOver];
  if (!Array.isArray(items)) {
    throw new Error(
      `Loop iterateOver key "${config.iterateOver}" is not an array in context`,
    );
  }

  const maxIterations = config.maxIterations ?? 100;
  const results: unknown[] = [];
  let stoppedEarly = false;

  for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
    const iterContext = {
      ...context,
      current_item: items[i],
      current_index: i,
      loop_results: results,
    };

    // Check break condition
    if (config.breakCondition) {
      try {
        const fn = new Function(
          "context",
          `with(context) { return (${config.breakCondition}); }`,
        );
        if (fn(iterContext)) {
          stoppedEarly = true;
          break;
        }
      } catch {
        // If expression fails, continue
      }
    }

    let result: unknown;
    if (config.stepType === "prompt") {
      result = await executePromptStep(
        config.stepConfig as PromptStepConfig,
        iterContext,
      );
    } else if (config.stepType === "tool") {
      result = await executeToolStep(
        config.stepConfig as ToolStepConfig,
        iterContext,
      );
    }

    results.push(result);
  }

  return {
    iterations: results.length,
    results,
    stoppedEarly,
  };
}
