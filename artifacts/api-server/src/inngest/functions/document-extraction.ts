/**
 * Inngest function: vault/extraction.requested
 * Extracts structured data from a document using an extraction template and GPT-4o.
 *
 * Flow:
 * 1. Load the extraction record + its template
 * 2. Load the document text
 * 3. Call GPT-4o to extract data according to the template schema
 * 4. Update the extraction record with results and status
 */
import { inngest } from "../client";
import {
  db,
  documentExtractions,
  extractionTemplates,
  documents,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

export const documentExtractionFunction = inngest.createFunction(
  { id: "document-extraction", retries: 2 },
  { event: "vault/extraction.requested" },
  async ({ event, step }) => {
    const { extractionId } = event.data;

    // Step 1: Load extraction record and template
    const context = await step.run("load-extraction-context", async () => {
      const [extraction] = await db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.id, extractionId));

      if (!extraction) {
        throw new Error(`Extraction ${extractionId} not found`);
      }

      if (!extraction.templateId) {
        throw new Error(`Extraction ${extractionId} has no template`);
      }

      const [template] = await db
        .select()
        .from(extractionTemplates)
        .where(eq(extractionTemplates.id, extraction.templateId));

      if (!template) {
        throw new Error(`Template ${extraction.templateId} not found`);
      }

      return {
        extraction: {
          id: extraction.id,
          documentId: extraction.documentId,
          templateId: extraction.templateId,
        },
        template: {
          name: template.name,
          schema: template.schema,
          systemPrompt: template.systemPrompt,
          documentType: template.documentType,
        },
      };
    });

    // Step 2: Mark as processing and load document text
    const documentText = await step.run("load-document", async () => {
      await db
        .update(documentExtractions)
        .set({ status: "processing" })
        .where(eq(documentExtractions.id, extractionId));

      const [doc] = await db
        .select({
          id: documents.id,
          title: documents.title,
          extractedText: documents.extractedText,
          fileType: documents.fileType,
        })
        .from(documents)
        .where(eq(documents.id, context.extraction.documentId));

      if (!doc) {
        throw new Error(
          `Document ${context.extraction.documentId} not found`
        );
      }

      const text = (doc.extractedText ?? "").slice(0, 12000);
      if (!text) {
        throw new Error(
          `Document ${doc.id} has no extracted text — ensure the document has been processed first`
        );
      }

      return {
        title: doc.title,
        text,
        fileType: doc.fileType,
      };
    });

    // Step 3: Extract data using GPT-4o
    const extractedData = await step.run("extract-with-ai", async () => {
      const schemaDescription =
        typeof context.template.schema === "string"
          ? context.template.schema
          : JSON.stringify(context.template.schema, null, 2);

      const systemMessage =
        context.template.systemPrompt ??
        `You are a document data extraction assistant. Extract structured data from the provided document text according to the given schema. Return ONLY valid JSON matching the schema — no additional commentary.`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `${systemMessage}

Extraction schema (return JSON matching this structure):
${schemaDescription}

Rules:
- Extract values directly from the document text.
- If a field cannot be found, use null.
- Be precise — do not infer or fabricate values that are not present.
- Return a flat or nested JSON object matching the schema fields.`,
          },
          {
            role: "user",
            content: `Extract data from this ${context.template.documentType ?? "document"} titled "${documentText.title}" (${documentText.fileType}):\n\n${documentText.text}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(content);
    });

    // Step 4: Save extracted data
    await step.run("save-results", async () => {
      await db
        .update(documentExtractions)
        .set({
          extractedData,
          status: "completed",
          confidence: "0.85",
          executedAt: new Date(),
        })
        .where(eq(documentExtractions.id, extractionId));
    });

    return {
      extractionId,
      status: "completed",
      fieldCount: Object.keys(extractedData).length,
    };
  },
);
