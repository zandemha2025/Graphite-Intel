import { Router, type IRouter, type Request, type Response } from "express";
import { db, documents, conversationDocuments, conversations } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  try {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
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
  const { title, fileType, objectKey } = req.body;
  if (!title || !fileType || !objectKey) {
    res.status(400).json({ error: "title, fileType, and objectKey are required" });
    return;
  }
  try {
    const [doc] = await db
      .insert(documents)
      .values({ userId, title, fileType, objectKey, status: "processing" })
      .returning();
    res.status(201).json({ ...doc, extractedText: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.delete("/documents/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    await db.delete(conversationDocuments).where(eq(conversationDocuments.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

router.post("/documents/:id/process", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
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

    const truncated = extractedText.slice(0, 100000);
    const [updated] = await db
      .update(documents)
      .set({ extractedText: truncated, status: "ready" })
      .where(eq(documents.id, id))
      .returning();

    res.json({ ...updated, extractedText: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to process document");
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, id)).catch(() => {});
    res.status(500).json({ error: "Failed to process document" });
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
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
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
