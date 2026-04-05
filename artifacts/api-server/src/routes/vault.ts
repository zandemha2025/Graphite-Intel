import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  vaultProjects,
  projectDocuments,
  extractionTemplates,
  documentExtractions,
  documents,
} from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { inngest } from "../inngest/client";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /vault/projects
 * List all vault projects for the organization.
 */
router.get("/vault/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const projects = await db
      .select()
      .from(vaultProjects)
      .where(eq(vaultProjects.orgId, orgId))
      .orderBy(vaultProjects.createdAt);
    res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Failed to list vault projects");
    res.status(500).json({ error: "Failed to list vault projects" });
  }
});

/**
 * POST /vault/projects
 * Create a new vault project.
 * Body: { name, description?, matterType? }
 */
router.post("/vault/projects", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const { name, description, matterType } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const [project] = await db
      .insert(vaultProjects)
      .values({
        orgId,
        createdByUserId: userId,
        name,
        description: description || null,
        matterType: matterType || null,
        documentCount: 0,
        status: "active",
      })
      .returning();
    res.status(201).json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to create vault project");
    res.status(500).json({ error: "Failed to create vault project" });
  }
});

/**
 * GET /vault/projects/:id
 * Get a vault project with its associated documents.
 */
router.get("/vault/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const projectId = parseInt(req.params.id as string);

  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const links = await db
      .select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId));

    let projectDocs: any[] = [];
    if (links.length > 0) {
      const docIds = links.map((l) => l.documentId);
      projectDocs = await db
        .select()
        .from(documents)
        .where(inArray(documents.id, docIds));
    }

    res.json({
      ...project,
      documents: projectDocs,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get vault project");
    res.status(500).json({ error: "Failed to get vault project" });
  }
});

/**
 * PUT /vault/projects/:id
 * Update a vault project's metadata.
 * Body: { name?, description?, matterType?, status? }
 */
router.put("/vault/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const projectId = parseInt(req.params.id as string);

  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { name, description, matterType, status } = req.body;
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (matterType !== undefined) updates.matterType = matterType;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(vaultProjects)
      .set(updates)
      .where(eq(vaultProjects.id, projectId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update vault project");
    res.status(500).json({ error: "Failed to update vault project" });
  }
});

/**
 * DELETE /vault/projects/:id
 * Delete a vault project (cascades to projectDocuments and documentExtractions).
 */
router.delete("/vault/projects/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const projectId = parseInt(req.params.id as string);

  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await db.delete(vaultProjects).where(eq(vaultProjects.id, projectId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete vault project");
    res.status(500).json({ error: "Failed to delete vault project" });
  }
});

/**
 * POST /vault/projects/:id/documents
 * Add documents to a vault project.
 * Body: { documentIds: number[] }
 */
router.post("/vault/projects/:id/documents", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const projectId = parseInt(req.params.id as string);
  const { documentIds } = req.body;

  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    res.status(400).json({ error: "documentIds array is required and must not be empty" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Verify all documents belong to the org
    const verifiedDocs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(inArray(documents.id, documentIds), eq(documents.orgId, orgId)));

    if (verifiedDocs.length === 0) {
      res.status(400).json({ error: "No valid documents found for this organization" });
      return;
    }

    const verifiedDocIds = verifiedDocs.map((d) => d.id);

    // Insert links, ignoring duplicates
    for (const docId of verifiedDocIds) {
      const existing = await db
        .select()
        .from(projectDocuments)
        .where(
          and(
            eq(projectDocuments.projectId, projectId),
            eq(projectDocuments.documentId, docId)
          )
        );
      if (existing.length === 0) {
        await db
          .insert(projectDocuments)
          .values({ projectId, documentId: docId });
      }
    }

    // Update document count
    const docCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId));

    await db
      .update(vaultProjects)
      .set({ documentCount: docCount[0]?.count || 0 })
      .where(eq(vaultProjects.id, projectId));

    res.status(201).json({ message: "Documents added to project" });
  } catch (err) {
    req.log.error({ err }, "Failed to add documents to project");
    res.status(500).json({ error: "Failed to add documents to project" });
  }
});

/**
 * DELETE /vault/projects/:id/documents/:documentId
 * Remove a document from a vault project.
 */
router.delete(
  "/vault/projects/:id/documents/:documentId",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId!;
    const projectId = parseInt(req.params.id as string);
    const documentId = parseInt(req.params.documentId as string);

    if (isNaN(projectId) || isNaN(documentId)) {
      res.status(400).json({ error: "Invalid project or document id" });
      return;
    }

    try {
      const [project] = await db
        .select()
        .from(vaultProjects)
        .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      await db
        .delete(projectDocuments)
        .where(
          and(
            eq(projectDocuments.projectId, projectId),
            eq(projectDocuments.documentId, documentId)
          )
        );

      // Update document count
      const docCount = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId));

      await db
        .update(vaultProjects)
        .set({ documentCount: docCount[0]?.count || 0 })
        .where(eq(vaultProjects.id, projectId));

      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to remove document from project");
      res.status(500).json({ error: "Failed to remove document from project" });
    }
  }
);

/**
 * GET /extraction-templates
 * List extraction templates (built-in + org-specific).
 */
