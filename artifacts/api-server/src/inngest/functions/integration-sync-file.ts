/**
 * Inngest function: integration/sync.file
 * Downloads a single file from the provider, creates/updates a document record,
 * extracts text, chunks it, generates embeddings, and marks it as synced.
 */
import { inngest } from "../client";
import { db } from "@workspace/db";
import { integrations, syncedFiles, documents, documentChunks } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ensureFreshToken } from "../../lib/oauth-tokens";
import { downloadFile } from "../../lib/providers/google-drive";
import { objectStorageClient } from "../../lib/objectStorage";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

// ---------------------------------------------------------------------------
// Text extraction helpers (mirrors documents route logic)
// ---------------------------------------------------------------------------

function chunkText(text: string, targetTokens = 750, overlapTokens = 150): string[] {
  const approxCharsPerToken = 4;
  const targetChars = targetTokens * approxCharsPerToken;
  const overlapChars = overlapTokens * approxCharsPerToken;

  const sentences = text.replace(/\r\n/g, "\n").split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(" ");
      const overlapWordCount = Math.ceil(overlapChars / (current.length / words.length || 1));
      current = words.slice(-overlapWordCount).join(" ") + " " + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 50);
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await getOpenAIClient().embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // @ts-ignore pdf-parse v2 ESM types lack .default declaration
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return buffer.toString("utf-8");
  }

  // For spreadsheets exported from Google Sheets, we get xlsx — attempt text extraction
  if (mimeType.includes("spreadsheet")) {
    return `[Spreadsheet file — raw extraction not supported. File stored for reference.]`;
  }

  return `[Binary file — text extraction not supported for ${mimeType}]`;
}

function mimeToFileType(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/json": "json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  };
  return map[mimeType] ?? mimeType.split("/").pop()?.slice(0, 10) ?? "bin";
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export const integrationSyncFileFunction = inngest.createFunction(
  {
    id: "integration-sync-file",
    retries: 3,
    concurrency: [{ limit: 5 }], // max 5 file syncs concurrently
  },
  { event: "integration/sync.file" },
  async ({ event, step }) => {
    const { integrationId, externalFileId, action } = event.data;

    if (action === "delete") {
      // Mark synced file as removed
      await step.run("handle-delete", async () => {
        await db
          .update(syncedFiles)
          .set({ syncStatus: "removed" })
          .where(
            and(
              eq(syncedFiles.integrationId, integrationId),
              eq(syncedFiles.externalId, externalFileId),
            ),
          );
      });
      return { action: "deleted", externalFileId };
    }

    // Upsert flow

    // Step 1: Load integration + synced file record
    const { integration, syncedFile } = await step.run("load-records", async () => {
      const [integ] = await db.select().from(integrations).where(eq(integrations.id, integrationId));
      if (!integ) throw new Error(`Integration ${integrationId} not found`);

      const [sf] = await db
        .select()
        .from(syncedFiles)
        .where(
          and(
            eq(syncedFiles.integrationId, integrationId),
            eq(syncedFiles.externalId, externalFileId),
          ),
        );

      return { integration: integ, syncedFile: sf ?? null };
    });

    // Step 2: Download file from provider
    const { buffer, exportedMimeType, fileName } = await step.run("download-file", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = await ensureFreshToken(integration as any);
      const mimeType = syncedFile?.mimeType ?? "application/octet-stream";
      const result = await downloadFile(accessToken, externalFileId, mimeType);
      return {
        buffer: result.buffer,
        exportedMimeType: result.exportedMimeType,
        fileName: syncedFile?.externalName ?? `file-${externalFileId}`,
      };
    });

    // Step 3: Upload to GCS and create/update document record
    const documentId = await step.run("store-document", async () => {
      const fileType = mimeToFileType(exportedMimeType);
      const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "";
      const objectKey = `${privateDir}/integrations/${integrationId}/${externalFileId}.${fileType}`;

      // Upload to GCS
      const { bucketName, objectName } = (() => {
        const p = objectKey.startsWith("/") ? objectKey : `/${objectKey}`;
        const parts = p.split("/");
        return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
      })();
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      // Inngest JSON-serializes Buffer as { type: "Buffer", data: number[] } — reconstruct it
      const actualBuffer = Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from((buffer as unknown as { data: number[] }).data);
      await file.save(actualBuffer, { contentType: exportedMimeType });

      // Extract text
      const text = await extractText(actualBuffer, exportedMimeType);

      // Check if document already exists for this synced file
      if (syncedFile?.documentId) {
        // Update existing document
        await db
          .update(documents)
          .set({
            title: fileName,
            extractedText: text,
            objectKey,
            fileType,
            status: "processing",
          })
          .where(eq(documents.id, syncedFile.documentId));

        // Delete old chunks (will re-create)
        await db
          .delete(documentChunks)
          .where(eq(documentChunks.documentId, syncedFile.documentId));

        return syncedFile.documentId;
      }

      // Create new document
      const orgId = integration.orgId;
      const [doc] = await db
        .insert(documents)
        .values({
          userId: integration.connectedByUserId,
          orgId,
          title: fileName,
          fileType,
          objectKey,
          extractedText: text,
          status: "processing",
        })
        .returning();

      return doc.id;
    });

    // Step 4: Chunk and embed
    await step.run("chunk-and-embed", async () => {
      const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
      if (!doc?.extractedText) return;

      const chunks = chunkText(doc.extractedText);
      if (chunks.length === 0) {
        await db
          .update(documents)
          .set({ status: "completed", chunkCount: 0 })
          .where(eq(documents.id, documentId));
        return;
      }

      const embeddings = await embedChunks(chunks);

      // Insert chunks with embeddings
      await db.insert(documentChunks).values(
        chunks.map((text, i) => ({
          documentId,
          chunkIndex: i,
          text,
          embedding: embeddings[i],
        })),
      );

      await db
        .update(documents)
        .set({ status: "completed", chunkCount: chunks.length })
        .where(eq(documents.id, documentId));
    });

    // Step 5: Update synced file record
    await step.run("mark-synced", async () => {
      await db
        .update(syncedFiles)
        .set({
          documentId,
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        })
        .where(
          and(
            eq(syncedFiles.integrationId, integrationId),
            eq(syncedFiles.externalId, externalFileId),
          ),
        );

      // Increment total files synced counter
      await db.execute(
        `UPDATE integrations SET total_files_synced = COALESCE(total_files_synced, 0) + 1 WHERE id = ${integrationId}`,
      );
    });

    return { action: "synced", documentId, externalFileId };
  },
);
