import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface SearchOptions {
  query: string;
  orgId: number;
  projectIds?: number[];
  mode: "semantic" | "fulltext" | "hybrid";
  filters?: {
    dateRange?: { from: Date; to: Date };
    fileTypes?: string[];
    tags?: string[];
  };
  limit: number;
  offset: number;
  semanticThreshold?: number; // Default 0.3
}

export interface SearchResult {
  documentId: number;
  documentTitle: string;
  chunkId: number;
  chunkText: string;
  projectId: number | null;
  projectName: string | null;
  score: number;
  scoreBreakdown: { semantic?: number; fulltext?: number };
  highlights: string[];
  metadata: { fileType: string; createdAt: string; tags: string | null };
}

function buildFilterClauses(options: SearchOptions) {
  const clauses: ReturnType<typeof sql>[] = [];

  if (options.projectIds?.length) {
    clauses.push(sql`AND vp.id = ANY(${options.projectIds})`);
  }

  if (options.filters?.dateRange?.from) {
    clauses.push(
      sql`AND d.created_at >= ${options.filters.dateRange.from.toISOString()}`,
    );
  }
  if (options.filters?.dateRange?.to) {
    clauses.push(
      sql`AND d.created_at <= ${options.filters.dateRange.to.toISOString()}`,
    );
  }
  if (options.filters?.fileTypes?.length) {
    clauses.push(sql`AND d.file_type = ANY(${options.filters.fileTypes})`);
  }

  return clauses.length > 0
    ? sql.join(clauses, sql` `)
    : sql``;
}

function mapRowToSearchResult(row: any): SearchResult {
  return {
    documentId: row.document_id,
    documentTitle: row.document_title,
    chunkId: row.chunk_id,
    chunkText: row.chunk_text,
    projectId: row.project_id ?? null,
    projectName: row.project_name ?? null,
    score: parseFloat(row.ft_score ?? row.sem_score ?? "0"),
    scoreBreakdown: {
      semantic: row.sem_score ? parseFloat(row.sem_score) : undefined,
      fulltext: row.ft_score ? parseFloat(row.ft_score) : undefined,
    },
    highlights: row.highlight ? [row.highlight] : [],
    metadata: {
      fileType: row.file_type,
      createdAt: row.created_at,
      tags: row.tags ?? null,
    },
  };
}

/**
 * Full-text search using PostgreSQL tsquery.
 * Returns BM25-style ranked results via ts_rank_cd.
 */
export async function fulltextSearch(
  options: SearchOptions,
): Promise<SearchResult[]> {
  const tsquery = sql`plainto_tsquery('english', ${options.query})`;
  const filterClauses = buildFilterClauses(options);

  const results = await db.execute(sql`
    SELECT
      dc.id AS chunk_id,
      dc.document_id,
      dc.text AS chunk_text,
      d.title AS document_title,
      d.file_type,
      d.tags,
      d.created_at,
      vp.id AS project_id,
      vp.name AS project_name,
      ts_rank_cd(dc.chunk_search_vector, ${tsquery}) AS ft_score,
      ts_headline('english', dc.text, ${tsquery}, 'MaxWords=50, MinWords=20, StartSel=<mark>, StopSel=</mark>') AS highlight
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    LEFT JOIN project_documents pd ON pd.document_id = d.id
    LEFT JOIN vault_projects vp ON vp.id = pd.project_id
    WHERE d.org_id = ${options.orgId}
      AND dc.chunk_search_vector @@ ${tsquery}
      ${filterClauses}
    ORDER BY ft_score DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `);

  return (results.rows as any[]).map(mapRowToSearchResult);
}

/**
 * Semantic search using pgvector cosine distance.
 */
export async function semanticSearch(
  options: SearchOptions,
  queryEmbedding: number[],
): Promise<SearchResult[]> {
  const threshold = options.semanticThreshold ?? 0.3;
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const filterClauses = buildFilterClauses(options);

  const results = await db.execute(sql`
    SELECT
      dc.id AS chunk_id,
      dc.document_id,
      dc.text AS chunk_text,
      d.title AS document_title,
      d.file_type,
      d.tags,
      d.created_at,
      vp.id AS project_id,
      vp.name AS project_name,
      1 - (dc.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) AS sem_score
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    LEFT JOIN project_documents pd ON pd.document_id = d.id
    LEFT JOIN vault_projects vp ON vp.id = pd.project_id
    WHERE d.org_id = ${options.orgId}
      AND (dc.embedding <=> ${sql.raw(`'${embeddingStr}'::vector`)}) < ${threshold}
      ${filterClauses}
    ORDER BY sem_score DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `);

  return (results.rows as any[]).map(mapRowToSearchResult);
}

/**
 * Hybrid search using Reciprocal Rank Fusion (RRF).
 * Combines semantic and full-text results into a single ranked list.
 *
 * RRF score = 1/(k + rank_semantic) + 1/(k + rank_fulltext)
 * where k = 60 (standard RRF constant)
 */
export async function hybridSearch(
  options: SearchOptions,
  queryEmbedding: number[],
): Promise<SearchResult[]> {
  const k = 60;

  // Run both searches in parallel (fetch more than needed for merging)
  const expandedLimit = Math.min(options.limit * 3, 100);
  const expandedOptions = { ...options, limit: expandedLimit, offset: 0 };

  const [semanticResults, fulltextResults] = await Promise.all([
    semanticSearch(expandedOptions, queryEmbedding),
    fulltextSearch(expandedOptions),
  ]);

  // Build rank maps
  const semanticRanks = new Map<string, number>();
  semanticResults.forEach((r, i) =>
    semanticRanks.set(`${r.documentId}-${r.chunkId}`, i + 1),
  );

  const fulltextRanks = new Map<string, number>();
  fulltextResults.forEach((r, i) =>
    fulltextRanks.set(`${r.documentId}-${r.chunkId}`, i + 1),
  );

  // Merge all unique results
  const allKeys = new Set([...semanticRanks.keys(), ...fulltextRanks.keys()]);
  const allResults = new Map<string, SearchResult>();
  [...semanticResults, ...fulltextResults].forEach((r) => {
    allResults.set(`${r.documentId}-${r.chunkId}`, r);
  });

  // Calculate RRF scores
  const scored = [...allKeys].map((key) => {
    const semRank = semanticRanks.get(key) || expandedLimit + 1;
    const ftRank = fulltextRanks.get(key) || expandedLimit + 1;
    const rrfScore = 1 / (k + semRank) + 1 / (k + ftRank);
    const result = allResults.get(key)!;
    return {
      ...result,
      score: rrfScore,
      scoreBreakdown: {
        semantic: semanticRanks.has(key) ? 1 / (k + semRank) : undefined,
        fulltext: fulltextRanks.has(key) ? 1 / (k + ftRank) : undefined,
      },
    };
  });

  // Sort by RRF score and paginate
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(options.offset, options.offset + options.limit);
}

/**
 * Unified search entry point. Routes to the appropriate search implementation
 * based on the mode parameter.
 */
export async function executeSearch(
  options: SearchOptions,
  queryEmbedding?: number[],
): Promise<SearchResult[]> {
  switch (options.mode) {
    case "fulltext":
      return fulltextSearch(options);

    case "semantic":
      if (!queryEmbedding) {
        throw new Error("Semantic search requires a query embedding");
      }
      return semanticSearch(options, queryEmbedding);

    case "hybrid":
    default:
      if (!queryEmbedding) {
        throw new Error("Hybrid search requires a query embedding");
      }
      return hybridSearch(options, queryEmbedding);
  }
}
