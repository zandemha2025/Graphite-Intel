import {
  db,
  documentChunks,
  documents,
  vaultProjects,
  projectDocuments,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";

export interface ToolStepConfig {
  tool: string;
  params: Record<string, unknown>;
}

export interface ToolStepResult {
  tool: string;
  output: unknown;
}

/**
 * Tool registry — each tool is a function that can be invoked during workflow execution.
 */
const toolRegistry: Record<
  string,
  (
    params: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => Promise<unknown>
> = {
  /**
   * Semantic search across vault documents.
   */
  vault_search: async (params) => {
    const query = params.query as string;
    const projectId = params.projectId as number | undefined;
    const limit = (params.limit as number) || 10;

    if (!query) throw new Error("vault_search requires a 'query' param");

    // Generate embedding for the query
    const { createEmbedding } = await import("../../lib/ai-client");
    const [embedding] = await createEmbedding(query);
    const embeddingStr = `[${embedding!.join(",")}]`;

    // Build query conditions
    let docIds: number[] | undefined;
    if (projectId) {
      const linked = await db
        .select({ documentId: projectDocuments.documentId })
        .from(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId));
      docIds = linked.map((r) => r.documentId);
      if (docIds.length === 0) return { results: [] };
    }

    const results = await db.execute(sql`
      SELECT
        dc.id as chunk_id,
        dc.document_id,
        dc.text,
        dc.chunk_index,
        1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
      FROM document_chunks dc
      ${docIds ? sql`WHERE dc.document_id = ANY(${docIds})` : sql``}
      ORDER BY dc.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    return { results: results.rows };
  },

  /**
   * Extract text from a document by ID.
   */
  document_extract: async (params) => {
    const documentId = params.documentId as number;
    if (!documentId)
      throw new Error("document_extract requires a 'documentId' param");

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!doc) throw new Error(`Document ${documentId} not found`);

    return {
      title: doc.title,
      text: doc.extractedText,
      fileType: doc.fileType,
    };
  },

  /**
   * List vault projects for the org.
   */
  list_projects: async (params) => {
    const orgId = params.orgId as number;
    if (!orgId) throw new Error("list_projects requires an 'orgId' param");

    const projects = await db
      .select()
      .from(vaultProjects)
      .where(eq(vaultProjects.orgId, orgId));

    return { projects };
  },
};

/**
 * Executes a registered tool step.
 */
export async function executeToolStep(
  config: ToolStepConfig,
  context: Record<string, unknown>,
): Promise<ToolStepResult> {
  const toolFn = toolRegistry[config.tool];
  if (!toolFn) {
    throw new Error(
      `Unknown tool: ${config.tool}. Available: ${Object.keys(toolRegistry).join(", ")}`,
    );
  }

  const output = await toolFn(config.params, context);
  return { tool: config.tool, output };
}
