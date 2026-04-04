import OpenAI from "openai";
import { getClient } from "../../lib/ai-client";

export interface PromptStepConfig {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PromptStepResult {
  text: string;
  tokensUsed: number;
  model: string;
}

/**
 * Executes a prompt step by calling OpenAI GPT-4o with the step's
 * system/user prompts and merged context from previous steps.
 */
export async function executePromptStep(
  config: PromptStepConfig,
  context: Record<string, unknown>,
): Promise<PromptStepResult> {
  // Interpolate context variables into the user prompt
  let userPrompt = config.userPrompt;
  for (const [key, value] of Object.entries(context)) {
    userPrompt = userPrompt.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }

  messages.push({ role: "user", content: userPrompt });

  const response = await getClient().chat.completions.create({
    model: config.model || "openai/gpt-4o",
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 4096,
  });

  const choice = response.choices[0];
  const tokensUsed =
    (response.usage?.prompt_tokens ?? 0) +
    (response.usage?.completion_tokens ?? 0);

  return {
    text: choice?.message?.content ?? "",
    tokensUsed,
    model: response.model,
  };
}
