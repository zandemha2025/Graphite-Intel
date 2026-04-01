import { Router, type IRouter, type Request, type Response } from "express";
import { db, documents, conversationDocuments, conversations, documentChunks } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

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

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 50);
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

async function processChunksInBackground(docId: number, extractedText: string, log: { error: (obj: object, msg: string) => void }): Promise<void> {
  try {
    const chunks = chunkText(extractedText);
    if (chunks.length === 0) {
      await db.update(documents).set({ status: "ready", chunkCount: 0 }).where(eq(documents.id, docId));
      return;
    }

    const embeddings = await embedChunks(chunks);

    await db.delete(documentChunks).where(eq(documentChunks.documentId, docId));

    const values = chunks.map((text, idx) => ({
      documentId: docId,
      chunkIndex: idx,
      text,
      embedding: embeddings[idx],
    }));

    const CHUNK_INSERT_BATCH = 50;
    for (let i = 0; i < values.length; i += CHUNK_INSERT_BATCH) {
      await db.insert(documentChunks).values(values.slice(i, i + CHUNK_INSERT_BATCH));
    }

    await db
      .update(documents)
      .set({ status: "ready", chunkCount: chunks.length })
      .where(eq(documents.id, docId));
  } catch (err) {
    log.error({ err }, "Failed to embed document chunks");
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, docId)).catch(() => {});
  }
}

function documentsFilter(req: Request) {
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(documents.orgId, orgId);
  }
  return eq(documents.userId, req.user!.id);
}

router.get("/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(documentsFilter(req))
      .orderBy(documents.createdAt);
    res.json(docs.map(({ extractedText: _et, ...d }) => d));
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.post("/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  const { title, fileType, objectKey } = req.body;
  if (!title || !fileType || !objectKey) {
    res.status(400).json({ error: "title, fileType, and objectKey are required" });
    return;
  }
  try {
    const [doc] = await db
      .insert(documents)
      .values({ userId, ...(orgId !== undefined && { orgId }), title, fileType, objectKey, status: "processing" })
      .returning();
    res.status(201).json({ ...doc, extractedText: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.delete("/documents/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), documentsFilter(req)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    await db.delete(conversationDocuments).where(eq(conversationDocuments.documentId, id));
    await db.delete(documentChunks).where(eq(documentChunks.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

router.post("/documents/:id/process", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), documentsFilter(req)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await db.update(documents).set({ status: "processing" }).where(eq(documents.id, id));

    const objectFile = await objectStorageService.getObjectEntityFile(doc.objectKey);
    const downloadResponse = await objectStorageService.downloadObject(objectFile);
    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    try {
      if (doc.fileType === "pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text;
      } else if (doc.fileType === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else {
        extractedText = buffer.toString("utf-8");
      }
    } catch (parseErr) {
      req.log.error({ err: parseErr }, "Failed to parse document content");
      await db.update(documents).set({ status: "failed" }).where(eq(documents.id, id));
      res.status(500).json({ error: "Failed to extract text from document" });
      return;
    }

    const truncated = extractedText.slice(0, 200000);
    const [updated] = await db
      .update(documents)
      .set({ extractedText: truncated, status: "processing" })
      .where(eq(documents.id, id))
      .returning();

    res.json({ ...updated, extractedText: undefined });

    processChunksInBackground(id, truncated, req.log).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to process document");
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, id)).catch(() => {});
    res.status(500).json({ error: "Failed to process document" });
  }
});

router.patch("/documents/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  const { tags } = req.body;
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), documentsFilter(req)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const [updated] = await db
      .update(documents)
      .set({ tags: tags ?? null })
      .where(eq(documents.id, id))
      .returning();
    res.json({ ...updated, extractedText: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.post("/documents/search", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const { query, documentIds } = req.body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const accessibleDocs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(documentsFilter(req));
    const userDocIds = new Set(accessibleDocs.map((d) => d.id));

    let targetDocIds: number[] = Array.from(userDocIds);
    if (documentIds && Array.isArray(documentIds)) {
      targetDocIds = documentIds.filter((id: number) => userDocIds.has(id));
    }

    if (targetDocIds.length === 0) {
      res.json([]);
      return;
    }

    const [embeddingResponse] = await Promise.all([
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      }),
    ]);
    const queryEmbedding = embeddingResponse.data[0].embedding;
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const results = await db.execute(sql`
      SELECT
        dc.id,
        dc.document_id AS "documentId",
        dc.chunk_index AS "chunkIndex",
        dc.text,
        d.title AS "documentTitle",
        1 - (dc.embedding <=> ${embeddingStr}::vector) AS similarity
      FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE dc.document_id = ANY(${targetDocIds}::int[])
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> ${embeddingStr}::vector) > 0.3
      ORDER BY dc.embedding <=> ${embeddingStr}::vector
      LIMIT 12
    `);

    res.json(results.rows);
  } catch (err) {
    req.log.error({ err }, "Failed to search documents");
    res.status(500).json({ error: "Failed to search documents" });
  }
});

router.get("/conversations/:id/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const conversationId = parseInt(req.params.id);
  if (isNaN(conversationId)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  try {
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const links = await db
      .select()
      .from(conversationDocuments)
      .where(eq(conversationDocuments.conversationId, conversationId));
    if (links.length === 0) {
      res.json([]);
      return;
    }
    const docIds = links.map((l) => l.documentId);
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, docIds));
    res.json(docs.map(({ extractedText: _et, ...d }) => d));
  } catch (err) {
    req.log.error({ err }, "Failed to list conversation documents");
    res.status(500).json({ error: "Failed to list conversation documents" });
  }
});

router.post("/conversations/:id/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const conversationId = parseInt(req.params.id);
  const { documentId } = req.body;
  if (isNaN(conversationId) || !documentId) {
    res.status(400).json({ error: "Invalid conversation id or document id" });
    return;
  }
  try {
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), documentsFilter(req)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const existing = await db
      .select()
      .from(conversationDocuments)
      .where(
        and(
          eq(conversationDocuments.conversationId, conversationId),
          eq(conversationDocuments.documentId, documentId),
        ),
      );
    if (existing.length === 0) {
      await db.insert(conversationDocuments).values({ conversationId, documentId });
    }
    res.status(201).json({ ...doc, extractedText: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to link document to conversation");
    res.status(500).json({ error: "Failed to link document" });
  }
});

router.delete("/conversations/:id/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const conversationId = parseInt(req.params.id);
  const { documentId } = req.body;
  if (isNaN(conversationId) || !documentId) {
    res.status(400).json({ error: "Invalid conversation id or document id" });
    return;
  }
  try {
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await db
      .delete(conversationDocuments)
      .where(
        and(
          eq(conversationDocuments.conversationId, conversationId),
          eq(conversationDocuments.documentId, documentId),
        ),
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to unlink document from conversation");
    res.status(500).json({ error: "Failed to unlink document" });
  }
});

export { router as documentsRouter };
export default router;
