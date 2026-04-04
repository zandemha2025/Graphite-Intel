import OpenAI from "openai";
import type { WorkflowDefinition, WorkflowPreview, AutomationSuggestion } from "./types";

// ---------------------------------------------------------------------------
// WorkflowBuilder
// AI-powered engine that converts natural language descriptions into
// structured Pipedream workflow definitions ready for deployment.
// ---------------------------------------------------------------------------

export class WorkflowBuilder {
  private readonly openai: OpenAI;

  constructor(openaiClient: OpenAI) {
    this.openai = openaiClient;
  }

  // -------------------------------------------------------------------------
  // Generate a workflow definition from a natural language description.
  // e.g. "When a new HubSpot contact is created, enrich it with Clearbit
  //        and send a Slack notification to #sales"
  // -------------------------------------------------------------------------
  async generateWorkflow(
    naturalLanguage: string,
    connectedApps?: string[],
  ): Promise<WorkflowPreview> {
    const appsContext = connectedApps?.length
      ? `\nThe user has these apps connected: ${connectedApps.join(", ")}.`
      : "";

    const systemPrompt = `You are an expert at designing Pipedream automation workflows.
Given a natural language description, you decompose it into a structured workflow definition.

Output ONLY valid JSON — no markdown, no explanation.${appsContext}

The JSON must follow this exact shape:
{
  "name": "string — short workflow name",
  "description": "string — what this workflow does",
  "readableDescription": "string — 1-2 sentence plain English summary",
  "estimatedApps": ["array", "of", "app", "slugs"],
  "trigger": {
    "type": "http" | "schedule" | "app_event",
    "appSlug": "optional — e.g. hubspot",
    "eventType": "optional — e.g. contact.created",
    "schedule": "optional — cron expression",
    "httpMethod": "optional — GET or POST",
    "description": "what triggers this workflow"
  },
  "steps": [
    {
      "id": "step_1",
      "name": "Human readable step name",
      "type": "action" | "filter" | "code" | "send_http",
      "appSlug": "optional — e.g. clearbit",
      "componentKey": "optional — e.g. clearbit-enrich-person",
      "props": {},
      "description": "what this step does"
    }
  ]
}

Rules:
- Trigger type "app_event" means it fires when something happens in an app (e.g. new HubSpot contact).
- Use real Pipedream component key patterns: {app_slug}-{action-name} e.g. "hubspot-create-contact", "slack-send-message", "clearbit-enrich-person".
- Keep step IDs as step_1, step_2, etc.
- Include 2-6 steps. Don't over-engineer.
- estimatedApps should list every app slug involved.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: naturalLanguage },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
    }

    const definition: WorkflowDefinition = {
      name: String(parsed.name ?? naturalLanguage.slice(0, 60)),
      description: String(parsed.description ?? ""),
      trigger: (parsed.trigger as WorkflowDefinition["trigger"]) ?? { type: "http" },
      steps: (parsed.steps as WorkflowDefinition["steps"]) ?? [],
    };

    return {
      naturalLanguageInput: naturalLanguage,
      definition,
      estimatedApps: Array.isArray(parsed.estimatedApps)
        ? (parsed.estimatedApps as string[])
        : [],
      readableDescription: String(parsed.readableDescription ?? definition.description),
    };
  }

  // -------------------------------------------------------------------------
  // Given a list of connected app slugs, suggest useful automations.
  // Scans the user's connected apps and proactively recommends workflows.
  // -------------------------------------------------------------------------
  async suggestAutomations(
    connectedApps: string[],
    context?: string,
  ): Promise<AutomationSuggestion[]> {
    const contextBlock = context
      ? `\nBusiness context: ${context}`
      : "";

    const systemPrompt = `You are an automation expert helping business users discover high-value workflows.
Given a list of connected apps, suggest 5 automation ideas that would save time or drive value.

Output ONLY a JSON array with exactly 5 items. Each item:
{
  "title": "Short catchy title e.g. 'Lead Enrichment Pipeline'",
  "description": "2-3 sentence description of what this automation does and why it's valuable",
  "triggerSummary": "One sentence — what event starts this workflow",
  "outcomeSummary": "One sentence — what happens as a result",
  "apps": ["app_slug_1", "app_slug_2"],
  "naturalLanguage": "Full natural language description suitable for passing to the workflow generator",
  "complexity": "simple" | "medium" | "complex"
}

Prioritize:
1. Automations that connect 2+ of their apps together (better integrations > standalone)
2. Real business value (lead routing, data sync, notifications, enrichment)
3. Variety of trigger types (app events, schedules, webhooks)

Output ONLY the JSON array.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Connected apps: ${connectedApps.join(", ")}${contextBlock}\n\nSuggest 5 automations.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`AI returned invalid JSON: ${raw.slice(0, 200)}`);
    }

    // Handle both { suggestions: [...] } and bare arrays
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>).suggestions)
        ? ((parsed as Record<string, unknown>).suggestions as unknown[])
        : ((parsed as Record<string, unknown>).automations as unknown[]) ?? [];

    return (arr as AutomationSuggestion[]).slice(0, 5);
  }
}
