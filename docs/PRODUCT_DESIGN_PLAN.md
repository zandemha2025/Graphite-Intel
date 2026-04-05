# Stratix Product Design Plan
## From "functional SaaS" to "$100K/yr enterprise intelligence platform"

---

## The Querio Model (What They Do Right)

Querio's product architecture has 6 surfaces that work together:

1. **Explore** — Natural language Q&A → instant charts/tables/insights
2. **Notebooks** — Reactive cells that recompute when dependencies change, SQL/Python transparency
3. **Boards** — Curated collections of notebook cells, publishable, live-refreshing, approval workflows
4. **Context** — Persistent knowledge layer, versioned, self-healing, teaches the AI your business
5. **Saved** — Knowledge repository of reusable insights
6. **History** — Searchable archive of every conversation

Their key design principles:
- **Transparency**: Every AI answer shows the underlying query/logic
- **Reactive**: Cells auto-update when upstream data changes
- **Progressive disclosure**: Simple for business users, powerful for analysts
- **Governance**: Approval workflows, versioned context, audit trails

---

## Where Stratix Should Be BETTER

Querio is a **BI tool** — it connects to data warehouses and lets you query them. 
Stratix is a **strategic intelligence platform** — it connects to 600+ business systems and does the THINKING for you.

| Querio | Stratix (should be) |
|--------|---------------------|
| Queries your data warehouse | Queries your CRM, calls, docs, market data, competitors |
| Shows you charts | Shows you strategic insights with recommendations |
| You write the analysis | AI writes the analysis, you refine it |
| Data team tool | C-suite tool |
| Reactive cells | Proactive intelligence (alerts you before you ask) |
| SQL/Python transparency | Strategy logic transparency (shows reasoning chain) |
| Connects to databases | Connects to everything (Salesforce, Gong, Slack, etc.) |

---

## Redesigned Information Architecture

### Navigation (Sidebar)

```
┌─────────────────────┐
│ ◆ Stratix           │
│   Acme Corp         │
├─────────────────────┤
│ ⌘ Command (⌘K)     │
├─────────────────────┤
│ INTELLIGENCE        │
│ ◎ Explore           │  ← Natural language Q&A
│ ◻ Notebook          │  ← Reactive cell workspace  
│ ◫ Boards            │  ← Published dashboards
│ ◧ Reports           │  ← Long-form intelligence
├─────────────────────┤
│ OPERATIONS          │
│ ⚡ Workflows        │  ← Automated pipelines
│ ☰ Playbooks         │  ← Structured review processes
│ 📊 Ads              │  ← Campaign intelligence
├─────────────────────┤
│ KNOWLEDGE           │
│ 🔍 Context          │  ← Company profile + definitions
│ 📁 Vault            │  ← Document & data repository
│ 🔗 Connections      │  ← Integrations hub
├─────────────────────┤
│ ADMIN               │
│ 👥 Team             │
│ 📈 Analytics        │
│ 📋 Audit            │
└─────────────────────┘
```

**Key change**: Merge Knowledge into a dedicated section. Move Integrations out of settings into a top-level "Connections" — this is a core feature, not a setting.

---

## Page-by-Page Redesign

### 1. EXPLORE (The Crown Jewel)

**Current state**: Split panel — Results Notebook on left, Conversation on right.
**Problem**: Feels like a chatbot with a side panel. Not differentiated from ChatGPT.

**Redesigned UX**:

