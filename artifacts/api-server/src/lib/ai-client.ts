/**
 * Unified AI client for GRPHINTEL.
 *
 * All AI calls in this server must go through this module. It configures the
 * OpenAI SDK to use OpenRouter as the backend (via AI_INTEGRATIONS_OPENAI_BASE_URL
 * and AI_INTEGRATIONS_OPENAI_API_KEY), and provides a model registry so every
 * task type maps to the right model in one place.
 */

import OpenAI from "openai";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

/**
 * Maps high-level task types to specific OpenRouter model identifiers.
 * Change a model here and it automatically applies everywhere that task is used.
 */
export const MODEL_MAP = {
  /** Complex reasoning, multi-step analysis, strategic reports */
  reasoning: "anthropic/claude-sonnet-4",
  /** Structured JSON extraction from text */
  structured_data: "openai/gpt-4o",
  /** Fast, cheap completions for simple / high-volume tasks */
  fast: "meta-llama/llama-3.1-8b-instruct",
  /** Code generation and analysis */
  code: "anthropic/claude-sonnet-4",
  /** Web-grounded research (Perplexity) — for future use */
  research: "perplexity/sonar-pro",
} as const;

export type ModelTask = keyof typeof MODEL_MAP;

/** Returns the OpenRouter model string for the given task type. */
export function getModel(task: ModelTask): string {
  return MODEL_MAP[task];
}

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

/**
 * Returns the shared OpenAI SDK client pre-configured to call OpenRouter.
 * Uses the same singleton from @workspace/integrations-openai-ai-server so
 * there is exactly one client instance across the whole server.
 */
export function getClient(): OpenAI {
  return getOpenAIClient();
}

// ---------------------------------------------------------------------------
// Helper: chat completion
// ---------------------------------------------------------------------------

/** Non-streaming chat completion routed to the model for the given task. */
export async function chat(
  task: ModelTask,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<
    Omit<
      OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      "model" | "messages" | "stream"
    >
  >,
): Promise<OpenAI.Chat.ChatCompletion> {
  return getClient().chat.completions.create({
    model: getModel(task),
    messages,
    ...options,
    stream: false,
  });
}

// ---------------------------------------------------------------------------
// Helper: structured output (JSON mode)
// ---------------------------------------------------------------------------

/**
 * Non-streaming chat completion that enforces JSON output and parses the
 * result before returning. Uses `json_object` response_format.
 */
export async function structuredOutput<T>(
  task: ModelTask,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<
    Omit<
      OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      "model" | "messages" | "stream" | "response_format"
    >
  >,
): Promise<T> {
  const response = await getClient().chat.completions.create({
    model: getModel(task),
    messages,
    response_format: { type: "json_object" },
    ...options,
    stream: false,
  });
  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}

// ---------------------------------------------------------------------------
// Helper: streaming chat completion
// ---------------------------------------------------------------------------

/** Streaming chat completion routed to the model for the given task. */
export async function streamChat(
  task: ModelTask,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: Partial<
    Omit<
      OpenAI.Chat.ChatCompletionCreateParamsStreaming,
      "model" | "messages" | "stream"
    >
  >,
): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  return getClient().chat.completions.create({
    model: getModel(task),
    messages,
    ...options,
    stream: true,
  });
}

// ---------------------------------------------------------------------------
// Helper: embeddings
// ---------------------------------------------------------------------------

/**
 * Generates embeddings using the standard OpenAI embedding model.
 * Always uses `text-embedding-3-small` regardless of task type because
 * embeddings must stay consistent for vector search to work.
 *
 * Returns one embedding vector per input string.
 */
export async function createEmbedding(input: string | string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data.map((d) => d.embedding);
}
