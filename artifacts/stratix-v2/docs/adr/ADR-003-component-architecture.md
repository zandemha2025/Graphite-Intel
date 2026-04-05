# ADR-003: Component Architecture

## Status
Accepted

## Context
Stratix V2 needs a clear component hierarchy that supports the bounded context structure (ADR-001) while avoiding duplication. The current V2 codebase already has three component locations:

- `src/components/ui/` -- 9 primitive UI components (button, card, dialog, input, select, skeleton, tabs, tooltip, badge)
- `src/components/layout/` -- Shell component (sidebar + page wrapper)
- `src/components/shared/` -- Cross-cutting components like CommandPalette
- Domain component directories in V1: `boards/`, `charts/`, `collaboration/`, `context/`, `explore/`, `insight/`, `playbook/`, `workflow/`

As the product grows with deep integration features (Salesforce, Gong, CRM), domain-specific components will multiply. We need rules about what lives where.

## Decision
Adopt a three-tier component architecture:

### Tier 1: Shared UI Primitives (`src/components/ui/`)
Low-level, unstyled or minimally styled components. These have zero domain knowledge and are used everywhere.

```
src/components/ui/
  button.tsx
  card.tsx
  dialog.tsx
  input.tsx
  select.tsx
  skeleton.tsx
  tabs.tsx
  tooltip.tsx
  badge.tsx
```

Rules:
- No business logic or API calls
- Accept only generic props (variant, size, disabled, etc.)
- Styled with Tailwind utility classes
- Can be sourced from shadcn/ui or built in-house

### Tier 2: Layout and Cross-Cutting (`src/components/layout/`, `src/components/shared/`)

**Layout components** control page structure:
```
src/components/layout/
  shell.tsx          # Main app shell (sidebar + content area)
  sidebar.tsx        # Navigation sidebar
  page-wrapper.tsx   # Standard page layout (header + content + actions)
  page-header.tsx    # Page title, breadcrumbs, action buttons
```

**Shared components** are used across multiple contexts but contain some domain awareness:
```
src/components/shared/
  command-palette.tsx    # Global Cmd+K search
  save-to-board-dialog.tsx
  empty-state.tsx        # Reusable empty state with icon + CTA
  data-table.tsx         # Generic sortable/filterable table
  rich-text-editor.tsx   # Shared editor for notebooks, reports, playbooks
```

Rules:
- Layout components receive children; they never fetch data
- Shared components may accept domain-typed props but must not import from any single context
- If a shared component only serves one context, move it into that context

### Tier 3: Domain Components (`src/contexts/<name>/components/`)

Components that belong to a single bounded context and encode domain-specific logic:

```
src/contexts/intelligence/components/
  report-card.tsx
  notebook-cell.tsx
  board-grid.tsx
  insight-panel.tsx

src/contexts/operations/components/
  workflow-node.tsx
  workflow-canvas.tsx
  playbook-step.tsx
  campaign-metrics.tsx

src/contexts/knowledge/components/
  vault-file-tree.tsx
  connection-status.tsx    # Salesforce/Gong sync status
  source-preview.tsx
```

Rules:
- Domain components are only imported within their own context
- They may use Tier 1 (ui) and Tier 2 (shared) components freely
- They may call hooks from their own context (ADR-002)
- Cross-context component sharing is done by promoting to Tier 2

### Import Rules (Enforced)

```
Tier 3 (domain) --> Tier 2 (shared/layout) --> Tier 1 (ui)
                                            --> src/lib/*

Cross-context imports: PROHIBITED
  contexts/intelligence/components/ -X-> contexts/operations/components/

Promotion path:
  contexts/X/components/foo.tsx  -->  src/components/shared/foo.tsx
  (when 2+ contexts need the same component)
```

## Consequences

### Positive
- Clear rules eliminate "where does this component go?" decisions
- Domain components stay close to their pages and hooks, improving discoverability
- Tier 1 primitives remain reusable and free of business logic
- Promotion path provides a natural refactoring workflow as patterns emerge
- Integration-specific components (Salesforce sync status, Gong call viewer) stay isolated in Knowledge context

### Negative
- Some initial duplication when two contexts build similar-but-not-identical components before promotion
- Developers must learn the tier system and import rules
- Moving a component from Tier 3 to Tier 2 requires updating all import paths

### Neutral
- Existing `src/components/ui/` directory is already Tier 1 compliant -- no migration needed
- Shell and sidebar are already in `src/components/layout/` -- no migration needed
- V1 domain component directories (`boards/`, `workflow/`, etc.) map naturally to Tier 3 within their contexts

## Options Considered

### Option 1: Everything in `src/components/`
- **Pros**: Simple flat structure, easy to find components
- **Cons**: No ownership boundaries, domain logic mixes with primitives, scales poorly past 50+ components

### Option 2: Atomic Design (Atoms/Molecules/Organisms/Templates)
- **Pros**: Well-known pattern, enforces component size hierarchy
- **Cons**: Categorization is subjective ("is this a molecule or organism?"), doesn't map to business domains, creates deep nesting

### Option 3: Three-Tier Domain Architecture (Chosen)
- **Pros**: Maps to bounded contexts, clear import rules, promotion path for shared patterns, minimal migration from current structure
- **Cons**: Requires discipline, initial learning curve

## Related Decisions
- ADR-001: Frontend DDD Bounded Contexts (defines the context boundaries)
- ADR-002: API Integration Strategy (domain components consume context-specific hooks)

## References
- Current UI primitives: `src/components/ui/`
- Current layout: `src/components/layout/shell.tsx`
- Current shared: `src/components/shared/command-palette.tsx`
