/**
 * Generic Data Sync Service
 *
 * Pulls data from ANY Pipedream-connected app, normalizes it into documents,
 * stores in the vault, and triggers embedding/chunking for RAG.
 *
 * Design: App profiles map slugs to categories and default actions.
 * Unknown apps fall back to a generic profile. The PipedreamConnectClient
 * handles all app-specific API calls -- this service only orchestrates
 * what to pull, normalizes responses, and stores results.
 */

import { db, documents, documentChunks, pipedreamConnectors } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  PipedreamConnectClient,
  PipedreamApiError,
  DATA_SOURCE_REGISTRY,
  type DataSourceMeta,
} from "@workspace/pipedream-connect";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import {
  getAppProfile,
  type AppCategory,
  type AppProfile,
  type AppProfileAction,
} from "./connector-app-profiles";

// Re-export for consumers that import from this module
export { getAppProfile } from "./connector-app-profiles";
export type { AppCategory, AppProfile, AppProfileAction } from "./connector-app-profiles";

// ---------------------------------------------------------------------------
// Sync result types
// ---------------------------------------------------------------------------

export interface SyncedRecord {
  externalId: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SyncResult {
  connectorId: number;
  appSlug: string;
  category: AppCategory;
  actionsAttempted: number;
  recordsSynced: number;
  errors: SyncError[];
}

export interface SyncError {
  actionKey: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

export async function syncConnectorData(connectorId: number): Promise<SyncResult> {
  const [connector] = await db
    .select()
    .from(pipedreamConnectors)
    .where(eq(pipedreamConnectors.id, connectorId));

  if (!connector) throw new Error(`Connector ${connectorId} not found`);
  if (!connector.isActive) throw new Error(`Connector ${connectorId} is not active`);

  const profile = getAppProfile(connector.appSlug);
  const registryActions = getRegistryActionsForSlug(connector.appSlug);
  const actions = profile.defaultActions.length > 0
    ? profile.defaultActions
    : registryActions;

  if (actions.length === 0) {
    return {
      connectorId,
      appSlug: connector.appSlug,
      category: profile.category,
      actionsAttempted: 0,
      recordsSynced: 0,
      errors: [],
    };
  }

  const client = new PipedreamConnectClient();
  const errors: SyncError[] = [];
  let totalRecords = 0;

  for (const action of actions) {
    try {
      const result = await client.pullData(connector.pipedreamAccountId, {
        action: action.componentKey,
        props: action.defaultProps,
      });

      const records = normalizeActionResult(
        connectorId, connector.appSlug, profile, action, result.data,
      );

      for (const record of records) {
        await upsertSyncedDocument(connector.orgId, connectorId, record);
        totalRecords++;
      }
    } catch (err) {
      const message = err instanceof PipedreamApiError
        ? `Pipedream API ${err.status}: ${err.body.slice(0, 200)}`
        : err instanceof Error ? err.message : String(err);
      errors.push({ actionKey: action.key, message });
    }
  }

  await db
    .update(pipedreamConnectors)
    .set({ lastUsedAt: new Date() })
    .where(eq(pipedreamConnectors.id, connectorId));

  return {
    connectorId,
    appSlug: connector.appSlug,
    category: profile.category,
    actionsAttempted: actions.length,
    recordsSynced: totalRecords,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Normalize raw action result into SyncedRecord[]
// ---------------------------------------------------------------------------

function normalizeActionResult(
  connectorId: number,
  appSlug: string,
  profile: AppProfile,
  action: AppProfileAction,
  rawData: unknown,
): SyncedRecord[] {
  const items = extractItems(rawData);

  return items.map((item, i) => ({
    externalId: `connector:${connectorId}:${action.key}:${deriveItemId(item, i)}`,
    title: deriveTitle(item, action, appSlug, i),
    content: renderAsMarkdown(item, action, profile),
    metadata: {
      connectorId,
      appSlug,
      category: profile.category,
      actionKey: action.key,
      syncedAt: new Date().toISOString(),
      rawId: deriveRawId(item),
    },
  }));
}

/** Unwrap common API response shapes into an array of items */
function extractItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["data", "results", "records", "items", "entries", "rows", "list", "objects", "values"]) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    return [data];
  }
  if (typeof data === "string" && data.length > 0) return [{ text: data }];
  return [];
}

function deriveItemId(item: unknown, index: number): string {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const key of ["id", "Id", "ID", "externalId", "external_id", "uuid", "key"]) {
      if (obj[key] != null) return String(obj[key]);
    }
  }
  return String(index);
}

function deriveRawId(item: unknown): string | undefined {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const key of ["id", "Id", "ID"]) {
      if (obj[key] != null) return String(obj[key]);
    }
  }
  return undefined;
}