router.get("/extraction-templates", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const templates = await db
      .select()
      .from(extractionTemplates)
      .where(
        sql`${extractionTemplates.orgId} = ${orgId} OR ${extractionTemplates.isBuiltIn} = true`
      )
      .orderBy(extractionTemplates.createdAt);
    res.json(templates);
  } catch (err) {
    req.log.error({ err }, "Failed to list extraction templates");
    res.status(500).json({ error: "Failed to list extraction templates" });
  }
});

/**
 * POST /extraction-templates
 * Create a custom extraction template.
 * Body: { name, description?, documentType?, schema, systemPrompt? }
 */
router.post("/extraction-templates", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const { name, description, documentType, schema, systemPrompt } = req.body;

  if (!name || !schema) {
    res.status(400).json({ error: "name and schema are required" });
    return;
  }

  try {
    const [template] = await db
      .insert(extractionTemplates)
      .values({
        orgId,
        createdByUserId: userId,
        name,
        description: description || null,
        documentType: documentType || null,
        schema,
        systemPrompt: systemPrompt || null,
        isBuiltIn: false,
      })
      .returning();
    res.status(201).json(template);
  } catch (err) {
    req.log.error({ err }, "Failed to create extraction template");
    res.status(500).json({ error: "Failed to create extraction template" });
  }
});

/**
 * POST /documents/:id/extract
 * Run an extraction template on a document.
 * Body: { templateId }
 * For now: creates extraction record with status "pending" and logs TODO for Inngest.
 */
router.post("/documents/:id/extract", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const docId = parseInt(req.params.id as string);
  const { templateId } = req.body;

  if (isNaN(docId)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }

  if (!templateId) {
    res.status(400).json({ error: "templateId is required" });
    return;
  }

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.orgId, orgId)));

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const [template] = await db
      .select()
      .from(extractionTemplates)
      .where(eq(extractionTemplates.id, templateId));

    if (!template) {
      res.status(404).json({ error: "Extraction template not found" });
      return;
    }

    const [extraction] = await db
      .insert(documentExtractions)
      .values({
        documentId: docId,
        templateId: templateId,
        extractedData: {},
        status: "pending",
      })
      .returning();

    // Trigger Inngest event to process extraction asynchronously
    await inngest.send({
      name: "vault/extraction.requested",
      data: { extractionId: extraction.id },
    });

    req.log.info(
      { extractionId: extraction.id, documentId: docId, templateId },
      "Sent extraction to Inngest queue"
    );

    res.status(201).json(extraction);
  } catch (err) {
    req.log.error({ err }, "Failed to create extraction");
    res.status(500).json({ error: "Failed to create extraction" });
  }
});

/**
 * GET /documents/:id/extractions
 * List all extractions for a document.
 */
router.get("/documents/:id/extractions", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const docId = parseInt(req.params.id as string);

  if (isNaN(docId)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }

  try {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.orgId, orgId)));

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const extractions = await db
      .select()
      .from(documentExtractions)
      .where(eq(documentExtractions.documentId, docId))
      .orderBy(documentExtractions.createdAt);

    res.json(extractions);
  } catch (err) {
    req.log.error({ err }, "Failed to list document extractions");
    res.status(500).json({ error: "Failed to list document extractions" });
  }
});

/**
 * POST /vault/projects/:id/compare
 * Cross-document comparison: run an extraction template on all documents in a project.
 * Body: { templateId }
 * Returns extracted data for all documents in the project.
 */
router.post("/vault/projects/:id/compare", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const projectId = parseInt(req.params.id as string);
  const { templateId } = req.body;

  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  if (!templateId) {
    res.status(400).json({ error: "templateId is required" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(vaultProjects)
      .where(and(eq(vaultProjects.id, projectId), eq(vaultProjects.orgId, orgId)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [template] = await db
      .select()
      .from(extractionTemplates)
      .where(eq(extractionTemplates.id, templateId));

    if (!template) {
      res.status(404).json({ error: "Extraction template not found" });
      return;
    }

    // Get all documents in the project
    const links = await db
      .select({ documentId: projectDocuments.documentId })
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId));

    if (links.length === 0) {
      res.json({ project, documents: [] });
      return;
    }

    const docIds = links.map((l) => l.documentId);

    // Get all documents
    const projectDocs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, docIds));

    // Get or create extractions for all documents
    const results = [];

    for (const doc of projectDocs) {
      // Check if extraction already exists
      const [existing] = await db
        .select()
        .from(documentExtractions)
        .where(
          and(
            eq(documentExtractions.documentId, doc.id),
            eq(documentExtractions.templateId, templateId)
          )
        );

      if (existing) {
        results.push({
          document: doc,
          extraction: existing,
        });
      } else {
        // Create new extraction
        const [extraction] = await db
          .insert(documentExtractions)
          .values({
            documentId: doc.id,
            templateId: templateId,
            extractedData: {},
            status: "pending",
          })
          .returning();

        // Trigger Inngest event to process extraction asynchronously
        await inngest.send({
          name: "vault/extraction.requested",
          data: { extractionId: extraction.id },
        });

        req.log.info(
          { extractionId: extraction.id, documentId: doc.id, templateId },
          "Sent extraction to Inngest queue"
        );

        results.push({
          document: doc,
          extraction,
        });
      }
    }

    res.json({
      project,
      template,
      comparisons: results,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compare documents in project");
    res.status(500).json({ error: "Failed to compare documents" });
  }
});

export { router as vaultRouter };
export default router;
