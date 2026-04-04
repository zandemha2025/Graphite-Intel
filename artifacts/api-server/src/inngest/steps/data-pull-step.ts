import { db, documents } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createEmbedding } from "../../lib/ai-client";

export interface DataPullStepConfig {
  stepType: "data_pull";
  source: "vault" | "document" | "integration" | "url";
  query?: string;
  integrationId?: number;
  documentId?: number;
  url?: string;
  limit?: number;
}

export interface DataPullStepResult {
  source: string;
  data: unknown;
  recordCount: number;
}

/**
 * Pulls data from the specified source into the workflow context.
 *
 * - vault: semantic search across document chunks using embeddings
 * - document: extracts full text from a document by ID
 * - url: fetches content from an HTTP endpoint
 * - integration: returns a reference (integration data is queried via vault after sync)
 */
export async function executeDataPullStep(
  config: DataPullStepConfig,
  context: Record<string, unknown>,
): Promise<DataPullStepResult> {
  switch (config.source) {
    case "vault": {
      const query = config.query ?? (context.query as string | undefined);
      if (!query) throw new Error("data_pull vault source requires a 'query' field");

      const [embedding] = await createEmbedding(query);
      const embeddingStr = `[${embedding!.join(",")}]`;
      const limit = config.limit ?? 10;

      const results = await db.execute(sql`
        SELECT
          dc.id       AS chunk_id,
          dc.document_id,
          dc.text,
          dc.chunk_index,
          1 - (dc.embedding <=> ${embeddingStr}::vector) AS similarity
        FROM document_chunks dc
        ORDER BY dc.embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `);

      return {
        source: "vault",
        data: results.rows,
        recordCount: results.rows.length,
      };
    }

    case "document": {
      const documentId =
        config.documentId ?? (context.documentId as number | undefined);
      if (!documentId) throw new Error("data_pull document source requires a 'documentId' field");

      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      if (!doc) throw new Error(`Document ${documentId} not found`);

      return {
        source: "document",
        data: {
          title: doc.title,
          text: doc.extractedText,
          fileType: doc.fileType,
        },
        recordCount: 1,
      };
    }

    case "url": {
      const url = config.url ?? (context.url as string | undefined);
      if (!url) throw new Error("data_pull url source requires a 'url' field");

      const response = await fetch(url, {
        headers: { "User-Agent": "GRPHINTEL-Workflow/1.0" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      return { source: "url", data, recordCount: 1 };
    }

    case "integration": {
      // Integration data is synced into the vault; downstream steps should
      // use a vault data_pull with an appropriate query.
      const integrationId =
        config.integrationId ?? (context.integrationId as number | undefined);
      return {
        source: "integration",
        data: {
          integrationId,
          message:
            "Integration data is available via vault. Use a subsequent data_pull step with source=vault to query it.",
        },
        recordCount: 0,
      };
    }

    default: {
      const exhaustiveCheck: never = config.source;
      throw new Error(`Unknown data_pull source: ${exhaustiveCheck}`);
    }
  }
}
