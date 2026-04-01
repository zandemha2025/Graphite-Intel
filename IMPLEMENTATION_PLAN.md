# GRPHINTEL — Master Implementation Plan

> **Generated:** 2026-03-31
> **Scope:** 7 major features for the GRPHINTEL full-stack AI business intelligence platform
> **Estimated total timeline:** 5–6 months

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Dependency Graph](#2-dependency-graph)
3. [Recommended Implementation Order](#3-recommended-implementation-order)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Feature 1 — Workflow Execution Engine (Inngest)](#5-feature-1--workflow-execution-engine-inngest)
6. [Feature 2 — Multi-Source Vault Querying](#6-feature-2--multi-source-vault-querying)
7. [Feature 3 — Real Integrations](#7-feature-3--real-integrations)
8. [Feature 4 — Shared Spaces / Collaboration](#8-feature-4--shared-spaces--collaboration)
9. [Feature 5 — Playbook Generation](#9-feature-5--playbook-generation)
10. [Feature 6 — Full-Text Search (Hybrid)](#10-feature-6--full-text-search-hybrid)
11. [Feature 7 — Paid Ads Module](#11-feature-7--paid-ads-module)
12. [Risk Assessment](#12-risk-assessment)
13. [Migration & Rollback Strategy](#13-migration--rollback-strategy)

---

## 1. Architecture Overview

### Current Stack

| Layer | Technology | Key Details |
|---|---|---|
| Monorepo | pnpm workspaces | `artifacts/` (apps), `lib/` (shared packages) |
| Backend | Express 5 + TypeScript | `artifacts/api-server/src/routes/` |
| Frontend | React 19 + Vite 7 + Tailwind 4 | `artifacts/stratix/src/` |
| Database | PostgreSQL 16 + Drizzle ORM 0.45 | `lib/db/src/schema/` |
| AI | OpenAI GPT-4o | `lib/integrations-openai-ai-server/` |
| Vector Search | pgvector (1536 dims, cosine) | `documentChunks.embedding` column |
| Object Storage | Google Cloud Storage | `@google-cloud/storage` |
| Auth | OIDC (Replit Auth) | Session table + middleware |
| RBAC | owner/admin/editor/viewer | `lib/db/src/schema/permissions.ts` |
| Routing (FE) | Wouter | `artifacts/stratix/src/pages/` |
| State (FE) | React Query | API hooks via `lib/api-client-react/` |

### Existing Patterns (MUST follow)

**Database schema conventions:**
- All tables use `serial("id").primaryKey()`
- Org-scoped tables have `orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" })`
- Timestamps: `createdAt` with `defaultNow()`, `updatedAt` with `$onUpdate(() => new Date())`
- Status fields use `varchar("status", { length: 20 })`
- JSONB for flexible config: `jsonb("config")`
- Insert schemas via `createInsertSchema(table).omit({ id, createdAt, updatedAt })`
- Types exported: `type Foo = typeof fooTable.$inferSelect`
- Index naming: `index("idx_<table>_<column>").on(table.<column>)`

**Route conventions:**
- Each route file creates `const router: IRouter = Router()` and exports it
- Auth check via inline `requireAuth(req, res)` helper returning boolean
- Org context from `req.user!.orgId!`
- Pagination: `limit` (max 100, default 20) + `offset`
- Error pattern: `try/catch` → `req.log.error({ err }, "message")` → `res.status(500).json({ error: "..." })`
- IDs parsed with `parseInt(req.params.id)` with `isNaN` guard

**Frontend conventions:**
- Pages in `artifacts/stratix/src/pages/` as `<name>.tsx`
- Components in `artifacts/stratix/src/components/`
- UI primitives via Radix UI + Tailwind + shadcn/ui patterns
- React Query for server state, Wouter for routing
- Toast notifications via Sonner

---

## 2. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHARED INFRASTRUCTURE                       │
│  (Inngest client, webhook system, real-time events, job queue)  │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────┐
│ F1: Workflow Engine  │◄───│ F3: Real Integrations   │
│     (Inngest)        │    │ (Google Drive, etc.)    │
└────────┬────────────┘    └──────────┬──────────────┘
         │                            │
         │  ┌─────────────────────┐   │  Synced files feed into vault
         ├─►│ F5: Playbook Gen    │   │
         │  │ (uses workflows)    │   │
         │  └─────────────────────┘   │
         │                            │
         ▼                            ▼
┌─────────────────────────────────────────────┐
│ F2: Multi-Source Vault Querying              │
│ (queries across projects, uses search)      │
├─────────────────────────────────────────────┤
│ F6: Full-Text Search (hybrid ranking)       │
│ (tsvector + pgvector combined scoring)      │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ F4: Shared Spaces / Collaboration           │
│ (per-resource sharing, comments, presence)  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ F7: Paid Ads Module                         │
│ (new domain — uses vault, workflows, collab)│
└─────────────────────────────────────────────┘
```

### Cross-Feature Dependencies (Critical Path)

| Dependency | Reason |
|---|---|
| F1 (Workflows) ← F3 (Integrations) | File sync jobs run as Inngest functions |
| F1 (Workflows) ← F5 (Playbooks) | Playbook execution uses the workflow engine |
| F2 (Vault Query) ← F6 (Full-Text Search) | Hybrid search combines both ranking methods |
| F3 (Integrations) → F2 (Vault Query) | Synced files are indexed into vault projects for querying |
| F4 (Collaboration) ← F7 (Ads) | Ads campaigns use shared spaces for team review |
| F1 (Workflows) ← F7 (Ads) | Campaign publishing uses workflow execution |

---

## 3. Recommended Implementation Order

### Phase 1 — Foundation (Weeks 1–3)

| Order | Feature | Rationale |
|---|---|---|
| 1a | **Shared Infrastructure** | Inngest client, event bus, webhook receiver — everything depends on this |
| 1b | **F6: Full-Text Search** | 3–5 days, no dependencies, unblocks hybrid search in vault |
| 1c | **F1: Workflow Engine** | Core orchestration layer; F3, F5, F7 all depend on it |

### Phase 2 — Data Pipeline (Weeks 3–6)

| Order | Feature | Rationale |
|---|---|---|
| 2a | **F3: Real Integrations** | Uses Inngest for sync jobs; feeds documents into vault |
| 2b | **F2: Multi-Source Vault Querying** | Combines full-text + semantic search; integrations feed data in |

### Phase 3 — Collaboration & Automation (Weeks 6–10)

| Order | Feature | Rationale |
|---|---|---|
| 3a | **F4: Shared Spaces / Collaboration** | Builds on existing RBAC; enables team workflows |
| 3b | **F5: Playbook Generation** | Uses workflow engine + vault querying |

### Phase 4 — New Domain (Weeks 10–20)

| Order | Feature | Rationale |
|---|---|---|
| 4 | **F7: Paid Ads Module** | Largest feature; depends on workflows, vault, collaboration |

---

## 4. Shared Infrastructure

These components must be built FIRST as they are used by multiple features.

### 4.1 Inngest Client Setup

**File:** `artifacts/api-server/src/inngest/client.ts`

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "grphintel",
  // Event schemas for type safety
});
```

**File:** `artifacts/api-server/src/inngest/index.ts`

```typescript
// Central registry of all Inngest functions
export { workflowExecuteFunction } from "./functions/workflow-execute";
export { integrationSyncFunction } from "./functions/integration-sync";
export { documentIndexFunction } from "./functions/document-index";
export { webhookProcessFunction } from "./functions/webhook-process";
```

**Integration with Express:**

```typescript
// In artifacts/api-server/src/index.ts (or app.ts)
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import * as functions from "./inngest";

app.use("/api/inngest", serve({ client: inngest, functions: Object.values(functions) }));
```

**Package to install:** `inngest` in `artifacts/api-server/package.json`

### 4.2 Event Bus (Inngest Events)

Define typed events that flow between features:

**File:** `artifacts/api-server/src/inngest/events.ts`

```typescript
export type GrphintelEvents = {
  // Workflow events
  "workflow/execute": { data: { executionId: number; orgId: number } };
  "workflow/step.completed": { data: { executionId: number; stepIndex: number; output: unknown } };
  "workflow/human-review.requested": { data: { executionId: number; stepIndex: number; reviewData: unknown } };
  "workflow/human-review.completed": { data: { executionId: number; stepIndex: number; approved: boolean; feedback?: string } };

  // Integration events
  "integration/sync.requested": { data: { integrationId: number; orgId: number; fullSync?: boolean } };
  "integration/sync.file": { data: { integrationId: number; externalFileId: string; action: "upsert" | "delete" } };
  "integration/webhook.received": { data: { provider: string; integrationId: number; payload: unknown } };

  // Document events
  "document/uploaded": { data: { documentId: number; orgId: number } };
  "document/index.requested": { data: { documentId: number; orgId: number } };
  "document/chunks.ready": { data: { documentId: number; chunkCount: number } };

  // Playbook events
  "playbook/generate": { data: { playbookId: number; orgId: number; sourceDocumentIds: number[] } };
  "playbook/execute": { data: { playbookRunId: number; orgId: number } };

  // Ads events
  "ads/campaign.publish": { data: { campaignId: number; orgId: number; platforms: string[] } };
  "ads/metrics.sync": { data: { adAccountId: number; orgId: number; dateRange: { from: string; to: string } } };
  "ads/optimize.run": { data: { campaignId: number; orgId: number; mode: "recommend" | "auto" } };
  "ads/report.generate": { data: { orgId: number; reportType: string; campaignIds?: number[]; dateRange: { from: string; to: string } } };
};
```

### 4.3 Webhook Receiver System

**File:** `artifacts/api-server/src/routes/webhooks.ts`

New route to receive webhooks from external providers (Google Drive push notifications, Slack events, ad platform callbacks).

```typescript
const router: IRouter = Router();

// Generic webhook receiver — routes to Inngest by provider
router.post("/webhooks/:provider", async (req, res) => {
  const { provider } = req.params;
  // Verify webhook signature per provider
  // Send to Inngest for async processing
  await inngest.send({
    name: "integration/webhook.received",
    data: { provider, integrationId: extractIntegrationId(req), payload: req.body },
  });
  res.status(200).json({ received: true });
});
```

**Endpoints:**
- `POST /webhooks/google` — Google Drive push notifications
- `POST /webhooks/slack` — Slack event subscriptions
- `POST /webhooks/meta` — Meta Ads webhook
- `POST /webhooks/google-ads` — Google Ads webhook

### 4.4 Real-Time Events (Server-Sent Events)

For live UI updates (workflow progress, sync status, collaboration presence).

**File:** `artifacts/api-server/src/routes/sse.ts`

```typescript
router.get("/events/stream", async (req, res) => {
  if (!requireAuth(req, res)) return;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  // Subscribe to org-scoped events
  // Push: workflow status changes, sync progress, collaboration presence, comments
});
```

**Database table for event fanout:**

```typescript
// lib/db/src/schema/realtime.ts
export const realtimeEvents = pgTable("realtime_events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 100 }).notNull(), // e.g. "workflow:123", "document:456"
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_realtime_org_channel").on(table.orgId, table.channel),
  index("idx_realtime_created").on(table.createdAt),
]);
```

Use PostgreSQL `LISTEN`/`NOTIFY` for efficient SSE fanout without polling.

### 4.5 Shared Utility: Token Refresh Helper

**File:** `artifacts/api-server/src/lib/oauth-tokens.ts`

Centralized OAuth token refresh logic used by all integrations:

```typescript
export async function getValidAccessToken(integrationId: number): Promise<string> {
  const [integration] = await db.select().from(integrations).where(eq(integrations.id, integrationId));
  if (!integration) throw new Error("Integration not found");
  if (integration.tokenExpiresAt && integration.tokenExpiresAt > new Date(Date.now() + 60_000)) {
    return integration.accessToken!;
  }
  // Refresh based on provider type
  const newTokens = await refreshTokenForProvider(integration.type, integration.refreshToken!);
  await db.update(integrations).set({
    accessToken: newTokens.access_token,
    tokenExpiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
    ...(newTokens.refresh_token ? { refreshToken: newTokens.refresh_token } : {}),
  }).where(eq(integrations.id, integrationId));
  return newTokens.access_token;
}
```

---

## 5. Feature 1 — Workflow Execution Engine (Inngest)

**Effort:** 1–2 weeks
**Priority:** P0 — Critical path for F3, F5, F7

### 5.1 Current State

- Schema exists: `workflowDefinitions`, `workflowSteps`, `workflowExecutions`, `workflowExecutionSteps`
- Routes exist: CRUD for definitions and executions, but execution POST has `TODO: Trigger Inngest function here`
- `workflowExecutions.inngestRunId` column exists for tracking
- Step types defined: `"prompt" | "tool" | "branch" | "loop" | "human_review"`
- Frontend pages exist: `workflows.tsx`, `workflow-builder.tsx`, `workflow-builder-edit.tsx`, `workflow-runner.tsx`, `workflow-view.tsx`

### 5.2 Database Schema Changes

**No new tables needed.** The existing schema is sufficient. Add one column to `workflowExecutionSteps`:

```typescript
// In lib/db/src/schema/workflow-definitions.ts — add to workflowExecutionSteps
retryCount: integer("retry_count").default(0),
maxRetries: integer("max_retries").default(3),
```

**New table for human review queue:**

```typescript
// lib/db/src/schema/human-reviews.ts
export const humanReviews = pgTable(
  "human_reviews",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    executionId: integer("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepIndex: integer("step_index").notNull(),
    assignedToUserId: varchar("assigned_to_user_id"),
    reviewData: jsonb("review_data").notNull(), // What needs reviewing
    decision: varchar("decision", { length: 20 }), // "approved" | "rejected" | "modified"
    feedback: text("feedback"),
    modifiedData: jsonb("modified_data"), // If reviewer modified the output
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | completed | expired
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_human_review_org").on(table.orgId),
    index("idx_human_review_exec").on(table.executionId),
    index("idx_human_review_assignee").on(table.assignedToUserId),
    index("idx_human_review_status").on(table.status),
  ],
);

export const insertHumanReviewSchema = createInsertSchema(humanReviews).omit({
  id: true, createdAt: true, completedAt: true,
});
export type HumanReview = typeof humanReviews.$inferSelect;
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./human-reviews";
```

### 5.3 Inngest Functions

**File:** `artifacts/api-server/src/inngest/functions/workflow-execute.ts`

This is the core orchestration function. It:
1. Loads the workflow definition and its steps
2. Iterates through steps sequentially (or branches/loops as defined)
3. Executes each step based on its type
4. Records step-level traces with timing and token costs
5. Pauses at `human_review` steps and waits for an event to resume

```typescript
import { inngest } from "../client";
import { db, workflowDefinitions, workflowSteps, workflowExecutions, workflowExecutionSteps } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

export const workflowExecuteFunction = inngest.createFunction(
  {
    id: "workflow-execute",
    retries: 0, // We handle retries per-step, not per-function
    concurrency: [{ limit: 10, scope: "account" }],
  },
  { event: "workflow/execute" },
  async ({ event, step }) => {
    const { executionId, orgId } = event.data;

    // 1. Mark execution as running
    await step.run("mark-running", async () => {
      await db.update(workflowExecutions).set({
        status: "running",
        startedAt: new Date(),
        inngestRunId: event.id ?? null,
      }).where(eq(workflowExecutions.id, executionId));
    });

    // 2. Load definition and steps
    const { definition, steps: definedSteps } = await step.run("load-definition", async () => {
      const [exec] = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, executionId));
      if (!exec?.workflowDefinitionId) throw new Error("No workflow definition linked");
      const [def] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, exec.workflowDefinitionId));
      const stps = await db.select().from(workflowSteps)
        .where(eq(workflowSteps.workflowDefinitionId, def.id))
        .orderBy(asc(workflowSteps.stepIndex));
      return { definition: def, steps: stps };
    });

    // 3. Execute steps sequentially
    let stepContext: Record<string, unknown> = {};
    let currentIndex = 0;

    while (currentIndex < definedSteps.length) {
      const currentStep = definedSteps[currentIndex];

      const stepResult = await step.run(`step-${currentIndex}-${currentStep.type}`, async () => {
        // Create execution step trace
        const [execStep] = await db.insert(workflowExecutionSteps).values({
          executionId,
          stepIndex: currentIndex,
          stepType: currentStep.type,
          stepName: currentStep.name,
          status: "running",
          input: { ...currentStep.config, context: stepContext },
          startedAt: new Date(),
        }).returning();

        try {
          let output: unknown;

          switch (currentStep.type) {
            case "prompt":
              output = await executePromptStep(currentStep.config as any, stepContext);
              break;
            case "tool":
              output = await executeToolStep(currentStep.config as any, stepContext);
              break;
            case "branch":
              output = await evaluateBranch(currentStep.config as any, stepContext);
              break;
            case "loop":
              output = await executeLoop(currentStep.config as any, stepContext);
              break;
            case "human_review":
              // Returns { needsReview: true } — handled below
              output = { needsReview: true, reviewData: stepContext };
              break;
            default:
              throw new Error(`Unknown step type: ${currentStep.type}`);
          }

          await db.update(workflowExecutionSteps).set({
            status: "completed",
            output,
            completedAt: new Date(),
          }).where(eq(workflowExecutionSteps.id, execStep.id));

          return { output, type: currentStep.type };
        } catch (err) {
          await db.update(workflowExecutionSteps).set({
            status: "failed",
            errorMessage: (err as Error).message,
            completedAt: new Date(),
          }).where(eq(workflowExecutionSteps.id, execStep.id));
          throw err;
        }
      });

      // Handle human review pause
      if (currentStep.type === "human_review") {
        // Create review record
        await step.run(`create-review-${currentIndex}`, async () => {
          await db.insert(humanReviews).values({
            orgId,
            executionId,
            stepIndex: currentIndex,
            reviewData: stepContext,
            status: "pending",
          });
          await db.update(workflowExecutions).set({
            status: "awaiting_review",
            currentStepIndex: currentIndex,
          }).where(eq(workflowExecutions.id, executionId));
        });

        // Wait for human review event (timeout: 7 days)
        const reviewResult = await step.waitForEvent("wait-for-review", {
          event: "workflow/human-review.completed",
          match: "data.executionId",
          timeout: "7d",
        });

        if (!reviewResult || !reviewResult.data.approved) {
          // Review rejected or timed out
          await step.run("mark-rejected", async () => {
            await db.update(workflowExecutions).set({
              status: "rejected",
              completedAt: new Date(),
              errorMessage: reviewResult ? "Review rejected" : "Review timed out",
            }).where(eq(workflowExecutions.id, executionId));
          });
          return { status: "rejected" };
        }

        // Review approved — continue with potentially modified data
        if (reviewResult.data.modifiedData) {
          stepContext = { ...stepContext, ...reviewResult.data.modifiedData };
        }
      } else {
        // Merge step output into context for next steps
        stepContext = { ...stepContext, [`step_${currentIndex}`]: stepResult.output };

        // Handle branch: output determines next step index
        if (currentStep.type === "branch" && typeof (stepResult.output as any)?.nextStepIndex === "number") {
          currentIndex = (stepResult.output as any).nextStepIndex;
          continue;
        }
      }

      // Update progress
      await step.run(`update-progress-${currentIndex}`, async () => {
        await db.update(workflowExecutions).set({
          currentStepIndex: currentIndex + 1,
        }).where(eq(workflowExecutions.id, executionId));
      });

      currentIndex++;
    }

    // 4. Mark execution as complete
    await step.run("mark-complete", async () => {
      await db.update(workflowExecutions).set({
        status: "completed",
        outputs: stepContext,
        completedAt: new Date(),
      }).where(eq(workflowExecutions.id, executionId));
    });

    return { status: "completed", outputs: stepContext };
  },
);
```

**Step executors (separate files under `artifacts/api-server/src/inngest/steps/`):**

- `prompt-step.ts` — Calls OpenAI GPT-4o with the step's `systemPrompt`, `userPrompt`, and merged context. Records token usage.
- `tool-step.ts` — Executes a registered tool (vault query, web search, document extraction, etc.). Each tool is a function registered in a tool registry.
- `branch-step.ts` — Evaluates a condition expression against context. Returns `{ nextStepIndex }`.
- `loop-step.ts` — Iterates over an array in context, executing a sub-sequence of steps for each item. Configurable max iterations and break condition.

### 5.4 API Endpoint Changes

**Modify `POST /workflow-executions`** in `artifacts/api-server/src/routes/workflow-executions.ts`:

Replace the TODO block with:

```typescript
// Trigger Inngest execution
await inngest.send({
  name: "workflow/execute",
  data: { executionId: execution.id, orgId },
});
```

**New endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/human-reviews` | List pending reviews for the org (filterable by assignee) |
| `GET` | `/human-reviews/:id` | Get review details with execution context |
| `POST` | `/human-reviews/:id/decide` | Submit review decision (approve/reject/modify) — sends `workflow/human-review.completed` event |
| `GET` | `/workflow-executions/:id/live` | SSE stream for real-time execution progress |

**File:** `artifacts/api-server/src/routes/human-reviews.ts`

### 5.5 Frontend Changes

**Modify existing pages:**

| Page | Changes |
|---|---|
| `workflow-runner.tsx` | Show real-time execution progress via SSE; display step-by-step trace as steps complete |
| `workflow-view.tsx` | Show completed step details with timing, token costs, inputs/outputs |
| `workflows.tsx` | Add "Pending Reviews" badge/tab showing human review items |

**New components:**

| Component | Purpose |
|---|---|
| `components/workflow/execution-timeline.tsx` | Visual step-by-step progress indicator |
| `components/workflow/human-review-dialog.tsx` | Review modal: shows context, approve/reject/modify actions |
| `components/workflow/step-output-viewer.tsx` | Renders step output (JSON, text, or structured data) |

**New page:**

| Page | Route | Purpose |
|---|---|---|
| `human-reviews.tsx` | `/human-reviews` | Dashboard of all pending reviews across workflows |

### 5.6 Integration Points

- **F3 (Integrations):** Integration sync jobs are Inngest functions triggered by `integration/sync.requested`
- **F5 (Playbooks):** Playbook execution creates a workflow definition dynamically and triggers it
- **F7 (Ads):** Campaign publishing is a multi-step workflow (configure placement → review → publish to platforms)

### 5.7 Testing Approach

1. **Unit tests** for each step executor (prompt, tool, branch, loop) with mocked OpenAI
2. **Integration tests** for the full Inngest function using Inngest's test mode (`inngest/test`)
3. **Human review flow** end-to-end test: trigger execution → pause at review → submit decision → verify resume
4. **Error/retry tests**: simulate step failures, verify retry counts, error recording
5. **Concurrency test**: trigger multiple executions simultaneously, verify isolation

---

## 6. Feature 2 — Multi-Source Vault Querying

**Effort:** 1 week
**Priority:** P1 — Core search capability

### 6.1 Current State

- `vaultProjects` table with org-scoped projects
- `projectDocuments` junction table linking documents to projects
- `documentChunks` with pgvector embeddings (1536 dims)
- Semantic search exists but queries single projects only
- No cross-project query support

### 6.2 Database Schema Changes

**New table for saved queries:**

```typescript
// lib/db/src/schema/vault-queries.ts
export const savedVaultQueries = pgTable(
  "saved_vault_queries",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    query: text("query").notNull(),
    projectIds: jsonb("project_ids").notNull(), // number[] — empty means "all projects"
    filters: jsonb("filters"), // { dateRange, fileTypes, tags, etc. }
    searchMode: varchar("search_mode", { length: 20 }).default("hybrid"), // "semantic" | "fulltext" | "hybrid"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_saved_query_org").on(table.orgId),
  ],
);
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./vault-queries";
```

### 6.3 API Endpoints

**File:** `artifacts/api-server/src/routes/vault-query.ts`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/vault/query` | Execute multi-project search query |
| `POST` | `/vault/query/save` | Save a query for reuse |
| `GET` | `/vault/queries` | List saved queries |
| `DELETE` | `/vault/queries/:id` | Delete a saved query |

**`POST /vault/query` request body:**

```typescript
{
  query: string;                    // User's search text
  projectIds: number[];             // Empty = all org projects
  searchMode: "semantic" | "fulltext" | "hybrid";
  filters?: {
    dateRange?: { from: string; to: string };
    fileTypes?: string[];
    tags?: string[];
  };
  limit?: number;                   // Default 20, max 100
  offset?: number;
  threshold?: number;               // Cosine distance threshold, default 0.3
}
```

**`POST /vault/query` response:**

```typescript
{
  results: Array<{
    documentId: number;
    documentTitle: string;
    chunkId: number;
    chunkText: string;
    projectId: number;
    projectName: string;
    score: number;                  // Combined relevance score (0-1)
    scoreBreakdown: {
      semantic?: number;            // Cosine similarity score
      fulltext?: number;            // BM25-normalized score
    };
    highlights: string[];           // Text snippets with match highlights
    metadata: {
      fileType: string;
      createdAt: string;
      tags: string | null;
    };
  }>;
  total: number;
  query: string;
  projectsSearched: number[];
}
```

**Core query logic (multi-project semantic search):**

```sql
-- Pseudocode for the multi-project vector query
SELECT
  dc.id AS chunk_id,
  dc.document_id,
  dc.text AS chunk_text,
  d.title AS document_title,
  vp.id AS project_id,
  vp.name AS project_name,
  1 - (dc.embedding <=> $queryEmbedding) AS semantic_score
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
JOIN project_documents pd ON pd.document_id = d.id
JOIN vault_projects vp ON vp.id = pd.project_id
WHERE vp.org_id = $orgId
  AND ($projectIds IS NULL OR vp.id = ANY($projectIds))
  AND (dc.embedding <=> $queryEmbedding) < $threshold
ORDER BY semantic_score DESC
LIMIT $limit OFFSET $offset;
```

**Permission check:** Before executing, verify the user has `read` permission on `document` resources (already enforced by RBAC). Additionally, filter to only projects the user's org owns (enforced by `vp.org_id = $orgId`).

### 6.4 Frontend Changes

**New page:**

| Page | Route | Purpose |
|---|---|---|
| `vault-search.tsx` | `/vault/search` | Multi-project search interface |

**Components:**

| Component | Purpose |
|---|---|
| `components/vault/multi-project-search.tsx` | Search bar with project selector (multi-select), mode toggle, filters |
| `components/vault/search-result-card.tsx` | Individual result with source attribution, score, highlighted text |
| `components/vault/project-picker.tsx` | Multi-select dropdown for vault projects |

**Modify existing:**
- `vault.tsx` — Add "Search across projects" button linking to the search page
- `vault-project.tsx` — Add "Include in cross-project search" toggle

### 6.5 Integration Points

- **F6 (Full-Text Search):** When hybrid mode is selected, the query runs BOTH semantic + full-text and merges results using Reciprocal Rank Fusion (RRF)
- **F1 (Workflows):** The "tool" step type can invoke vault queries as a registered tool
- **F3 (Integrations):** Synced files from integrations get chunked and embedded into project documents, making them searchable

### 6.6 Testing Approach

1. **Unit tests** for the query builder (SQL generation, filter application)
2. **Integration tests** with seeded documents across multiple projects — verify correct results, ordering, and cross-project isolation
3. **Permission tests**: user from org A cannot query org B's projects
4. **Performance test**: 10k+ chunks across 50 projects, measure query latency (target < 500ms)

---

## 7. Feature 3 — Real Integrations

**Effort:** 2–3 weeks
**Priority:** P1 — Core data pipeline

### 7.1 Current State

- `integrations` table with OAuth token storage
- `syncedFiles` table for external file tracking
- Google Drive OAuth flow skeleton (state token, CSRF check) — but token exchange uses stubs
- `POST /integrations/:id/sync` exists but has TODO for Inngest
- `GET /integrations/:id/drive/folders` exists but returns empty array

### 7.2 Database Schema Changes

**Add webhook tracking table:**

```typescript
// lib/db/src/schema/integration-webhooks.ts
export const integrationWebhooks = pgTable(
  "integration_webhooks",
  {
    id: serial("id").primaryKey(),
    integrationId: integer("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    webhookId: text("webhook_id"), // Provider's webhook/channel ID
    webhookUrl: text("webhook_url"),
    resourceId: text("resource_id"), // What resource is being watched
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_integration_webhook_int").on(table.integrationId),
  ],
);
```

**Add health monitoring columns to `integrations`:**

```typescript
// Add these columns to the existing integrations table
healthStatus: varchar("health_status", { length: 20 }).default("healthy"), // healthy | degraded | disconnected
lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
errorCount: integer("error_count").default(0),
lastErrorMessage: text("last_error_message"),
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./integration-webhooks";
```

### 7.3 Google Drive Implementation (Primary)

**Packages to install:**
- `googleapis` (Google API client)
- `google-auth-library` (OAuth2 token management)

**File:** `artifacts/api-server/src/lib/providers/google-drive.ts`

```typescript
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export function createGoogleOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    `${process.env.API_BASE_URL}/integrations/oauth/google/callback`,
  );
}

export async function exchangeCodeForTokens(code: string) {
  const client = createGoogleOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, token_type, scope }
}

export async function refreshAccessToken(refreshToken: string) {
  const client = createGoogleOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export async function listFolders(accessToken: string, parentId?: string) {
  const client = createGoogleOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: client });
  const query = parentId
    ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q: query, fields: "files(id,name,webViewLink)", pageSize: 100 });
  return res.data.files || [];
}

export async function listFiles(accessToken: string, folderId: string, pageToken?: string) {
  const client = createGoogleOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: client });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink)",
    pageSize: 100,
    pageToken,
  });
  return { files: res.data.files || [], nextPageToken: res.data.nextPageToken };
}

export async function downloadFile(accessToken: string, fileId: string): Promise<Buffer> {
  const client = createGoogleOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: client });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

export async function setupPushNotifications(accessToken: string, folderId: string, webhookUrl: string) {
  const client = createGoogleOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: client });
  // Watch for changes in the folder
  const res = await drive.files.watch({
    fileId: folderId,
    requestBody: {
      id: `grphintel-${folderId}-${Date.now()}`,
      type: "web_hook",
      address: webhookUrl,
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
  return res.data;
}
```

**Modify `artifacts/api-server/src/routes/integrations.ts`:**

Replace the OAuth callback stub:

```typescript
// In GET /integrations/oauth/google/callback
// Replace "STUB_ACCESS_TOKEN" block with:
const tokens = await exchangeCodeForTokens(code as string);
const client = createGoogleOAuth2Client();
client.setCredentials(tokens);
const oauth2 = google.oauth2({ version: "v2", auth: client });
const { data: userInfo } = await oauth2.userinfo.get();

const [integration] = await db.insert(integrations).values({
  orgId,
  connectedByUserId: userId,
  type: "google_drive",
  name: `Google Drive (${userInfo.email})`,
  accessToken: tokens.access_token!,
  refreshToken: tokens.refresh_token!,
  tokenExpiresAt: new Date(tokens.expiry_date!),
  scopes: ["drive.readonly", "drive.metadata.readonly"],
  metadata: { email: userInfo.email, displayName: userInfo.name, picture: userInfo.picture },
  isActive: true,
  syncConfig: { folderIds: [], direction: "pull", intervalMinutes: 30 },
}).returning();
```

Replace the folders endpoint:

```typescript
// In GET /integrations/:id/drive/folders
const accessToken = await getValidAccessToken(integrationId);
const parentId = req.query.parentId as string | undefined;
const folders = await listFolders(accessToken, parentId);
res.json({ folders });
```

### 7.4 Inngest Sync Function

**File:** `artifacts/api-server/src/inngest/functions/integration-sync.ts`

```typescript
export const integrationSyncFunction = inngest.createFunction(
  {
    id: "integration-sync",
    retries: 3,
    concurrency: [{ limit: 5, scope: "account" }],
  },
  { event: "integration/sync.requested" },
  async ({ event, step }) => {
    const { integrationId, orgId, fullSync } = event.data;

    // 1. Get valid access token (with refresh)
    const accessToken = await step.run("get-token", () => getValidAccessToken(integrationId));

    // 2. Load integration config
    const integration = await step.run("load-config", async () => {
      const [int] = await db.select().from(integrations).where(eq(integrations.id, integrationId));
      return int;
    });

    const folderIds = (integration.syncConfig as any)?.folderIds || [];

    // 3. For each configured folder, list and sync files
    for (const folderId of folderIds) {
      await step.run(`sync-folder-${folderId}`, async () => {
        let pageToken: string | undefined;
        do {
          const { files, nextPageToken } = await listFiles(accessToken, folderId, pageToken);
          for (const file of files) {
            // Check if file already synced
            const [existing] = await db.select().from(syncedFiles)
              .where(and(eq(syncedFiles.integrationId, integrationId), eq(syncedFiles.externalId, file.id!)));

            if (existing && !fullSync) {
              // Skip if already synced and not a full resync
              continue;
            }

            // Send per-file sync event
            await inngest.send({
              name: "integration/sync.file",
              data: { integrationId, externalFileId: file.id!, action: "upsert" },
            });
          }
          pageToken = nextPageToken ?? undefined;
        } while (pageToken);
      });
    }

    // 4. Update lastSyncAt and health status
    await step.run("update-status", async () => {
      await db.update(integrations).set({
        lastSyncAt: new Date(),
        healthStatus: "healthy",
        errorCount: 0,
      }).where(eq(integrations.id, integrationId));
    });
  },
);
```

**File:** `artifacts/api-server/src/inngest/functions/integration-sync-file.ts`

Individual file sync — downloads file, uploads to GCS, creates document record, triggers embedding:

```typescript
export const integrationSyncFileFunction = inngest.createFunction(
  { id: "integration-sync-file", retries: 3 },
  { event: "integration/sync.file" },
  async ({ event, step }) => {
    const { integrationId, externalFileId, action } = event.data;

    // 1. Download from provider
    // 2. Upload to Google Cloud Storage
    // 3. Create/update document record
    // 4. Update synced_files record
    // 5. Send "document/index.requested" to trigger embedding
  },
);
```

### 7.5 Scheduled Sync (Inngest Cron)

```typescript
export const scheduledSyncFunction = inngest.createFunction(
  { id: "integration-scheduled-sync" },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ step }) => {
    // Find all active integrations due for sync
    const dueIntegrations = await step.run("find-due", async () => {
      return await db.select().from(integrations)
        .where(and(eq(integrations.isActive, true)));
      // Filter by: lastSyncAt + intervalMinutes < now
    });

    for (const integration of dueIntegrations) {
      await step.sendEvent(`trigger-sync-${integration.id}`, {
        name: "integration/sync.requested",
        data: { integrationId: integration.id, orgId: integration.orgId },
      });
    }
  },
);
```

### 7.6 Additional Providers (after Google Drive)

Each provider follows the same pattern. Implementation files:

| Provider | OAuth Flow | API Client File | Inngest Sync File |
|---|---|---|---|
| SharePoint | `providers/sharepoint.ts` | Microsoft Graph API | `integration-sync-sharepoint.ts` |
| Box | `providers/box.ts` | Box SDK | `integration-sync-box.ts` |
| Dropbox | `providers/dropbox.ts` | Dropbox SDK | `integration-sync-dropbox.ts` |
| Slack | `providers/slack.ts` | Slack Web API | `integration-sync-slack.ts` |

**Route additions for each provider:**

```
GET /integrations/oauth/:provider/start
GET /integrations/oauth/:provider/callback
```

Refactor the Google-specific routes into a generic OAuth handler with provider-specific adapters.

### 7.7 New API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/integrations/:id/health` | Get integration health status and recent errors |
| `POST` | `/integrations/:id/configure` | Update sync config (folders, interval, direction) |
| `POST` | `/integrations/:id/watch` | Set up webhook push notifications |
| `DELETE` | `/integrations/:id/watch` | Remove webhook |
| `GET` | `/integrations/:id/files` | List synced files with status |

### 7.8 Frontend Changes

**Modify `integrations.tsx`:**
- Show health status indicator (green/yellow/red) per integration
- Add folder selector after OAuth connection
- Show sync progress (files synced / total)
- Add "Configure Sync" dialog (folder selection, interval)

**New components:**

| Component | Purpose |
|---|---|
| `components/integrations/folder-browser.tsx` | Browse and select folders from connected provider |
| `components/integrations/sync-progress.tsx` | Real-time sync progress with file list |
| `components/integrations/health-badge.tsx` | Color-coded health indicator |
| `components/integrations/provider-card.tsx` | Card for each provider with connect/configure actions |

### 7.9 Testing Approach

1. **Unit tests** for each provider client (mocked HTTP responses)
2. **OAuth flow test**: mock Google token endpoint, verify token storage
3. **Sync integration test**: mock Drive API, verify document creation and embedding trigger
4. **Webhook test**: send simulated webhook payload, verify file re-sync
5. **Token refresh test**: set expired token, verify automatic refresh
6. **Health monitoring test**: simulate repeated failures, verify health status transitions

---

## 8. Feature 4 — Shared Spaces / Collaboration

**Effort:** 2–3 weeks
**Priority:** P2

### 8.1 Current State

- RBAC exists at org level (owner/admin/editor/viewer)
- No per-resource sharing, comments, or real-time features
- Org members managed via `orgMembers` table

### 8.2 Database Schema Changes

**File:** `lib/db/src/schema/collaboration.ts`

```typescript
import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Per-resource sharing. Grants access to individual resources
 * beyond what org-level RBAC provides.
 */
export const resourceShares = pgTable(
  "resource_shares",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 50 }).notNull(), // "document" | "report" | "conversation" | "vault_project" | "workflow"
    resourceId: integer("resource_id").notNull(),
    sharedByUserId: varchar("shared_by_user_id").notNull(),
    sharedWithUserId: varchar("shared_with_user_id"), // NULL if shared with guest
    sharedWithEmail: varchar("shared_with_email", { length: 255 }), // For guest access
    permission: varchar("permission", { length: 20 }).notNull().default("read"), // "read" | "edit" | "comment"
    isActive: boolean("is_active").default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // For time-limited shares
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_share_org").on(table.orgId),
    index("idx_share_resource").on(table.resourceType, table.resourceId),
    index("idx_share_user").on(table.sharedWithUserId),
    index("idx_share_email").on(table.sharedWithEmail),
  ],
);

/**
 * Comments and annotations on any resource.
 */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id").notNull(),
    parentId: integer("parent_id"), // For threaded replies (self-referencing)
    userId: varchar("user_id").notNull(),
    content: text("content").notNull(),
    anchor: jsonb("anchor"), // Position anchor for annotations: { page, offset, selection }
    isResolved: boolean("is_resolved").default(false),
    resolvedByUserId: varchar("resolved_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_comment_resource").on(table.resourceType, table.resourceId),
    index("idx_comment_parent").on(table.parentId),
    index("idx_comment_user").on(table.userId),
  ],
);

/**
 * Guest access tokens — external users with limited scope.
 */
export const guestTokens = pgTable(
  "guest_tokens",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }),
    token: varchar("token", { length: 128 }).notNull(),
    isActive: boolean("is_active").default(true),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_guest_token").on(table.token),
    index("idx_guest_org_email").on(table.orgId, table.email),
  ],
);

/**
 * Activity feed for org-wide visibility.
 */
export const activityFeed = pgTable(
  "activity_feed",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(), // "created" | "updated" | "commented" | "shared" | "completed"
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: integer("resource_id").notNull(),
    resourceTitle: text("resource_title"),
    metadata: jsonb("metadata"), // Action-specific details
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_activity_org").on(table.orgId),
    index("idx_activity_created").on(table.createdAt),
    index("idx_activity_user").on(table.userId),
  ],
);

/**
 * Presence tracking for real-time collaboration.
 * Ephemeral — rows are cleaned up when users disconnect.
 */
export const userPresence = pgTable(
  "user_presence",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: integer("resource_id"),
    status: varchar("status", { length: 20 }).default("online"), // "online" | "away" | "viewing"
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_presence_user_resource").on(table.userId, table.resourceType, table.resourceId),
    index("idx_presence_resource").on(table.resourceType, table.resourceId),
  ],
);

// Insert schemas
export const insertResourceShareSchema = createInsertSchema(resourceShares).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGuestTokenSchema = createInsertSchema(guestTokens).omit({ id: true, createdAt: true, lastAccessedAt: true });

// Types
export type ResourceShare = typeof resourceShares.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type GuestToken = typeof guestTokens.$inferSelect;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./collaboration";
```

### 8.3 Permission Model Extension

**Modify `lib/db/src/schema/permissions.ts`:**

Add a `canAccessResource` helper that checks BOTH org-level RBAC and per-resource shares:

```typescript
// New function to check resource-level access
export async function canAccessResource(
  userId: string,
  orgId: number,
  orgRole: Role | null,
  resourceType: string,
  resourceId: number,
  requiredAction: Action,
): Promise<boolean> {
  // 1. Check org-level RBAC first
  if (orgRole && hasPermission(orgRole, resourceType, requiredAction)) return true;

  // 2. Check per-resource shares
  const [share] = await db.select().from(resourceShares).where(
    and(
      eq(resourceShares.resourceType, resourceType),
      eq(resourceShares.resourceId, resourceId),
      eq(resourceShares.sharedWithUserId, userId),
      eq(resourceShares.isActive, true),
    ),
  );

  if (!share) return false;

  // Map share permission to allowed actions
  const sharePermMap: Record<string, Action[]> = {
    read: ["read"],
    comment: ["read"],
    edit: ["read", "update", "create"],
  };

  return (sharePermMap[share.permission] || []).includes(requiredAction);
}
```

### 8.4 Guest Access Middleware

**File:** `artifacts/api-server/src/middleware/guestMiddleware.ts`

```typescript
// Checks for guest token in Authorization header or query param
// Sets req.guest with { email, name, orgId, shares: [...] }
// Guest users can ONLY access resources explicitly shared with their email
```

### 8.5 API Endpoints

**File:** `artifacts/api-server/src/routes/sharing.ts`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/sharing/share` | Share a resource with a user or email |
| `GET` | `/sharing/resource/:type/:id` | List who has access to a resource |
| `DELETE` | `/sharing/:shareId` | Revoke a share |
| `PATCH` | `/sharing/:shareId` | Update share permission or expiry |
| `GET` | `/sharing/shared-with-me` | List all resources shared with current user |

**File:** `artifacts/api-server/src/routes/comments.ts`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/comments/:resourceType/:resourceId` | List comments on a resource |
| `POST` | `/comments` | Create a comment (or reply) |
| `PATCH` | `/comments/:id` | Edit a comment |
| `DELETE` | `/comments/:id` | Delete a comment |
| `POST` | `/comments/:id/resolve` | Mark a comment thread as resolved |

**File:** `artifacts/api-server/src/routes/activity.ts`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/activity` | Get org activity feed (paginated, filterable by user/resource type) |

**File:** `artifacts/api-server/src/routes/guests.ts`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/guests/invite` | Create guest token and send invite email |
| `GET` | `/guests` | List active guests |
| `DELETE` | `/guests/:id` | Revoke guest access |
| `POST` | `/guests/auth` | Guest login via token (returns limited session) |

### 8.6 Frontend Changes

**New pages:**

| Page | Route | Purpose |
|---|---|---|
| `shared-with-me.tsx` | `/shared` | View all resources shared with the user |
| `activity.tsx` | `/activity` | Org-wide activity feed |

**New components:**

| Component | Purpose |
|---|---|
| `components/collaboration/share-dialog.tsx` | Modal to share a resource — user picker + permission selector |
| `components/collaboration/comment-thread.tsx` | Threaded comment display with reply/resolve |
| `components/collaboration/comment-input.tsx` | Comment text input with @ mentions |
| `components/collaboration/presence-avatars.tsx` | Row of user avatars showing who's viewing |
| `components/collaboration/activity-item.tsx` | Single activity feed entry |
| `components/collaboration/guest-invite-dialog.tsx` | Invite external guest by email |

**Modify existing pages:**

All resource detail pages (`report-view.tsx`, `vault-project.tsx`, `workflow-view.tsx`, etc.) get:
- A "Share" button (opens `share-dialog.tsx`)
- A comments panel (collapsible sidebar)
- Presence avatars in the header

### 8.7 Real-Time Presence (SSE)

The SSE stream from Shared Infrastructure (§4.4) carries presence events:

```typescript
// Client sends heartbeats every 30s
// Server broadcasts presence changes to all users viewing the same resource
// Presence rows are cleaned up after 2 minutes of no heartbeat
```

### 8.8 Testing Approach

1. **Permission tests**: verify share grants access, revoke removes it, expiry works
2. **Guest access tests**: guest can only access shared resources, cannot access anything else
3. **Comment tests**: create, reply, resolve, edit, delete — verify threading
4. **Activity feed tests**: verify all actions generate feed entries
5. **Presence tests**: connect, heartbeat, disconnect — verify cleanup
6. **Cross-org isolation**: sharing within org works, cross-org is blocked

---

## 9. Feature 5 — Playbook Generation

**Effort:** 1–2 weeks
**Priority:** P2

### 9.1 Database Schema Changes

**File:** `lib/db/src/schema/playbooks.ts`

```typescript
import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Playbook templates — auto-generated or manually created review playbooks.
 */
export const playbooks = pgTable(
  "playbooks",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }), // "due_diligence" | "compliance" | "audit" | "review" | "custom"
    sourceDocumentIds: jsonb("source_document_ids"), // number[] — documents used to generate the playbook
    steps: jsonb("steps").notNull(), // PlaybookStep[] — ordered list of checklist items
    isTemplate: boolean("is_template").default(false),
    isPublished: boolean("is_published").default(false),
    version: integer("version").default(1),
    parentId: integer("parent_id"), // For versioning — points to previous version
    tags: jsonb("tags"), // string[]
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_playbook_org").on(table.orgId),
    index("idx_playbook_category").on(table.category),
    index("idx_playbook_parent").on(table.parentId),
  ],
);

/**
 * PlaybookStep JSON structure (stored in playbooks.steps):
 * {
 *   index: number;
 *   title: string;
 *   description: string;
 *   type: "checklist" | "review" | "extract" | "compare" | "flag";
 *   config: {
 *     extractionFields?: string[];
 *     comparisonDocTypes?: string[];
 *     flagConditions?: string[];
 *     aiPrompt?: string;
 *   };
 *   isRequired: boolean;
 * }
 */

/**
 * Playbook runs — tracking execution of a playbook against a set of documents.
 */
export const playbookRuns = pgTable(
  "playbook_runs",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    playbookId: integer("playbook_id").notNull().references(() => playbooks.id, { onDelete: "cascade" }),
    triggeredByUserId: varchar("triggered_by_user_id").notNull(),
    title: text("title").notNull(),
    targetDocumentIds: jsonb("target_document_ids").notNull(), // number[] — documents being reviewed
    workflowExecutionId: integer("workflow_execution_id"), // Links to workflow engine execution
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | running | completed | failed
    stepResults: jsonb("step_results"), // Array of { stepIndex, status, result, notes, completedByUserId, completedAt }
    completedSteps: integer("completed_steps").default(0),
    totalSteps: integer("total_steps").default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_playbook_run_org").on(table.orgId),
    index("idx_playbook_run_playbook").on(table.playbookId),
    index("idx_playbook_run_status").on(table.status),
  ],
);

// Insert schemas
export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true, createdAt: true, updatedAt: true, version: true,
});
export const insertPlaybookRunSchema = createInsertSchema(playbookRuns).omit({
  id: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true, completedSteps: true,
});

// Types
export type Playbook = typeof playbooks.$inferSelect;
export type PlaybookRun = typeof playbookRuns.$inferSelect;
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./playbooks";
```

### 9.2 AI Playbook Generation

**Inngest function:** `artifacts/api-server/src/inngest/functions/playbook-generate.ts`

```typescript
export const playbookGenerateFunction = inngest.createFunction(
  { id: "playbook-generate", retries: 2 },
  { event: "playbook/generate" },
  async ({ event, step }) => {
    const { playbookId, orgId, sourceDocumentIds } = event.data;

    // 1. Load source documents and their extracted text
    const documentTexts = await step.run("load-documents", async () => {
      // Query documents table for extractedText
      // Return array of { id, title, extractedText, fileType }
    });

    // 2. Generate playbook steps using GPT-4o
    const generatedSteps = await step.run("generate-steps", async () => {
      // System prompt:
      // "You are a review playbook generator. Given the following documents,
      //  create a step-by-step review checklist. Each step should be actionable,
      //  specific, and reference the relevant document sections."
      //
      // Output schema: Array of PlaybookStep objects
    });

    // 3. Save generated steps to the playbook
    await step.run("save-steps", async () => {
      await db.update(playbooks).set({
        steps: generatedSteps,
        isPublished: false, // Draft until user reviews
      }).where(eq(playbooks.id, playbookId));
    });
  },
);
```

### 9.3 Playbook Execution via Workflow Engine

When a playbook run starts, it dynamically creates a workflow definition:

```typescript
// In POST /playbook-runs — after creating the playbookRun record:
// 1. Convert playbook steps to workflow steps
//    - "checklist" → human_review step
//    - "extract" → tool step (vault query tool)
//    - "review" → prompt step (AI analysis) → human_review step
//    - "compare" → tool step (multi-doc comparison)
//    - "flag" → prompt step (condition evaluation) → branch step

// 2. Create a temporary workflowDefinition
// 3. Trigger workflow execution via Inngest
// 4. Link playbookRun.workflowExecutionId to the execution
```

### 9.4 API Endpoints

**File:** `artifacts/api-server/src/routes/playbooks.ts`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/playbooks` | List playbooks (filterable by category, isTemplate) |
| `GET` | `/playbooks/:id` | Get playbook with steps |
| `POST` | `/playbooks` | Create playbook (manual or trigger AI generation) |
| `PATCH` | `/playbooks/:id` | Update playbook (edit steps, publish) |
| `DELETE` | `/playbooks/:id` | Delete playbook |
| `POST` | `/playbooks/:id/generate` | Trigger AI generation from source documents |
| `POST` | `/playbooks/:id/version` | Create new version (copies current, increments version) |
| `GET` | `/playbooks/:id/versions` | List all versions of a playbook |
| `POST` | `/playbook-runs` | Start a playbook run against target documents |
| `GET` | `/playbook-runs` | List runs (filterable by status, playbookId) |
| `GET` | `/playbook-runs/:id` | Get run with step results |
| `PATCH` | `/playbook-runs/:id/steps/:stepIndex` | Mark a step complete/add notes |

### 9.5 Template Library

Seed the database with built-in playbook templates:

```typescript
const BUILT_IN_TEMPLATES = [
  {
    name: "M&A Due Diligence Checklist",
    category: "due_diligence",
    steps: [
      { index: 0, title: "Corporate Structure Review", type: "extract", ... },
      { index: 1, title: "Financial Statement Analysis", type: "review", ... },
      // ...
    ],
  },
  {
    name: "Contract Review Playbook",
    category: "review",
    steps: [...],
  },
  {
    name: "Compliance Audit Checklist",
    category: "compliance",
    steps: [...],
  },
];
```

Run seed via migration or on first org setup.

### 9.6 Frontend Changes

**New pages:**

| Page | Route | Purpose |
|---|---|---|
| `playbooks.tsx` | `/playbooks` | Playbook library with templates and custom playbooks |
| `playbook-builder.tsx` | `/playbooks/new` | Create/edit playbook with drag-and-drop step editor |
| `playbook-run.tsx` | `/playbooks/runs/:id` | Execute a playbook — step-by-step guided workflow with checklist |

**New components:**

| Component | Purpose |
|---|---|
| `components/playbooks/step-editor.tsx` | Drag-and-drop step configuration |
| `components/playbooks/checklist-tracker.tsx` | Visual progress bar with step statuses |
| `components/playbooks/step-result-card.tsx` | Shows AI analysis results or extraction data for a step |
| `components/playbooks/template-card.tsx` | Card for browsing template library |
| `components/playbooks/generate-dialog.tsx` | Upload documents → AI generates playbook |

### 9.7 Integration Points

- **F1 (Workflows):** Playbook execution is backed by the workflow engine
- **F2 (Vault Query):** "extract" and "compare" steps query the vault
- **F4 (Collaboration):** Playbook runs can be shared; steps support comments

### 9.8 Testing Approach

1. **AI generation test**: mock OpenAI, verify generated steps match expected schema
2. **Playbook-to-workflow conversion test**: verify step types map correctly
3. **Run execution test**: start run, complete steps manually, verify progress tracking
4. **Versioning test**: create version, verify parent chain
5. **Template seeding test**: verify built-in templates load correctly

---

## 10. Feature 6 — Full-Text Search (Hybrid)

**Effort:** 3–5 days
**Priority:** P1 — Unblocks hybrid search in vault querying

### 10.1 Database Schema Changes

**Modify `lib/db/src/schema/documents.ts`:**

Add a tsvector column to the `documents` table:

```typescript
// Add to documents table
searchVector: customType<{ data: string; driverData: string }>({
  dataType() { return "tsvector"; },
  toDriver(value: string) { return value; },
  fromDriver(value: string) { return value; },
})("search_vector"),
```

**Add to `documentChunks` table:**

```typescript
// Each chunk also gets a tsvector for granular full-text search
chunkSearchVector: customType<{ data: string; driverData: string }>({
  dataType() { return "tsvector"; },
  toDriver(value: string) { return value; },
  fromDriver(value: string) { return value; },
})("chunk_search_vector"),
```

**Migration SQL (run via Drizzle migration):**

```sql
-- Add tsvector columns
ALTER TABLE documents ADD COLUMN search_vector tsvector;
ALTER TABLE document_chunks ADD COLUMN chunk_search_vector tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);
CREATE INDEX idx_chunks_search ON document_chunks USING GIN (chunk_search_vector);

-- Populate tsvector from existing data
UPDATE documents SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(extracted_text, '') || ' ' || coalesce(tags, ''));
UPDATE document_chunks SET chunk_search_vector = to_tsvector('english', text);

-- Create trigger to auto-update tsvector on insert/update
CREATE OR REPLACE FUNCTION documents_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.extracted_text, '') || ' ' || coalesce(NEW.tags, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_search_vector
  BEFORE INSERT OR UPDATE OF title, extracted_text, tags ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_trigger();

CREATE OR REPLACE FUNCTION chunks_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.chunk_search_vector := to_tsvector('english', NEW.text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chunks_search_vector
  BEFORE INSERT OR UPDATE OF text ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_search_vector_trigger();
```

### 10.2 Search Implementation

**File:** `artifacts/api-server/src/lib/search.ts`

```typescript
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

/**
 * Full-text search using PostgreSQL tsquery.
 * Returns BM25-style ranked results.
 */
export async function fulltextSearch(options: SearchOptions): Promise<SearchResult[]> {
  const tsquery = sql`plainto_tsquery('english', ${options.query})`;

  // Build WHERE conditions
  // ts_rank_cd provides BM25-like ranking
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
      ${options.projectIds?.length ? sql`AND vp.id = ANY(${options.projectIds})` : sql``}
    ORDER BY ft_score DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `);

  return results.rows.map(mapToSearchResult);
}

/**
 * Semantic search using pgvector cosine distance.
 */
export async function semanticSearch(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
  const threshold = options.semanticThreshold ?? 0.3;

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
      1 - (dc.embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}) AS sem_score
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    LEFT JOIN project_documents pd ON pd.document_id = d.id
    LEFT JOIN vault_projects vp ON vp.id = pd.project_id
    WHERE d.org_id = ${options.orgId}
      AND (dc.embedding <=> ${sql.raw(`'[${queryEmbedding.join(",")}]'::vector`)}) < ${threshold}
      ${options.projectIds?.length ? sql`AND vp.id = ANY(${options.projectIds})` : sql``}
    ORDER BY sem_score DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `);

  return results.rows.map(mapToSearchResult);
}

/**
 * Hybrid search using Reciprocal Rank Fusion (RRF).
 * Combines semantic and full-text results into a single ranked list.
 *
 * RRF score = 1/(k + rank_semantic) + 1/(k + rank_fulltext)
 * where k = 60 (standard RRF constant)
 */
export async function hybridSearch(options: SearchOptions, queryEmbedding: number[]): Promise<SearchResult[]> {
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
  semanticResults.forEach((r, i) => semanticRanks.set(`${r.documentId}-${r.chunkId}`, i + 1));

  const fulltextRanks = new Map<string, number>();
  fulltextResults.forEach((r, i) => fulltextRanks.set(`${r.documentId}-${r.chunkId}`, i + 1));

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
```

### 10.3 API Endpoints

The vault query endpoint (`POST /vault/query` from Feature 2) uses this search library internally based on the `searchMode` parameter. No separate endpoints needed for full-text search alone — it's a mode within the unified search.

**Additional endpoint for search suggestions:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/search/suggest?q=...` | Autocomplete suggestions from document titles and extracted text |

### 10.4 Frontend Changes

**Modify `components/vault/multi-project-search.tsx`** (from Feature 2):
- Add search mode toggle: "Semantic" / "Full-Text" / "Hybrid (recommended)"
- Show score breakdown in results (semantic score vs full-text score)
- Add search filters panel: date range picker, file type checkboxes, tag selector

### 10.5 Integration Points

- **F2 (Vault Query):** This IS the search backend for multi-source vault querying
- **F3 (Integrations):** New documents from synced files must trigger tsvector update (handled by PostgreSQL trigger)

### 10.6 Testing Approach

1. **Full-text search test**: insert documents, query by keywords, verify ranking
2. **Hybrid search test**: verify RRF merges semantic + fulltext correctly
3. **Trigger test**: insert a document, verify tsvector is auto-populated
4. **Filter test**: date range, file type, tags — all narrow results correctly
5. **Performance test**: 50k chunks, verify hybrid search < 1 second
6. **Edge cases**: empty query, no results, special characters in query

---

## 11. Feature 7 — Paid Ads Module

**Effort:** 2–3 months
**Priority:** P3 — Large new domain

> **Scope note:** This module does NOT generate ad copy or creative assets. Users upload their own images, videos, and ad copy. The module focuses on programmatic ad placement/buying, bid and budget optimization using platform AI + GRPHINTEL intel data, performance monitoring, and AI-powered actionable reporting.

### 11.1 Database Schema Changes

**File:** `lib/db/src/schema/ads.ts`

```typescript
import { pgTable, serial, integer, text, timestamp, varchar, jsonb, boolean, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizations } from "./organizations";

/**
 * Ad platform account connections.
 */
export const adAccounts = pgTable(
  "ad_accounts",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    connectedByUserId: varchar("connected_by_user_id").notNull(),
    platform: varchar("platform", { length: 30 }).notNull(), // "meta" | "google" | "tiktok"
    accountId: text("account_id").notNull(), // Platform's account ID
    accountName: text("account_name"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    currency: varchar("currency", { length: 10 }).default("USD"),
    timezone: varchar("timezone", { length: 50 }),
    isActive: boolean("is_active").default(true),
    metadata: jsonb("metadata"), // Platform-specific account info
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ad_account_org").on(table.orgId),
    index("idx_ad_account_platform").on(table.platform),
  ],
);

/**
 * Ad campaigns — cross-platform campaign definitions.
 */
export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: varchar("created_by_user_id").notNull(),
    name: text("name").notNull(),
    objective: varchar("objective", { length: 50 }), // "awareness" | "traffic" | "conversions" | "leads"
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | review | active | paused | completed
    platforms: jsonb("platforms").notNull(), // string[] — which platforms to publish to
    budget: jsonb("budget").notNull(), // { daily?: number, lifetime?: number, currency: string }
    bidStrategy: jsonb("bid_strategy"), // { type: "lowest_cost" | "cost_cap" | "bid_cap" | "target_roas", target?: number }
    targeting: jsonb("targeting"), // { locations, demographics, interests, custom_audiences }
    schedule: jsonb("schedule"), // { startDate, endDate, dayparting }
    intelContext: jsonb("intel_context"), // Vault-sourced intel: competitor data, market signals, audience insights
    workflowExecutionId: integer("workflow_execution_id"), // Linked workflow for approval flow
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_campaign_org").on(table.orgId),
    index("idx_campaign_status").on(table.status),
  ],
);

/**
 * Ad assets — user-uploaded creative files (images, videos, copy) attached to campaigns.
 * Users provide all assets; the platform does NOT generate them.
 */
export const adAssets = pgTable(
  "ad_assets",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(() => adCampaigns.id, { onDelete: "cascade" }),
    uploadedByUserId: varchar("uploaded_by_user_id").notNull(),
    name: text("name").notNull(),
    type: varchar("type", { length: 30 }).notNull(), // "image" | "video" | "carousel" | "text"
    headline: text("headline"),
    primaryText: text("primary_text"),
    description: text("description"),
    callToAction: varchar("call_to_action", { length: 50 }),
    mediaUrls: jsonb("media_urls"), // string[] — GCS URLs for user-uploaded images/videos
    platformVariants: jsonb("platform_variants"), // { meta: {...}, google: {...}, tiktok: {...} } — platform-specific format overrides
    status: varchar("status", { length: 20 }).default("draft"), // draft | active | paused | archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_ad_asset_org").on(table.orgId),
    index("idx_ad_asset_campaign").on(table.campaignId),
  ],
);

/**
 * Ad placements — programmatic placement configurations per campaign.
 * Controls where and how ads are placed using platform AI + intel data.
 */
export const adPlacements = pgTable(
  "ad_placements",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 30 }).notNull(), // "meta" | "google" | "tiktok"
    placementType: varchar("placement_type", { length: 50 }).notNull(), // "feed" | "stories" | "reels" | "search" | "display" | "video" | "shopping"
    isAutomatic: boolean("is_automatic").default(true), // Let platform AI optimize placement
    config: jsonb("config"), // Platform-specific placement options (positions, devices, etc.)
    bidOverride: jsonb("bid_override"), // Placement-specific bid adjustments
    status: varchar("status", { length: 20 }).default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_placement_campaign").on(table.campaignId),
    index("idx_placement_platform").on(table.platform),
  ],
);

/**
 * Platform-specific ad records — tracks what was actually published.
 */
export const adPlatformEntities = pgTable(
  "ad_platform_entities",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    adAccountId: integer("ad_account_id").notNull().references(() => adAccounts.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(() => adCampaigns.id, { onDelete: "set null" }),
    assetId: integer("asset_id").references(() => adAssets.id, { onDelete: "set null" }),
    platform: varchar("platform", { length: 30 }).notNull(),
    entityType: varchar("entity_type", { length: 30 }).notNull(), // "campaign" | "ad_set" | "ad"
    externalId: text("external_id").notNull(), // Platform's entity ID
    externalStatus: varchar("external_status", { length: 30 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_platform_entity_account").on(table.adAccountId),
    index("idx_platform_entity_campaign").on(table.campaignId),
    index("idx_platform_entity_external").on(table.platform, table.externalId),
  ],
);

/**
 * Ad performance metrics — daily aggregated data.
 */
export const adMetrics = pgTable(
  "ad_metrics",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    adAccountId: integer("ad_account_id").notNull().references(() => adAccounts.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").references(() => adCampaigns.id, { onDelete: "set null" }),
    assetId: integer("asset_id").references(() => adAssets.id, { onDelete: "set null" }),
    placementId: integer("placement_id").references(() => adPlacements.id, { onDelete: "set null" }),
    platform: varchar("platform", { length: 30 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    spend: numeric("spend", { precision: 12, scale: 4 }).default("0"),
    conversions: integer("conversions").default(0),
    revenue: numeric("revenue", { precision: 12, scale: 4 }).default("0"),
    ctr: numeric("ctr", { precision: 8, scale: 6 }), // click-through rate
    cpc: numeric("cpc", { precision: 10, scale: 4 }), // cost per click
    cpa: numeric("cpa", { precision: 10, scale: 4 }), // cost per acquisition
    roas: numeric("roas", { precision: 10, scale: 4 }), // return on ad spend
    metadata: jsonb("metadata"), // Platform-specific metrics (frequency, reach, etc.)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_metrics_org_date").on(table.orgId, table.date),
    index("idx_metrics_campaign_date").on(table.campaignId, table.date),
    index("idx_metrics_account_date").on(table.adAccountId, table.date),
    index("idx_metrics_placement").on(table.placementId, table.date),
    index("idx_metrics_platform").on(table.platform),
  ],
);

/**
 * Budget/bid optimization suggestions — AI-generated recommendations
 * powered by platform performance data + GRPHINTEL intel (vault data).
 */
export const budgetOptimizations = pgTable(
  "budget_optimizations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    campaignId: integer("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(), // "increase_budget" | "decrease_budget" | "pause" | "reallocate" | "adjust_bid" | "shift_placement" | "pause_asset"
    recommendation: text("recommendation").notNull(),
    rationale: text("rationale").notNull(),
    intelSources: jsonb("intel_sources"), // References to vault documents/data that informed this recommendation
    projectedImpact: jsonb("projected_impact"), // { spendChange, roasChange, conversionChange, confidenceLevel }
    actionPayload: jsonb("action_payload"), // Machine-readable action to apply (e.g., { campaignId, newBudget, newBidCap })
    status: varchar("status", { length: 20 }).default("pending"), // pending | accepted | rejected | applied | expired
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_budget_opt_campaign").on(table.campaignId),
    index("idx_budget_opt_status").on(table.status),
  ],
);

/**
 * AI-generated performance reports — periodic analysis with actionable insights.
 */
export const adReports = pgTable(
  "ad_reports",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    reportType: varchar("report_type", { length: 30 }).notNull(), // "daily_summary" | "weekly_review" | "campaign_analysis" | "optimization_report"
    dateRange: jsonb("date_range").notNull(), // { from: string, to: string }
    campaignIds: jsonb("campaign_ids"), // number[] — scope of the report (null = all)
    summary: text("summary").notNull(), // AI-generated executive summary
    insights: jsonb("insights").notNull(), // Array of { type, title, description, severity, actionable, suggestedAction }
    metrics: jsonb("metrics").notNull(), // Aggregated metrics snapshot
    intelCorrelations: jsonb("intel_correlations"), // How vault intel data correlates with performance
    status: varchar("status", { length: 20 }).default("generated"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_ad_report_org").on(table.orgId),
    index("idx_ad_report_type").on(table.reportType),
  ],
);

// Insert schemas
export const insertAdAccountSchema = createInsertSchema(adAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdCampaignSchema = createInsertSchema(adCampaigns).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export const insertAdAssetSchema = createInsertSchema(adAssets).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type AdAccount = typeof adAccounts.$inferSelect;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type AdAsset = typeof adAssets.$inferSelect;
export type AdPlacement = typeof adPlacements.$inferSelect;
export type AdMetrics = typeof adMetrics.$inferSelect;
export type BudgetOptimization = typeof budgetOptimizations.$inferSelect;
export type AdReport = typeof adReports.$inferSelect;
```

Add to `lib/db/src/schema/index.ts`:
```typescript
export * from "./ads";
```

### 11.2 Platform API Clients

**File structure:**

```
artifacts/api-server/src/lib/ad-platforms/
├── meta.ts          # Meta Marketing API (Facebook/Instagram)
├── google-ads.ts    # Google Ads API
├── tiktok.ts        # TikTok Marketing API
├── types.ts         # Shared types across platforms
└── index.ts         # Platform adapter registry
```

Each platform client implements a common interface:

```typescript
// types.ts
export interface AdPlatformClient {
  // Authentication
  exchangeToken(code: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;

  // Account
  getAccounts(accessToken: string): Promise<AdAccountInfo[]>;

  // Campaigns & Ad Sets
  createCampaign(accessToken: string, accountId: string, config: CampaignConfig): Promise<string>;
  updateCampaign(accessToken: string, campaignId: string, updates: Partial<CampaignConfig>): Promise<void>;
  pauseCampaign(accessToken: string, campaignId: string): Promise<void>;

  // Asset Upload & Ad Creation (user-provided assets)
  uploadAsset(accessToken: string, accountId: string, asset: AssetUploadConfig): Promise<string>;
  createAd(accessToken: string, adSetId: string, assetIds: string[], adConfig: AdConfig): Promise<string>;

  // Placement & Bidding
  updateBidStrategy(accessToken: string, campaignId: string, bidStrategy: BidStrategyConfig): Promise<void>;
  updateBudget(accessToken: string, campaignId: string, budget: BudgetConfig): Promise<void>;

  // Metrics
  getMetrics(accessToken: string, accountId: string, dateRange: DateRange): Promise<MetricsData[]>;
  getPlacementBreakdown(accessToken: string, campaignId: string, dateRange: DateRange): Promise<PlacementMetrics[]>;
}
```

### 11.3 Programmatic Placement & Bidding Engine

**File:** `artifacts/api-server/src/lib/ad-platforms/placement-engine.ts`

The placement engine leverages platform AI capabilities combined with GRPHINTEL vault intel data to optimize where and how ads are placed:

```typescript
// 1. Query vault for competitor intel, market signals, audience research
// 2. Analyze historical campaign performance from adMetrics
// 3. Build placement recommendations per platform:
//    - Which placement types to enable/disable (feed, stories, search, display)
//    - Device targeting adjustments
//    - Dayparting recommendations based on performance patterns
// 4. Configure platform-native AI optimization (e.g., Meta Advantage+, Google Smart Bidding)
//    with guardrails derived from intel data
```

**File:** `artifacts/api-server/src/lib/ad-platforms/bid-optimizer.ts`

```typescript
// Bid optimization loop:
// 1. Load last 14 days of metrics per campaign + placement
// 2. Identify underperforming and overperforming segments
// 3. Query vault for relevant intel (competitor pricing, market trends)
// 4. Calculate optimal bid adjustments:
//    - Raise bids on high-ROAS placements
//    - Lower or pause bids on unprofitable segments
//    - Shift budget between platforms based on relative performance
// 5. Generate recommendations with intel-backed rationale
```

### 11.4 Campaign Publishing Workflow

Publishing a campaign uses the workflow engine (F1):

1. **Draft** → Configure placements + upload assets + set targeting/budget
2. **Review** → Human review of campaign config (human_review step)
3. **Compliance** → Platform policy validation (tool step — validate against platform policies)
4. **Publish** → Upload assets + create campaign on platforms (tool step — API calls to Meta/Google/TikTok)
5. **Live** → Monitor performance + trigger optimization loop

### 11.5 Metrics Sync

**Inngest cron function:** `artifacts/api-server/src/inngest/functions/ads-metrics-sync.ts`

```typescript
export const adsMetricsSyncFunction = inngest.createFunction(
  { id: "ads-metrics-sync" },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    // 1. Find all active ad accounts
    // 2. For each account, fetch metrics from platform API
    // 3. Upsert into adMetrics table
    // 4. Compute derived metrics (CTR, CPC, CPA, ROAS)
  },
);
```

### 11.6 Budget & Bid Optimization Engine

**Inngest scheduled function:** `artifacts/api-server/src/inngest/functions/ads-budget-optimize.ts`

Runs daily, analyzes metrics trends + vault intel, generates actionable recommendations:

```typescript
// 1. Load last 14 days of metrics per campaign, per placement, per asset
// 2. Calculate trends (ROAS trend, spend efficiency, CPA trajectory)
// 3. Query vault for relevant intel (competitor spend signals, market shifts, audience data)
// 4. Use GPT-4o to generate natural-language recommendations with intel-backed rationale:
//    - "Pause ad set X — CPA increased 40% over 7 days, competitor Y launched similar campaign"
//    - "Shift $500/day from Meta feed to Google Search — Search ROAS is 3.2x vs Feed 1.1x"
//    - "Increase bid cap on TikTok by 15% — audience engagement trending up per market data"
// 5. Store in budgetOptimizations table with machine-readable actionPayload
// 6. Notify via SSE/activity feed
```

**Inngest scheduled function:** `artifacts/api-server/src/inngest/functions/ads-auto-optimize.ts`

Runs every 6 hours for campaigns with auto-optimization enabled:

```typescript
// 1. Check campaigns with autoOptimize: true
// 2. Apply non-destructive optimizations within user-set guardrails:
//    - Shift budget between ad sets (within ±20% of original)
//    - Adjust bids within user-defined min/max range
//    - Pause assets below minimum ROAS threshold
// 3. Log all changes to audit trail
// 4. Generate summary notification
```

### 11.7 AI-Powered Reporting

**Inngest scheduled function:** `artifacts/api-server/src/inngest/functions/ads-report-generate.ts`

```typescript
// 1. Aggregate metrics for the reporting period
// 2. Query vault for relevant intel context (competitor data, market signals)
// 3. Use GPT-4o to generate:
//    - Executive summary of campaign performance
//    - Specific actionable insights (e.g., "pause this ad set", "shift budget to X")
//    - Correlations between intel data and performance changes
//    - Projected outcomes if recommendations are followed
// 4. Store in adReports table
// 5. Notify stakeholders via activity feed
```

### 11.8 API Endpoints

**File:** `artifacts/api-server/src/routes/ads/`

Split into sub-route files:

**`ads/accounts.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/accounts` | List connected ad accounts |
| `POST` | `/ads/accounts/connect/:platform` | Start OAuth for ad platform |
| `GET` | `/ads/accounts/callback/:platform` | OAuth callback |
| `DELETE` | `/ads/accounts/:id` | Disconnect ad account |

**`ads/campaigns.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/campaigns` | List campaigns (filterable by status, platform) |
| `GET` | `/ads/campaigns/:id` | Get campaign with assets, placements, and metrics |
| `POST` | `/ads/campaigns` | Create campaign draft |
| `PATCH` | `/ads/campaigns/:id` | Update campaign (targeting, budget, bid strategy, schedule) |
| `POST` | `/ads/campaigns/:id/publish` | Start publishing workflow |
| `POST` | `/ads/campaigns/:id/pause` | Pause active campaign |
| `POST` | `/ads/campaigns/:id/intel-context` | Attach vault intel data to campaign for optimization |

**`ads/assets.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/campaigns/:campaignId/assets` | List user-uploaded assets for a campaign |
| `POST` | `/ads/assets/upload` | Upload user-provided image/video/copy (multipart form) |
| `PATCH` | `/ads/assets/:id` | Update asset metadata (headline, copy, CTA) |
| `DELETE` | `/ads/assets/:id` | Remove an asset |

**`ads/placements.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/campaigns/:campaignId/placements` | List placement configs for a campaign |
| `POST` | `/ads/placements` | Create placement config |
| `PATCH` | `/ads/placements/:id` | Update placement (bid override, targeting) |
| `DELETE` | `/ads/placements/:id` | Remove a placement |

**`ads/metrics.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/metrics/dashboard` | Aggregated metrics across all accounts |
| `GET` | `/ads/metrics/campaign/:id` | Campaign-level metrics with date range |
| `GET` | `/ads/metrics/asset/:id` | Per-asset performance |
| `GET` | `/ads/metrics/placement/:id` | Per-placement performance |
| `GET` | `/ads/metrics/compare` | Compare campaigns, assets, or placements side-by-side |

**`ads/optimizations.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/optimizations` | List pending optimization recommendations |
| `GET` | `/ads/optimizations/:id` | Get recommendation detail with intel sources |
| `POST` | `/ads/optimizations/:id/accept` | Accept and apply a recommendation (executes actionPayload) |
| `POST` | `/ads/optimizations/:id/reject` | Reject a recommendation with optional reason |

**`ads/reports.ts`:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/ads/reports` | List generated reports |
| `GET` | `/ads/reports/:id` | Get full report with insights and metrics |
| `POST` | `/ads/reports/generate` | Trigger on-demand report generation |

### 11.9 Frontend Changes

**New pages:**

| Page | Route | Purpose |
|---|---|---|
| `ads-dashboard.tsx` | `/ads` | Performance overview with charts (ROAS, CPA, CTR, spend), active recommendations, recent reports |
| `ads-campaigns.tsx` | `/ads/campaigns` | Campaign list with status badges and key metrics |
| `ads-campaign-builder.tsx` | `/ads/campaigns/new` | Step-by-step wizard: objective → targeting → budget/bidding → upload assets → placements → review |
| `ads-campaign-view.tsx` | `/ads/campaigns/:id` | Campaign detail with assets, placements, metrics, optimizations |
| `ads-reports.tsx` | `/ads/reports` | AI-generated performance reports with actionable insights |
| `ads-accounts.tsx` | `/ads/accounts` | Manage ad platform connections |

**New components:**

| Component | Purpose |
|---|---|
| `components/ads/performance-chart.tsx` | Recharts line/bar chart for metrics over time (ROAS, CPA, CTR, spend) |
| `components/ads/metric-card.tsx` | KPI card with trend indicator |
| `components/ads/campaign-wizard/` | Multi-step wizard: objective → targeting → budget/bidding → upload assets → placements → review |
| `components/ads/asset-uploader.tsx` | Drag-and-drop file upload for images/videos with copy input fields |
| `components/ads/asset-card.tsx` | Display uploaded asset with performance metrics |
| `components/ads/placement-config.tsx` | Configure placements per platform (automatic vs manual, bid overrides) |
| `components/ads/optimization-card.tsx` | Recommendation card with accept/reject, rationale, intel sources, projected impact |
| `components/ads/report-viewer.tsx` | Render AI-generated report with insights, charts, and action buttons |
| `components/ads/platform-badge.tsx` | Badge showing Meta/Google/TikTok with status |
| `components/ads/intel-context-panel.tsx` | Panel showing vault intel data attached to campaign |

### 11.10 Integration Points

- **F1 (Workflows):** Campaign publishing uses workflow engine for approval flow
- **F2 (Vault Query):** Optimization engine queries vault for competitor intel, market signals, and audience data to inform bid/budget recommendations
- **F4 (Collaboration):** Campaign review uses shared spaces; team comments on campaigns and optimization recommendations
- **F3 (Integrations):** Ad platform connections use the same OAuth infrastructure

### 11.11 Testing Approach

1. **Platform client tests**: mock each API (Meta, Google, TikTok), verify campaign CRUD, asset upload, bid/budget updates
2. **Asset upload test**: verify file upload to GCS, metadata storage, platform variant generation
3. **Publishing workflow test**: end-to-end from draft → upload assets → configure placements → review → publish
4. **Metrics sync test**: mock API responses, verify correct aggregation and derived metrics (CTR, CPC, CPA, ROAS)
5. **Bid optimization test**: seed 14-day metrics history + vault intel, verify recommendations are generated with correct rationale
6. **Auto-optimization test**: verify guardrails are respected (budget shifts stay within ±20%, bids within min/max)
7. **Report generation test**: mock metrics + vault data, verify AI report contains actionable insights
8. **Dashboard tests**: verify aggregation queries return correct numbers across platforms
9. **Cross-platform test**: campaign published to 2+ platforms simultaneously, metrics aggregated correctly

---

## 12. Risk Assessment

| Feature | Risk Level | Key Risks | Mitigation |
|---|---|---|---|
| **F1: Workflows** | Medium | Inngest function complexity; long-running human review timeouts | Use Inngest's built-in step retries; implement timeout handling with 7-day default; comprehensive error recording |
| **F2: Vault Query** | Low | Query performance at scale | Add EXPLAIN ANALYZE benchmarks; consider materialized views for hot queries; pagination with cursor-based approach for large result sets |
| **F3: Integrations** | High | OAuth token refresh failures; API rate limits; webhook reliability | Token refresh retry logic with exponential backoff; health monitoring with automatic disable after N failures; webhook renewal cron job |
| **F4: Collaboration** | Medium | Real-time presence scalability; guest access security | SSE with PostgreSQL LISTEN/NOTIFY is simple but caps at ~1000 concurrent connections per server — add Redis pub/sub if needed; guest tokens are time-limited with strict resource scoping |
| **F5: Playbooks** | Low | AI-generated playbooks may be low quality | Always generate as draft; require human review before publishing; allow manual editing of generated steps |
| **F6: Full-Text Search** | Low | tsvector maintenance overhead; GIN index size | PostgreSQL triggers handle automatic maintenance; GIN indexes are efficient for read-heavy workloads; monitor index size |
| **F7: Paid Ads** | Very High | Three external APIs with different schemas; ad platform policy compliance; budget handling with real money; auto-optimization guardrail failures | Start with Meta only, add Google/TikTok incrementally; implement platform-specific validation before publish; budget changes always require human approval unless auto-optimize is explicitly enabled with guardrails; sandbox/test mode for development; audit log all automated bid/budget changes |

### Critical Dependencies on External Services

| Service | Risk | Fallback |
|---|---|---|
| Inngest | If Inngest is down, no workflows execute | Queue events in PostgreSQL; replay when Inngest recovers |
| OpenAI GPT-4o | AI features degrade | Graceful error messages; cache common results; consider fallback model |
| Google Drive API | File sync stops | Retry with exponential backoff; health status shows degraded |
| Ad Platform APIs | Campaign management unavailable | Read-only mode for metrics; queue publish actions for retry |

---

## 13. Migration & Rollback Strategy

### General Approach

All schema changes use Drizzle ORM migrations:

```bash
# Generate migration
pnpm --filter @workspace/db drizzle-kit generate

# Apply migration
pnpm --filter @workspace/db drizzle-kit migrate

# Rollback: each migration has a corresponding down migration
```

### Per-Feature Migration Plan

**F1 (Workflows):**
- Migration 1: Add `retryCount`, `maxRetries` to `workflowExecutionSteps`
- Migration 2: Create `humanReviews` table
- Rollback: Drop `humanReviews`, remove columns (non-destructive — existing data preserved)

**F2 (Vault Query):**
- Migration 1: Create `savedVaultQueries` table
- Rollback: Drop table (no data dependencies)

**F3 (Integrations):**
- Migration 1: Create `integrationWebhooks` table
- Migration 2: Add health columns to `integrations`
- Rollback: Drop table, remove columns (existing integrations continue working without health monitoring)

**F4 (Collaboration):**
- Migration 1: Create `resourceShares`, `comments`, `guestTokens`, `activityFeed`, `userPresence` tables
- Rollback: Drop all tables (no existing features depend on these)

**F5 (Playbooks):**
- Migration 1: Create `playbooks`, `playbookRuns` tables
- Rollback: Drop tables

**F6 (Full-Text Search):**
- Migration 1: Add `search_vector` to `documents`, `chunk_search_vector` to `document_chunks`
- Migration 2: Create GIN indexes and triggers
- Migration 3: Backfill tsvectors from existing data
- Rollback: Drop triggers, indexes, columns (semantic search continues working independently)

**F7 (Paid Ads):**
- Migration 1: Create `adAccounts`, `adCampaigns`, `adAssets`, `adPlacements`, `adPlatformEntities`, `adMetrics`, `budgetOptimizations`, `adReports`
- Rollback: Drop all tables (isolated module)

### Deployment Order

Each feature can be deployed independently behind feature flags. Recommended deploy sequence follows the implementation order (Phase 1 → 2 → 3 → 4). Within each phase, features can be deployed as they are completed.

**Feature flag pattern:**

```typescript
// Environment variable per feature
FEATURE_WORKFLOW_ENGINE=true
FEATURE_MULTI_VAULT_QUERY=true
FEATURE_REAL_INTEGRATIONS=true
FEATURE_COLLABORATION=true
FEATURE_PLAYBOOKS=true
FEATURE_FULLTEXT_SEARCH=true
FEATURE_ADS_MODULE=true
```

Routes and frontend pages conditionally render based on flags. This allows incremental rollout and quick rollback by flipping a flag.

---

## Appendix A: Environment Variables Required

```bash
# Existing
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GCS_BUCKET_NAME=...
GOOGLE_APPLICATION_CREDENTIALS=...

# F1: Workflow Engine
INNGEST_EVENT_KEY=...        # Inngest event key
INNGEST_SIGNING_KEY=...      # Inngest signing key (for serve endpoint)

# F3: Integrations
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
SHAREPOINT_CLIENT_ID=...
SHAREPOINT_CLIENT_SECRET=...
BOX_CLIENT_ID=...
BOX_CLIENT_SECRET=...
DROPBOX_CLIENT_ID=...
DROPBOX_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# F7: Paid Ads
META_APP_ID=...
META_APP_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
TIKTOK_APP_ID=...
TIKTOK_APP_SECRET=...
```

## Appendix B: New Package Dependencies

```json
// artifacts/api-server/package.json — additions
{
  "inngest": "^3.x",
  "googleapis": "^140.x",
  "google-auth-library": "^9.x"
}

// For F7 (added later):
{
  "facebook-nodejs-business-sdk": "^19.x",
  "google-ads-api": "^14.x"
}
```

## Appendix C: File Index

Summary of all new files to be created, organized by feature:

```
// Shared Infrastructure
artifacts/api-server/src/inngest/client.ts
artifacts/api-server/src/inngest/events.ts
artifacts/api-server/src/inngest/index.ts
artifacts/api-server/src/routes/webhooks.ts
artifacts/api-server/src/routes/sse.ts
artifacts/api-server/src/lib/oauth-tokens.ts
lib/db/src/schema/realtime.ts

// F1: Workflow Engine
artifacts/api-server/src/inngest/functions/workflow-execute.ts
artifacts/api-server/src/inngest/steps/prompt-step.ts
artifacts/api-server/src/inngest/steps/tool-step.ts
artifacts/api-server/src/inngest/steps/branch-step.ts
artifacts/api-server/src/inngest/steps/loop-step.ts
artifacts/api-server/src/routes/human-reviews.ts
lib/db/src/schema/human-reviews.ts
artifacts/stratix/src/pages/human-reviews.tsx
artifacts/stratix/src/components/workflow/execution-timeline.tsx
artifacts/stratix/src/components/workflow/human-review-dialog.tsx
artifacts/stratix/src/components/workflow/step-output-viewer.tsx

// F2: Multi-Source Vault Querying
artifacts/api-server/src/routes/vault-query.ts
lib/db/src/schema/vault-queries.ts
artifacts/stratix/src/pages/vault-search.tsx
artifacts/stratix/src/components/vault/multi-project-search.tsx
artifacts/stratix/src/components/vault/search-result-card.tsx
artifacts/stratix/src/components/vault/project-picker.tsx

// F3: Real Integrations
artifacts/api-server/src/lib/providers/google-drive.ts
artifacts/api-server/src/lib/providers/sharepoint.ts
artifacts/api-server/src/lib/providers/box.ts
artifacts/api-server/src/lib/providers/dropbox.ts
artifacts/api-server/src/lib/providers/slack.ts
artifacts/api-server/src/inngest/functions/integration-sync.ts
artifacts/api-server/src/inngest/functions/integration-sync-file.ts
lib/db/src/schema/integration-webhooks.ts
artifacts/stratix/src/components/integrations/folder-browser.tsx
artifacts/stratix/src/components/integrations/sync-progress.tsx
artifacts/stratix/src/components/integrations/health-badge.tsx
artifacts/stratix/src/components/integrations/provider-card.tsx

// F4: Shared Spaces / Collaboration
artifacts/api-server/src/routes/sharing.ts
artifacts/api-server/src/routes/comments.ts
artifacts/api-server/src/routes/activity.ts
artifacts/api-server/src/routes/guests.ts
artifacts/api-server/src/middleware/guestMiddleware.ts
lib/db/src/schema/collaboration.ts
artifacts/stratix/src/pages/shared-with-me.tsx
artifacts/stratix/src/pages/activity.tsx (new page — distinct from existing analytics.tsx)
artifacts/stratix/src/components/collaboration/share-dialog.tsx
artifacts/stratix/src/components/collaboration/comment-thread.tsx
artifacts/stratix/src/components/collaboration/comment-input.tsx
artifacts/stratix/src/components/collaboration/presence-avatars.tsx
artifacts/stratix/src/components/collaboration/activity-item.tsx
artifacts/stratix/src/components/collaboration/guest-invite-dialog.tsx

// F5: Playbook Generation
artifacts/api-server/src/routes/playbooks.ts
artifacts/api-server/src/inngest/functions/playbook-generate.ts
lib/db/src/schema/playbooks.ts
artifacts/stratix/src/pages/playbooks.tsx
artifacts/stratix/src/pages/playbook-builder.tsx
artifacts/stratix/src/pages/playbook-run.tsx
artifacts/stratix/src/components/playbooks/step-editor.tsx
artifacts/stratix/src/components/playbooks/checklist-tracker.tsx
artifacts/stratix/src/components/playbooks/step-result-card.tsx
artifacts/stratix/src/components/playbooks/template-card.tsx
artifacts/stratix/src/components/playbooks/generate-dialog.tsx

// F6: Full-Text Search
artifacts/api-server/src/lib/search.ts
(Migration SQL for tsvector columns, GIN indexes, triggers)

// F7: Paid Ads Module
artifacts/api-server/src/lib/ad-platforms/meta.ts
artifacts/api-server/src/lib/ad-platforms/google-ads.ts
artifacts/api-server/src/lib/ad-platforms/tiktok.ts
artifacts/api-server/src/lib/ad-platforms/types.ts
artifacts/api-server/src/lib/ad-platforms/index.ts
artifacts/api-server/src/lib/ad-platforms/placement-engine.ts
artifacts/api-server/src/lib/ad-platforms/bid-optimizer.ts
artifacts/api-server/src/routes/ads/accounts.ts
artifacts/api-server/src/routes/ads/campaigns.ts
artifacts/api-server/src/routes/ads/assets.ts
artifacts/api-server/src/routes/ads/placements.ts
artifacts/api-server/src/routes/ads/metrics.ts
artifacts/api-server/src/routes/ads/optimizations.ts
artifacts/api-server/src/routes/ads/reports.ts
artifacts/api-server/src/inngest/functions/ads-metrics-sync.ts
artifacts/api-server/src/inngest/functions/ads-budget-optimize.ts
artifacts/api-server/src/inngest/functions/ads-auto-optimize.ts
artifacts/api-server/src/inngest/functions/ads-campaign-publish.ts
artifacts/api-server/src/inngest/functions/ads-report-generate.ts
lib/db/src/schema/ads.ts
artifacts/stratix/src/pages/ads-dashboard.tsx
artifacts/stratix/src/pages/ads-campaigns.tsx
artifacts/stratix/src/pages/ads-campaign-builder.tsx
artifacts/stratix/src/pages/ads-campaign-view.tsx
artifacts/stratix/src/pages/ads-reports.tsx
artifacts/stratix/src/pages/ads-accounts.tsx
artifacts/stratix/src/components/ads/performance-chart.tsx
artifacts/stratix/src/components/ads/metric-card.tsx
artifacts/stratix/src/components/ads/campaign-wizard/
artifacts/stratix/src/components/ads/asset-uploader.tsx
artifacts/stratix/src/components/ads/asset-card.tsx
artifacts/stratix/src/components/ads/placement-config.tsx
artifacts/stratix/src/components/ads/optimization-card.tsx
artifacts/stratix/src/components/ads/report-viewer.tsx
artifacts/stratix/src/components/ads/platform-badge.tsx
artifacts/stratix/src/components/ads/intel-context-panel.tsx
```
