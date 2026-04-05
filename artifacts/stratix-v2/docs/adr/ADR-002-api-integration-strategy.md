# ADR-002: API Integration Strategy

## Status
Accepted

## Context
Stratix V2 is a React SPA (Vite + wouter + TanStack Query) that talks to an Express 5 backend deployed on Railway. The backend is fully working and exposes a REST API at `/api/*`. The frontend is deployed on Vercel and uses Vercel rewrites to proxy API calls to Railway, avoiding CORS issues.

We need a consistent pattern for how frontend code calls the backend. The current codebase (stratix V1) uses `@workspace/api-client-react` (generated OpenAPI hooks), but V2 needs a lighter, more maintainable approach that aligns with the bounded context structure from ADR-001.

Key constraint from prospect feedback: Stratix must be an "intelligence layer on top of your data." This means the API layer must support deep integration endpoints (Salesforce sync, Gong call imports, CRM pipelines) alongside standard CRUD, without those concerns leaking across contexts.

## Decision
Use a thin API client layer with TanStack Query hooks organized per bounded context, proxied through Vercel rewrites to the Railway backend.

### Architecture

```
Vercel (SPA)  -->  /api/*  -->  Vercel Rewrite  -->  Railway (Express 5)
```

### API Client Structure

```
src/
  lib/
    api-client.ts       # Shared fetch wrapper (base URL, auth headers, error handling)
  contexts/
    intelligence/
      hooks/
        use-reports.ts  # useReports(), useReport(id), useCreateReport()
        use-notebooks.ts
        use-boards.ts
    operations/
      hooks/
        use-workflows.ts
        use-playbooks.ts
        use-ads.ts
    knowledge/
      hooks/
        use-vault.ts
        use-connections.ts  # Salesforce, Gong, CRM integration hooks
    admin/
      hooks/
        use-analytics.ts
        use-audit.ts
    settings/
      hooks/
        use-profile.ts
        use-team.ts
```

### API Client (`src/lib/api-client.ts`)

A single `apiFetch` function that:
1. Prepends `/api` to all paths (handled by Vercel rewrite to Railway)
2. Attaches auth token from cookie/header
3. Handles 401 -> redirect to login
4. Handles structured error responses
5. Returns typed JSON

### TanStack Query Conventions

- **Query keys**: `[context, resource, ...params]` e.g. `['intelligence', 'reports', reportId]`
- **Mutations**: Return the mutated entity for optimistic cache updates
- **Stale time**: 30s for lists, 60s for detail views, 0 for user-specific data
- **Error boundaries**: Per-context error boundaries catch query errors

### Vercel Rewrite (already configured)

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://graphite-intel-production.up.railway.app/api/:path*" }
  ]
}
```

## Consequences

### Positive
- No CORS configuration needed; Vercel rewrite makes API calls same-origin
- TanStack Query provides caching, deduplication, background refresh, and optimistic updates out of the box
- Hooks per context enforce that API concerns stay within their bounded context
- Thin client means no code generation step; hooks are hand-written and typed
- Integration endpoints (Salesforce, Gong) are isolated in `knowledge/hooks/use-connections.ts`

### Negative
- No auto-generated types from OpenAPI spec; API types must be maintained manually (or via a shared types package)
- Each hook must handle loading/error states (mitigated by shared patterns in `api-client.ts`)
- Vercel rewrite adds a small latency hop vs direct Railway calls (negligible in practice)

### Neutral
- Query key conventions must be documented and enforced via code review
- Migration from `@workspace/api-client-react` to hand-written hooks is incremental -- can be done context-by-context

## Options Considered

### Option 1: Generated OpenAPI Client (`@workspace/api-client-react`)
- **Pros**: Auto-generated types, guaranteed API contract match
- **Cons**: Heavy build step, generated code is hard to customize, tight coupling to backend schema changes, V1 already showed pain points with this approach

### Option 2: Thin Fetch Wrapper + TanStack Query Hooks (Chosen)
- **Pros**: Lightweight, flexible, hooks are co-located with their context, easy to customize per-endpoint, no code generation step
- **Cons**: Manual type maintenance, no auto-sync with backend

### Option 3: tRPC or GraphQL Layer
- **Pros**: End-to-end type safety, powerful querying
- **Cons**: Requires backend rewrite, over-engineering for current REST API, adds complexity

## Related Decisions
- ADR-001: Frontend DDD Bounded Contexts (hooks live inside each context)
- ADR-003: Component Architecture (components consume hooks from their own context)

## References
- Vercel rewrite config: `vercel.json`
- Railway backend: `https://graphite-intel-production.up.railway.app`
- TanStack Query v5 docs: https://tanstack.com/query/latest
