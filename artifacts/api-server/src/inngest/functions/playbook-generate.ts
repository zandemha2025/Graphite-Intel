/**
 * Inngest function: playbook/generate
 * AI-generates playbook steps from source documents using GPT-4o.
 *
 * Flow:
 * 1. Load source documents and their extracted text
 * 2. Generate structured playbook steps via GPT-4o
 * 3. Save generated steps to the playbook record
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { playbooks, documents } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

interface PlaybookStep {
  index: number;
  title: string;
  description: string;
  type: "checklist" | "review" | "extract" | "compare" | "flag";
  config: {
    extractionFields?: string[];
    comparisonDocTypes?: string[];
    flagConditions?: string[];
    aiPrompt?: string;
  };
  isRequired: boolean;
}

export const playbookGenerateFunction = inngest.createFunction(
  { id: "playbook-generate", retries: 2 },
  { event: "playbook/generate" },
  async ({ event, step }) => {
    const { playbookId, orgId, sourceDocumentIds, prompt } = event.data;

    // Step 1: Load source documents (if any)
    const documentTexts = await step.run("load-documents", async () => {
      if (!sourceDocumentIds || sourceDocumentIds.length === 0) return [];
      const docs = await db
        .select({
          id: documents.id,
          title: documents.title,
          extractedText: documents.extractedText,
          fileType: documents.fileType,
        })
        .from(documents)
        .where(inArray(documents.id, sourceDocumentIds));

      return docs.map((d) => ({
        id: d.id,
        title: d.title,
        text: (d.extractedText ?? "").slice(0, 8000), // Truncate to fit context
        fileType: d.fileType,
      }));
    });

    // Step 2: Generate playbook steps using GPT-4o
    const generatedSteps = await step.run("generate-steps", async () => {
      const hasDocuments = documentTexts.length > 0;
      const documentSummaries = hasDocuments
        ? documentTexts
            .map((d) => `## Document: ${d.title} (${d.fileType})\n\n${d.text}`)
            .join("\n\n---\n\n")
        : "";

      let userContent: string;
      if (prompt && hasDocuments) {
        userContent = `User instruction: ${prompt}\n\nSource documents (${documentTexts.length}):\n\n${documentSummaries}`;
      } else if (prompt) {
        userContent = `Generate a review playbook based on this description:\n\n${prompt}`;
      } else {
        userContent = `Generate a review playbook for these ${documentTexts.length} documents:\n\n${documentSummaries}`;
      }

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a review playbook generator for a business intelligence platform. Given a description or source documents, create a step-by-step review playbook with actionable checklist items.

Each step must be one of these types:
- "checklist": A manual verification item the reviewer checks off
- "review": AI-assisted analysis with a review prompt
- "extract": Automated data extraction from documents with specific fields
- "compare": Cross-document comparison
- "flag": Automated condition-based flagging

Output valid JSON with a "steps" key: an array of PlaybookStep objects with this structure:
{
  "steps": [
    {
      "index": number,
      "title": string (short, actionable),
      "description": string (detailed instruction),
      "type": "checklist" | "review" | "extract" | "compare" | "flag",
      "config": {
        "extractionFields"?: string[] (for extract type),
        "comparisonDocTypes"?: string[] (for compare type),
        "flagConditions"?: string[] (for flag type),
        "aiPrompt"?: string (for review type - the prompt to analyze the content)
      },
      "isRequired": boolean
    }
  ]
}

Generate 5-15 steps that comprehensively cover the review process. Focus on creating relevant, specific steps.`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const steps: PlaybookStep[] = parsed.steps ?? parsed;

      // Normalize indexes
      return steps.map((s, i) => ({ ...s, index: i }));
    });

    // Step 3: Save generated steps
    await step.run("save-steps", async () => {
      await db
        .update(playbooks)
        .set({
          steps: generatedSteps,
          isPublished: false, // Draft until user reviews
        })
        .where(eq(playbooks.id, playbookId));
    });

    return {
      playbookId,
      stepsGenerated: generatedSteps.length,
    };
  },
);
