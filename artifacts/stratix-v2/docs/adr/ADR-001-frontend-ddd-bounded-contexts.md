# ADR-001: Frontend DDD Bounded Contexts

## Status
Accepted

## Context
Stratix V2 has 37 pages in a flat `src/pages/` directory. The App.tsx already groups routes by comment blocks (INTELLIGENCE, OPERATIONS, KNOWLEDGE, ADMIN, SETTINGS & USER), but there is no enforced boundary between these domains. As the product grows -- especially as integration depth with CRM/Gong/Salesforce becomes the core differentiator -- we need clear ownership boundaries so that each domain can evolve independently without accidental coupling.

A flat page directory also makes it hard for developers to reason about which API hooks, shared state, and domain types belong to which feature area.

## Decision
Organize the frontend source code into six DDD bounded contexts, each owning its own pages, domain-specific components, hooks, and types:

```
src/
  contexts/
    auth/           # Landing, Login, OrgSetup, Onboarding
    intelligence/   # Explore, Notebooks, NotebookEdit, Boards, BoardView,
                    # Reports, ReportNew, ReportView
    operations/     # Workflows, WorkflowRunner, WorkflowView, WorkflowBuilder,
                    # WorkflowBuilderEdit, Playbooks, PlaybookEdit, PlaybookRun,
                    # AdsDashboard, AdsCampaignNew, AdsCampaignDetail
    knowledge/      # Knowledge, Context, Vault, VaultSearch, VaultProject, Connections
    admin/          # Analytics, AuditLog
    settings/       # Profile, Team, Security, ActivityFeed, SharedItems
```

Each context directory follows the same internal structure:

```
contexts/<name>/
  pages/            # Route-level page components
  components/       # Domain-specific components (not shared outside context)
  hooks/            # Domain-specific TanStack Query hooks and local state
  types.ts          # Domain types and interfaces
  index.ts          # Public API barrel export
```

Cross-context imports are only allowed through the barrel `index.ts`. Shared UI primitives (`ui/`), layout components, and generic utilities remain in `src/components/` and `src/lib/`.

### Route-to-Context Mapping

| Context | Routes |
|---------|--------|
| **Auth** | `/` (landing), `/login`, `/org-setup`, `/onboarding` |
| **Intelligence** | `/explore`, `/notebooks`, `/notebooks/:id`, `/boards`, `/boards/:id`, `/reports`, `/reports/new`, `/reports/:id` |
| **Operations** | `/workflows`, `/workflows/:id`, `/workflows/new/:key`, `/workflow-builder`, `/workflow-builder/:id`, `/playbooks`, `/playbooks/:id`, `/playbooks/runs/:id`, `/ads`, `/ads/campaigns/new`, `/ads/campaigns/:id` |
| **Knowledge** | `/knowledge`, `/context`, `/vault`, `/vault/search`, `/vault/:id`, `/connections` |
| **Admin** | `/analytics`, `/audit` |
| **Settings** | `/profile`, `/security`, `/settings/team`, `/activity`, `/shared` |

## Consequences

### Positive
- Clear ownership boundaries prevent unintended coupling between domains
- Each context can be developed and tested in isolation
- Lazy loading at the context level improves initial bundle size
- New developers can orient themselves by domain rather than scanning a flat list
- Future extraction into micro-frontends or module federation becomes straightforward

### Negative
- Migration effort: all 37 page files must be moved and imports updated
- Shared components that currently live alongside pages need to be identified and relocated
- Slightly deeper import paths (`@/contexts/intelligence/pages/explore` vs `@/pages/explore`)
- Risk of over-isolation if contexts need to share significant state (mitigated by shared hooks in `src/hooks/`)

### Neutral
- The App.tsx route definitions stay centralized; only the import paths change
- Existing `src/components/ui/` and `src/components/layout/` directories are unaffected

## Options Considered

### Option 1: Keep Flat Pages Directory
- **Pros**: No migration work, simple mental model
- **Cons**: No enforced boundaries, coupling grows with codebase, hard to reason about domain ownership

### Option 2: Group by Feature (Feature Folders)
- **Pros**: Co-locates related files, common React pattern
- **Cons**: No clear hierarchy between features, doesn't map to business domains, "feature" is ambiguous

### Option 3: DDD Bounded Contexts (Chosen)
- **Pros**: Maps directly to business domains, enforced via barrel exports, scales with product growth, matches existing route grouping in App.tsx
- **Cons**: More upfront structure, requires team discipline on cross-context imports

## Related Decisions
- ADR-002: API Integration Strategy (hooks live inside each context)
- ADR-003: Component Architecture (shared vs domain components)

## References
- Existing route grouping in `src/app.tsx` lines 102-148
- Prospect feedback: value is integration depth, not generic AI -- contexts must support deep CRM/Gong integration within Knowledge and Operations
