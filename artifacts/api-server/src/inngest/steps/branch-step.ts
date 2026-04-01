export interface BranchStepConfig {
  conditions: Array<{
    expression: string; // JS expression evaluated against context
    nextStepIndex: number;
  }>;
  defaultNextStepIndex?: number;
}

export interface BranchStepResult {
  nextStepIndex: number;
  matchedCondition: string | null;
}

/**
 * Evaluates branch conditions against the current step context.
 * Returns the next step index based on the first matching condition.
 */
export async function evaluateBranch(
  config: BranchStepConfig,
  context: Record<string, unknown>,
): Promise<BranchStepResult> {
  for (const condition of config.conditions) {
    try {
      // Safe evaluation: only allow access to context values
      const fn = new Function(
        "context",
        `with(context) { return (${condition.expression}); }`,
      );
      const result = fn(context);

      if (result) {
        return {
          nextStepIndex: condition.nextStepIndex,
          matchedCondition: condition.expression,
        };
      }
    } catch {
      // If expression fails, skip this condition
      continue;
    }
  }

  // No conditions matched — use default or advance to next step
  return {
    nextStepIndex: config.defaultNextStepIndex ?? -1, // -1 signals "advance normally"
    matchedCondition: null,
  };
}
