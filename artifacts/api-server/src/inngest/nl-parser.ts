import OpenAI from "openai";
import type { ParsedWorkflowDefinition } from "./workflow-types";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are a workflow definition builder for GRPHINTEL, a business intelligence platform.
Convert the user's natural language workflow description into a structured JSON definition.

Available trigger types:
- manual: user manually triggers the workflow (no extra fields)
- cron: scheduled execution (field: "cron" — a standard 5-field cron string, e.g. "0 9 * * 1" = Mon 9am)
- webhook: triggered by an incoming HTTP webhook (field: "webhookId" — a short slug string)
- event: triggered by a platform event (field: "eventName" — e.g. "integration/sync.requested")

Available step types and required config fields:
- data_pull: { stepType: "data_pull", source: "vault"|"document"|"integration"|"url", query?, url?, limit? }
- transform:  { stepType: "transform", instruction: string, outputFormat?: "json"|"text"|"markdown" }
- ai_analysis: { stepType: "ai_analysis", analysisPrompt: string, systemPrompt?, outputFormat?: "json"|"text"|"markdown" }
- condition:  { stepType: "condition", expression: string, trueStepIndex: number, falseStepIndex: number }
- action:     { stepType: "action", action: "send_email"|"create_document"|"call_webhook"|"notify", params: {} }

Rules:
- condition step expression is a JS expression using context variables like step_0, step_1, etc.
- trueStepIndex / falseStepIndex are 0-based step array indices; -1 means end the workflow
- For cron triggers infer the cron expression from the natural language schedule
- Choose a relevant single emoji for the icon
- Keep names concise (3-6 words)
- Output valid JSON only — no markdown fences, no commentary

Output schema:
{
  "name": "string",
  "description": "string",
  "icon": "emoji",
  "config": {
    "trigger": { "type": "manual"|"cron"|"webhook"|"event", ...triggerFields },
    "tags": ["string"],
    "nlDescription": "preserve the original user description here verbatim"
  },
  "steps": [
    {
      "type": "data_pull"|"transform"|"ai_analysis"|"condition"|"action",
      "name": "string",
      "description": "string",
      "config": { "stepType": "...", ...stepFields }
    }
  ]
}`;

/**
 * Parses a natural language workflow description into a structured
 * ParsedWorkflowDefinition using GPT-4o.
 */
export async function parseNaturalLanguageWorkflow(
  userDescription: string,
): Promise<ParsedWorkflowDefinition> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userDescription },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("NL parser returned an empty response");
  }

  let parsed: ParsedWorkflowDefinition;
  try {
    parsed = JSON.parse(content) as ParsedWorkflowDefinition;
  } catch (err) {
    throw new Error(`Failed to parse workflow JSON from NL parser: ${(err as Error).message}`);
  }

  if (!parsed.name || typeof parsed.name !== "string") {
    throw new Error("Invalid workflow structure: missing name");
  }
  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Invalid workflow structure: steps must be a non-empty array");
  }

  // Ensure trigger defaults to manual if missing
  if (!parsed.config?.trigger) {
    parsed.config = { ...(parsed.config ?? {}), trigger: { type: "manual" } };
  }

  // Always preserve the original description
  parsed.config.nlDescription = userDescription;

  return parsed;
}
