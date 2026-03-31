# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## Stratix Intelligence Platform

A full-stack strategic intelligence platform for executives. Frontend at `artifacts/stratix`, API at `artifacts/api-server`.

### Visual Theme (Harvey/Cadastral aesthetic)
- Near-black background: `#0D0C0B` everywhere (sidebar and main same color)
- Off-white foreground: `#E8E4DC`
- No orange accents — primary action buttons are off-white with black text
- Zero border radius on all components (`border-radius: 0 !important`)
- Fonts: Cormorant Garamond (serif headings), Inter (sans body)

### Key Features
- **Team Collaboration & Workspaces**: Organizations with shared data. Users create or join an org on first login. All content (conversations, reports, workflows, company profile) is org-scoped and shared with all team members. Two roles: Admin (can invite/remove) and Member.
- **Company Intelligence Profile** (`company_profiles` DB table): Org-scoped company context (company name, industry, stage, revenue range, competitors, priorities). Shared across all org members. Context injected into all AI chats and reports.
- **Org Setup flow** (`/org-setup`): New users without an org are redirected here to create their organization before proceeding to onboarding
- **Onboarding flow** (`/onboarding`): Multi-step intake form if org has no company profile
- **Team Settings** (`/settings/team`): Admin can view all members, their roles and join dates, generate invite links, and remove members. Invite links are 7-day-expiring UUIDs.
- **Invite flow** (`/api/join?token=xxx`): Admin creates invite → link sent to team member → member clicks link and is added to org
- **Company profile page** (`/profile`): Edit company context from sidebar user menu (org-scoped)
- **Contextual dashboard**: Shows company profile strip, workflow quick-launch buttons, recent intelligence
- **Chat "Engagements"**: Renamed from "Strategic Advisor", org-scoped conversations, persistent context bar, suggested starters, document attachment via paperclip button
- **Reports**: Org-scoped, editorial list view, commission form with framework selection grid, publication-quality report viewer
- **Landing page**: Cinematic full-bleed hero with Unsplash boardroom image, flat editorial header
- **Workflow Agents** (`/workflows`): Library of 6 pre-built AI agent templates. Org-scoped. Each has a focused intake form (2-4 questions), executes as SSE streaming, and saves completed runs to history. Templates: Board Deck Audit, Competitor Deep-Dive, Market Entry Analysis, M&A Target Evaluation, Series B/Growth Narrative, Quarterly Strategy Brief.
- **Knowledge Vault** (`/knowledge`): Upload PDFs and DOCX files, stored in Replit Object Storage (GCS), extracted server-side with pdf-parse/mammoth. Document library with status badges (Processing, Ready, Failed). Documents can be attached to conversations (up to 5). Extracted text injected into AI system prompt. AI responses include "Sources:" attribution.

### DB Schema
- `organizations` — orgs with name and slug
- `org_members` — userId, orgId, role (admin|member), joinedAt
- `org_invites` — UUID tokens with expiry for team invites
- `company_profiles` — one per org (orgId unique), stores shared company context
- `conversations` — chat conversations (renamed "Engagements" in UI), org-scoped
- `messages` — chat messages
- `reports` — generated intelligence reports, org-scoped
- `workflow_runs` — workflow agent run history (templateKey, inputs as jsonb, output, status), org-scoped
- `documents` — uploaded documents (id, userId, title, fileType, objectKey, extractedText, status)
- `conversation_documents` — join table linking conversations to documents (conversationId, documentId)

### Object Storage
- Provisioned Replit Object Storage (GCS-backed) for document files
- Files uploaded via presigned URL flow: client requests URL from `/api/storage/uploads/request-url`, uploads directly to GCS, then registers document metadata with `/api/documents`
- Server routes: `artifacts/api-server/src/lib/objectStorage.ts`, `src/lib/objectAcl.ts`, `src/routes/storage.ts`

### API Routes
- `GET /api/org` — get current user's organization
- `POST /api/org` — create organization (first-time users)
- `GET /api/org/members` — list org members with user details
- `DELETE /api/org/members/:userId` — remove a member (admin only)
- `GET /api/org/invites` — list pending invites (admin only)
- `POST /api/org/invites` — create invite link (admin only)
- `DELETE /api/org/invites/:id` — revoke invite (admin only)
- `GET /api/join?token=xxx` — join org via invite token
- `GET/POST/PUT /api/company-profile` — CRUD for org company profile
- `GET /api/openai/conversations` — list engagements (org-scoped)
- `POST /api/openai/conversations` — create engagement
- `POST /api/openai/conversations/:id/messages` — send message (SSE stream, injects linked document text)
- `POST /api/reports` — generate report (SSE stream, injects company context)
- `GET /api/dashboard/summary` — dashboard stats
- `GET /api/workflows/templates` — list 6 workflow templates (no auth)
- `GET /api/workflows` — list org's workflow runs
- `POST /api/workflows` — launch workflow run (SSE stream)
- `GET /api/workflows/:id` — get workflow run detail
- `GET /api/documents` — list user's documents
- `POST /api/documents` — register new document after upload
- `DELETE /api/documents/:id` — delete document
- `POST /api/documents/:id/process` — extract text from document (pdf-parse / mammoth)
- `GET /api/conversations/:id/documents` — list documents linked to a conversation
- `POST /api/conversations/:id/documents` — link document to conversation
- `DELETE /api/conversations/:id/documents` — unlink document from conversation
- `POST /api/storage/uploads/request-url` — request presigned GCS upload URL