```
┌─────────────────────────────────────────────────────┐
│ Explore                                    [Deep ▾] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔍 Ask anything about your business...      │   │
│  │    [Context: 3 sources connected]  [⊕ Attach]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ INSIGHT CELL ──────────────────────────────┐   │
│  │ Q: How is our enterprise pipeline trending?  │   │
│  │                                              │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │ │ Pipeline │ │ Win Rate │ │ Avg Deal │     │   │
│  │ │ $4.2M ↑  │ │ 34% ↓   │ │ $85K →   │     │   │
│  │ └──────────┘ └──────────┘ └──────────┘     │   │
│  │                                              │   │
│  │ [Chart: Pipeline by stage, last 90 days]    │   │
│  │                                              │   │
│  │ Key Findings:                                │   │
│  │ • Enterprise pipeline grew 18% QoQ but...   │   │
│  │ • Win rate declined from 41% to 34%...      │   │
│  │ • Benefitfocus launched a competing tier...  │   │
│  │                                              │   │
│  │ 💡 Recommendation: Focus on deals >$100K... │   │
│  │                                              │   │
│  │ [Sources: Salesforce ⋅ Gong ⋅ Web Research] │   │
│  │ [📌 Save to Board] [📤 Share] [⟳ Refresh]  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ INSIGHT CELL ──────────────────────────────┐   │
│  │ Q: What are competitors doing in mid-market? │   │
│  │ ...                                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key UX changes**:
- **Single-column notebook layout** (not split panel) — each Q&A is a "cell" 
- **Structured insight cells** — not just markdown, but stat cards + charts + findings + recommendations + sources
- **"Save to Board" on every cell** — one click publishes an insight to a dashboard
- **Source attribution** — shows which connected systems contributed to each answer
- **Context indicator** — shows how many data sources are active ("3 sources connected")
- **Reasoning chain expandable** — click to see HOW the AI arrived at the answer

### 2. NOTEBOOK (New — Power User Workspace)

**What it is**: A workspace where users can create multi-cell analyses that auto-update. Like Querio's notebooks but for strategy, not SQL.

```
┌─────────────────────────────────────────────────────┐
│ 📓 Q3 Competitive Intelligence Brief      [▶ Run]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Cell 1: Market Overview          [Auto-refresh: 🟢]│
│  ┌──────────────────────────────────────────────┐  │
│  │ Prompt: "Summarize the enterprise benefits    │  │
│  │ administration market for Q3 2026"            │  │
│  │                                               │  │
│  │ [Rich output: market size, growth, players]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Cell 2: Competitor Moves         [Auto-refresh: 🟢]│
│  ┌──────────────────────────────────────────────┐  │
│  │ Prompt: "What product launches, pricing       │  │
│  │ changes, or strategic moves have competitors  │  │
│  │ made since {Cell 1.lastRefresh}?"             │  │
│  │                                               │  │
│  │ [Table: competitor, move, date, impact]       │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Cell 3: Our Position              [Data: Salesforce]│
│  ┌──────────────────────────────────────────────┐  │
│  │ Prompt: "Given Cell 1 and Cell 2, analyze our │  │
│  │ pipeline from Salesforce and identify risks"  │  │
│  │                                               │  │
│  │ [Chart + risk matrix]                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [+ Add Cell]  [📊 Publish as Board]               │
└─────────────────────────────────────────────────────┘
```

**Key features**:
- Cells can **reference other cells** — Cell 3 uses output from Cell 1 and Cell 2
- Cells can be **auto-refreshing** — "re-run this every Monday"
- Cells can pull from **specific data sources** — "use Salesforce for this cell"
- Entire notebook can be **published as a Board** with one click
- **Version history** — see how the analysis changed over time

### 3. BOARDS (Live Intelligence Dashboards)

**Current state**: Grid layout with generic cards.
**Problem**: No connection to real insights. Cards are static.

**Redesigned UX**:
- Boards are collections of **published notebook cells and explore insights**
- Each card is a **live cell** that auto-refreshes on schedule
- Cards show: stat, chart, table, or narrative — based on the insight type
- **Approval workflow** — mark a board as "reviewed" vs "draft"
- **Scheduling** — "refresh this board every Monday at 8am and email the team"
- **Commenting** — team can discuss insights inline
- **Presentation mode** — full-screen board for executive reviews

### 4. CONTEXT (The Brain)

**Current state**: Company profile form + document list.
**Problem**: Feels like a settings page, not a core feature.

**Redesigned UX**:
- **Context Health Score** — visual meter showing how well Stratix knows your business
- **Knowledge Graph** — visual map of entities (competitors, products, team members, deals)
- **Definitions** — business glossary that the AI uses ("when I say ARR, I mean...")
- **Connected Sources** — live status of all integrations with data freshness
- **Auto-enrichment** — Stratix proactively fills gaps ("I noticed you haven't defined your ICP — want me to infer it from your Salesforce data?")

### 5. CONNECTIONS (Promoted from Settings)

**Current state**: Hidden in settings/integrations.
**Problem**: This is THE core differentiator vs ChatGPT. It shouldn't be buried.

**Redesigned UX**:
- Top-level nav item
- **Connection cards** with live sync status, data freshness, record counts
- **Data preview** — see what was pulled from each source
- **One-click connect** via Pipedream widget
- **Sync history** — when did we last pull data, how many records
- **Health monitoring** — alerts when a connection breaks

---

## Visual Design System

### Current
- Dark theme (#0D0C0B)
- Cormorant Garamond headings
- Zero border-radius
- Looks like a Vercel template

### Target (Harvey meets Querio)
- **Light mode default** with dark mode toggle (enterprise users prefer light mode for day-to-day work)
- **Data-dense but breathable** — more information per screen without feeling cramped
- **Muted professional palette** — warm grays, accent blue for interactive elements, green/red for metrics
- **Consistent card system** — every insight, metric, and data point lives in a well-defined card
- **Typography hierarchy** — clear distinction between headings, body, labels, data values
- **Motion**: Subtle, purposeful — loading skeletons, smooth transitions, no gratuitous animation
- **Charts**: Consistent style across all visualizations — same color palette, font, grid style

### Component Library Upgrades Needed
- **InsightCell** — the atomic unit of intelligence (question + answer + metrics + chart + sources)
- **MetricCard** — stat display with trend indicator and sparkline
- **SourceBadge** — shows which integration contributed data
- **ConnectionCard** — integration status with health indicator
- **ApprovalBadge** — reviewed/draft/pending status on boards
- **ReasoningChain** — expandable view of how AI reached a conclusion

---

## Priority Implementation Order

### Phase 1: Core UX Redesign (1-2 weeks)
1. Redesign Explore as single-column notebook with InsightCells
2. Add "Save to Board" from any insight
3. Promote Connections to top-level nav
4. Light mode as default

### Phase 2: Notebook Feature (1 week)
1. Multi-cell notebook with cell references
2. Auto-refresh per cell
3. Publish to Board

### Phase 3: Board Evolution (1 week)
1. Boards = collection of live cells
2. Approval workflow
3. Scheduled refresh + email
4. Presentation mode

### Phase 4: Context Intelligence (1 week)
1. Knowledge graph visualization
2. Auto-enrichment suggestions
3. Context health scoring
4. Definition management

### Phase 5: Polish (ongoing)
1. Light/dark mode toggle
2. Keyboard shortcuts everywhere
3. Mobile responsive
4. Performance optimization
5. Loading skeletons
6. Accessibility audit

---

## Success Metric

Kelly from HQY should be able to:
1. Connect Salesforce in 30 seconds
2. Ask "How is our enterprise pipeline trending?" and get a structured insight with CRM data + market context
3. Save that insight to a board
4. Set it to auto-refresh weekly
5. Share the board with Mukund
6. See something she CANNOT get from ChatGPT, Claude, or Copilot

If she can do all 6 in under 5 minutes, we win the deal.