function deriveTitle(item: unknown, action: AppProfileAction, appSlug: string, index: number): string {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const key of ["name", "Name", "title", "Title", "subject", "Subject", "summary", "label"]) {
      if (typeof obj[key] === "string" && (obj[key] as string).length > 0) {
        return `${action.label}: ${obj[key]}`;
      }
    }
  }
  return `${appSlug} -- ${action.label} #${index + 1}`;
}

function renderAsMarkdown(item: unknown, action: AppProfileAction, profile: AppProfile): string {
  const lines: string[] = [];
  lines.push(`# ${action.label}`);
  lines.push(`**Source:** ${profile.label} (${profile.category})`);
  lines.push("");

  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (value == null) continue;
      if (typeof value === "object") {
        lines.push(`## ${formatKey(key)}`);
        lines.push("```json");
        lines.push(JSON.stringify(value, null, 2).slice(0, 5000));
        lines.push("```");
      } else {
        lines.push(`**${formatKey(key)}:** ${String(value).slice(0, 2000)}`);
      }
    }
  } else if (typeof item === "string") {
    lines.push(item.slice(0, 10000));
  } else {
    lines.push("```json");
    lines.push(JSON.stringify(item, null, 2).slice(0, 5000));
    lines.push("```");
  }

  return lines.join("\n");
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Upsert synced document -- idempotent insert/update
// ---------------------------------------------------------------------------

async function upsertSyncedDocument(
  orgId: number,
  connectorId: number,
  record: SyncedRecord,
): Promise<void> {
  const objectKey = `connector-sync://${record.externalId}`;

  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.objectKey, objectKey), eq(documents.orgId, orgId)));

  if (existing) {
    await db
      .update(documents)
      .set({
        title: record.title,
        extractedText: record.content.slice(0, 200000),
        status: "processing",
        tags: JSON.stringify(record.metadata),
      })
      .where(eq(documents.id, existing.id));

    await chunkAndEmbed(existing.id, record.content);
  } else {
    const [doc] = await db
      .insert(documents)
      .values({
        userId: "system",
        orgId,
        title: record.title,
        fileType: "connector",
        objectKey,
        extractedText: record.content.slice(0, 200000),
        status: "processing",
        tags: JSON.stringify(record.metadata),
      })
      .returning();

    await chunkAndEmbed(doc.id, record.content);
  }
}

// ---------------------------------------------------------------------------
// Chunk text and generate embeddings (mirrors documents.ts logic)
// ---------------------------------------------------------------------------

function chunkText(text: string, targetTokens = 750, overlapTokens = 150): string[] {
  const approxCharsPerToken = 4;
  const targetChars = targetTokens * approxCharsPerToken;
  const overlapChars = overlapTokens * approxCharsPerToken;

  const sentences = text.replace(/\r\n/g, "\n").split(/(?<=[.!?\n])\s+/);
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

async function chunkAndEmbed(docId: number, text: string): Promise<void> {
  try {
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await db.update(documents).set({ status: "ready", chunkCount: 0 }).where(eq(documents.id, docId));
      return;
    }

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

    await db.delete(documentChunks).where(eq(documentChunks.documentId, docId));

    const values = chunks.map((chunkText, idx) => ({
      documentId: docId,
      chunkIndex: idx,
      text: chunkText,
      embedding: allEmbeddings[idx],
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
    await db.update(documents).set({ status: "failed" }).where(eq(documents.id, docId)).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Registry fallback: build actions from DATA_SOURCE_REGISTRY
// ---------------------------------------------------------------------------

function getRegistryActionsForSlug(appSlug: string): AppProfileAction[] {
  for (const [, meta] of Object.entries(DATA_SOURCE_REGISTRY)) {
    if ((meta as DataSourceMeta).appSlug === appSlug) {
      return Object.entries((meta as DataSourceMeta).actions).map(([key, action]) => ({
        key,
        componentKey: action.componentKey,
        label: action.label,
      }));
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// List synced data for a connector
// ---------------------------------------------------------------------------

export async function listSyncedData(
  connectorId: number,
  orgId: number,
  limit = 100,
  offset = 0,
): Promise<{ documents: Array<{ id: number; title: string; status: string | null; createdAt: Date | null; tags: string | null }>; total: number }> {
  const objectKeyPrefix = `connector-sync://connector:${connectorId}:`;

  const allDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      status: documents.status,
      createdAt: documents.createdAt,
      tags: documents.tags,
    })
    .from(documents)
    .where(and(eq(documents.orgId, orgId), sql`${documents.objectKey} LIKE ${objectKeyPrefix + "%"}`))
    .orderBy(documents.createdAt)
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(and(eq(documents.orgId, orgId), sql`${documents.objectKey} LIKE ${objectKeyPrefix + "%"}`));

  return { documents: allDocs, total: Number(count) };
}
