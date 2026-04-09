import { useState, useCallback, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBoard,
  useUpdateBoard,
  getGetBoardQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Download,
  GripVertical,
  Trash2,
  Copy,
  Settings,
  RefreshCw,
  Maximize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  LineChart,
  PieChart,
  ProgressCard,
  MetricTrend,
  AIInsightCard,
  CardSettingsPanel,
  FullscreenModal,
  AddCardPicker,
  useAutoRefresh,
  makeDefaultCard,
  TYPE_ICONS,
  CHART_COLORS,
  type CardConfig,
  type CardType,
} from "@/components/build/charts";

/* ── Types ── */

interface BoardCard extends CardConfig {}

interface BoardConfig {
  cards: BoardCard[];
  layout: GridLayout.Layout[];
}

/* ── Seed data ── */

function makeSeedCards(): BoardCard[] {
  return [
    {
      id: "c1",
      type: "stat",
      title: "Total Revenue",
      dataSource: "manual",
      data: {
        value: "$246K",
        label: "Total Revenue (YTD)",
        change: "+18% vs last year",
        positive: true,
      },
    },
    {
      id: "c2",
      type: "bar",
      title: "Revenue by Quarter",
      dataSource: "manual",
      data: {
        data: [
          { name: "Q1", value: 42000 },
          { name: "Q2", value: 68000 },
          { name: "Q3", value: 55000 },
          { name: "Q4", value: 81000 },
        ],
      },
    },
    {
      id: "c3",
      type: "markdown",
      title: "Board Instructions",
      dataSource: "manual",
      data: {},
      content:
        "Pin insights from **Explore** using the *Save to Board* button, or add manual cards.",
    },
    {
      id: "c4",
      type: "line",
      title: "Monthly Trend",
      dataSource: "manual",
      data: { values: [12, 19, 14, 25, 22, 30, 28, 35, 32, 40, 38, 45] },
    },
    {
      id: "c5",
      type: "pie",
      title: "Channel Mix",
      dataSource: "manual",
      data: {
        segments: [
          { label: "Organic", value: 40, color: CHART_COLORS[0] },
          { label: "Paid", value: 30, color: CHART_COLORS[1] },
          { label: "Social", value: 20, color: CHART_COLORS[2] },
          { label: "Email", value: 10, color: CHART_COLORS[3] },
        ],
      },
    },
    {
      id: "c6",
      type: "metric-trend",
      title: "Pipeline Velocity",
      dataSource: "manual",
      data: {
        value: "$1.4M",
        label: "Active Pipeline",
        trend: 12,
        sparkData: [80, 90, 85, 110, 105, 120, 130, 140],
      },
    },
  ];
}

const SEED_LAYOUT: GridLayout.Layout[] = [
  { i: "c1", x: 0, y: 0, w: 4, h: 3 },
  { i: "c2", x: 4, y: 0, w: 4, h: 4 },
  { i: "c3", x: 8, y: 0, w: 4, h: 3 },
  { i: "c4", x: 0, y: 3, w: 6, h: 4 },
  { i: "c5", x: 6, y: 3, w: 3, h: 4 },
  { i: "c6", x: 9, y: 3, w: 3, h: 3 },
];

/* ── Card Renderer ── */

function CardRenderer({
  card,
  editMode,
  onRemove,
  onDuplicate,
  onConfigure,
  onRefreshCard,
  onFullscreen,
  isRefreshing,
}: {
  card: BoardCard;
  editMode: boolean;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onConfigure: (id: string) => void;
  onRefreshCard: (id: string) => void;
  onFullscreen: (id: string) => void;
  isRefreshing: boolean;
}) {
  const TypeIcon = TYPE_ICONS[card.type] || TYPE_ICONS["stat"];
  const d = card.data as Record<string, unknown>;
  const hasRefresh = card.dataSource !== "manual" || card.type === "ai-insight";
  const lastUpdated = (d?.lastUpdated as string) || "";

  return (
    <div className={`h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden group ${isRefreshing ? "animate-pulse" : ""}`}>
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-secondary)] shrink-0">
        {editMode && (
          <GripVertical className="h-3.5 w-3.5 text-[var(--text-muted)] cursor-grab active:cursor-grabbing drag-handle" />
        )}
        <TypeIcon className="h-3 w-3 text-[var(--text-muted)]" />
        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate flex-1">
          {card.title}
        </span>
        {lastUpdated && (
          <span className="text-[8px] text-[var(--text-muted)] hidden sm:inline">{lastUpdated}</span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasRefresh && (
            <button
              onClick={() => onRefreshCard(card.id)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
              title="Refresh"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          )}
          <button
            onClick={() => onFullscreen(card.id)}
            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Expand"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          {editMode && (
            <>
              <button
                onClick={() => onConfigure(card.id)}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Settings"
              >
                <Settings className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDuplicate(card.id)}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={() => onRemove(card.id)}
                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--error)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 p-3 overflow-hidden">
        {card.type === "stat" && d && (
          <div>
            <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none">
              {d.value as string}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">
              {d.label as string}
            </p>
            {typeof d.change === "string" && d.change && (
              <p className={`text-[12px] mt-1 ${(d.positive as boolean) ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                {d.change}
              </p>
            )}
          </div>
        )}

        {card.type === "bar" && d && (
          <BarChart data={(d.data as Array<{ name: string; value: number }>) || []} />
        )}

        {card.type === "line" && d && (
          <LineChart data={(d.values as number[]) || []} />
        )}

        {card.type === "pie" && d && (
          <PieChart segments={(d.segments as Array<{ label: string; value: number; color: string }>) || []} />
        )}

        {card.type === "progress" && d && (
          <ProgressCard
            label={(d.label as string) || "Progress"}
            current={(d.current as number) || 0}
            target={(d.target as number) || 100}
            color={(d.color as string) || CHART_COLORS[0]}
          />
        )}

        {card.type === "markdown" && card.content && (
          <div className="prose prose-sm max-w-none text-[13px] text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)]">
            <ReactMarkdown>{card.content}</ReactMarkdown>
          </div>
        )}

        {card.type === "ai-insight" && d && (
          <AIInsightCard
            prompt={(d.prompt as string) || ""}
            content={(d.content as string) || ""}
            lastUpdated={(d.lastUpdated as string) || "Never"}
            onRefresh={() => onRefreshCard(card.id)}
            isRefreshing={isRefreshing}
          />
        )}

        {card.type === "metric-trend" && d && (
          <MetricTrend
            label={(d.label as string) || ""}
            value={(d.value as string) || "0"}
            trend={(d.trend as number) || 0}
            sparkData={(d.sparkData as number[]) || []}
          />
        )}
      </div>
    </div>
  );
}

/* ── BoardView ── */

export function BoardView() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/build/boards/:id");
  const boardId = params?.id ? Number(params.id) : 0;
  const queryClient = useQueryClient();

  const {
    data: board,
    isLoading,
    isError,
    refetch,
  } = useGetBoard(boardId, { query: { enabled: !!boardId } });
  const updateBoard = useUpdateBoard();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const [title, setTitle] = useState("Untitled Board");
  const [viewMode, setViewMode] = useState<"layout" | "edit">("edit");
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [layout, setLayout] = useState<GridLayout.Layout[]>([]);
  const [containerWidth, setContainerWidth] = useState(900);
  const [initialized, setInitialized] = useState(false);
  const [configCardId, setConfigCardId] = useState<string | null>(null);
  const [fullscreenCardId, setFullscreenCardId] = useState<string | null>(null);
  const [refreshingCards, setRefreshingCards] = useState<Set<string>>(new Set());
  const [showAddPicker, setShowAddPicker] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Initialize from API data */
  useEffect(() => {
    if (!board || initialized) return;
    setTitle(board.title);
    const config = board.config as BoardConfig | null;
    if (config?.cards?.length) {
      setCards(config.cards);
      setLayout(config.layout ?? []);
    } else {
      setCards(makeSeedCards());
      setLayout(SEED_LAYOUT);
    }
    setInitialized(true);
  }, [board, initialized]);

  /* Debounced save */
  const persistConfig = useCallback(
    (c: BoardCard[], l: GridLayout.Layout[]) => {
      if (!initialized || !boardId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateBoard.mutate(
          { id: boardId, data: { config: { cards: c, layout: l } } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({
                queryKey: getGetBoardQueryKey(boardId),
              });
            },
          }
        );
      }, 1000);
    },
    [initialized, boardId, updateBoard, queryClient]
  );

  /* Container width observer */
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width)
    );
    ro.observe(node);
  }, []);

  /* Refresh a card (fetch from API or AI endpoint) */
  const handleRefreshCard = useCallback(
    async (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      setRefreshingCards((prev) => new Set(prev).add(cardId));

      try {
        if (card.type === "ai-insight") {
          const prompt = (card.data as Record<string, unknown>)?.prompt as string;
          const res = await fetch("/api/openai/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt }),
          });
          if (res.ok) {
            const json = await res.json();
            const content = json?.choices?.[0]?.message?.content || json?.content || json?.response || "No response received.";
            const updated = cards.map((c) =>
              c.id === cardId
                ? { ...c, data: { ...c.data as object, content, lastUpdated: new Date().toLocaleTimeString() } }
                : c
            );
            setCards(updated);
            persistConfig(updated, layout);
          }
        } else if (card.dataSource === "api" && card.apiEndpoint) {
          const res = await fetch(card.apiEndpoint);
          if (res.ok) {
            const json = await res.json();
            const updated = cards.map((c) =>
              c.id === cardId
                ? { ...c, data: { ...c.data as object, ...json, lastUpdated: new Date().toLocaleTimeString() } }
                : c
            );
            setCards(updated);
            persistConfig(updated, layout);
          }
        } else if (card.dataSource === "connected" && card.connectedSourceId) {
          const res = await fetch(`/api/connectors/accounts/${card.connectedSourceId}/data`);
          if (res.ok) {
            const json = await res.json();
            const updated = cards.map((c) =>
              c.id === cardId
                ? { ...c, data: { ...c.data as object, ...json, lastUpdated: new Date().toLocaleTimeString() } }
                : c
            );
            setCards(updated);
            persistConfig(updated, layout);
          }
        }
      } catch {
        // Silently handle fetch errors — card retains existing data
      } finally {
        setRefreshingCards((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
      }
    },
    [cards, layout, persistConfig]
  );

  /* Auto-refresh hook */
  useAutoRefresh(cards, handleRefreshCard);

  /* Event handlers */
  const handleLayoutChange = (nl: GridLayout.Layout[]) => {
    setLayout([...nl]);
    persistConfig(cards, [...nl]);
  };

  const handleRemove = (id: string) => {
    const c = cards.filter((x) => x.id !== id);
    const l = layout.filter((x) => x.i !== id);
    setCards(c);
    setLayout(l);
    persistConfig(c, l);
  };

  const handleDuplicate = (id: string) => {
    const orig = cards.find((c) => c.id === id);
    if (!orig) return;
    const nid = `c-${Date.now()}`;
    const c = [...cards, { ...orig, id: nid, title: `${orig.title} (copy)` }];
    const ol = layout.find((l) => l.i === id);
    const l = [
      ...layout,
      { ...(ol ?? { w: 6, h: 4, x: 0 }), i: nid, y: Infinity },
    ];
    setCards(c);
    setLayout(l);
    persistConfig(c, l);
  };

  const handleAddCard = (type: CardType) => {
    const cid = `c-${Date.now()}`;
    const defaults = makeDefaultCard(type);
    const c = [...cards, { id: cid, ...defaults }];
    const l = [...layout, { i: cid, x: 0, y: Infinity, w: 6, h: 4 }];
    setCards(c);
    setLayout(l);
    persistConfig(c, l);
    setShowAddPicker(false);
  };

  const handleSaveConfig = (config: CardConfig) => {
    const updated = cards.map((c) =>
      c.id === config.id ? { ...c, ...config } : c
    );
    setCards(updated);
    persistConfig(updated, layout);
    setConfigCardId(null);
  };

  const fullscreenCard = fullscreenCardId ? cards.find((c) => c.id === fullscreenCardId) : null;

  /* Loading (with timeout guard) */
  if (isLoading && !loadingTimedOut) {
    return (
      <div className="h-full p-6 space-y-4">
        <div className="h-10 w-64 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] animate-pulse" />
        <div className="h-96 w-full rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] animate-pulse" />
      </div>
    );
  }

  /* Server error (including loading timeout) */
  if (isError || loadingTimedOut) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-[14px] text-[var(--error)]">
          Failed to load board &mdash; server error.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoadingTimedOut(false);
              refetch();
            }}
            className="bg-[var(--accent)] text-white border-[var(--accent)] hover:opacity-90"
          >
            Retry
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/build")}>
            Back to Build
          </Button>
        </div>
      </div>
    );
  }

  /* Board not found */
  if (!board && boardId) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-[14px] text-[var(--error)]">Board not found.</p>
        <Button variant="outline" size="sm" onClick={() => setLocation("/build")}>
          Back to Build
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/build")}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-[17px] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent)]/15 text-[var(--accent)]">
            {(board as unknown as Record<string, string>)?.type || "live"}
          </span>
          {updateBoard.isPending && (
            <span className="text-[10px] text-[var(--text-muted)]">
              Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)]">
            {(["layout", "edit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 text-xs rounded-[var(--radius-sm)] transition-all ${
                  viewMode === m
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm font-medium"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {m === "layout" ? "View" : "Edit"}
              </button>
            ))}
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPicker(!showAddPicker)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Card
            </Button>
            {showAddPicker && (
              <div className="absolute top-full right-0 mt-1 z-50 p-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <AddCardPicker onAdd={handleAddCard} />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={() => {
              const config: BoardConfig = { cards, layout };
              const blob = new Blob([JSON.stringify(config, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-board.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        {cards.length === 0 ? (
          <div className="h-full min-h-[400px] rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-[14px] text-[var(--text-muted)]">
                No cards yet
              </p>
              <AddCardPicker onAdd={handleAddCard} />
            </div>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout}
            width={Math.max(containerWidth - 32, 300)}
            onLayoutChange={handleLayoutChange}
            cols={12}
            rowHeight={80}
            margin={[12, 12]}
            containerPadding={[0, 0]}
            isDraggable={viewMode === "edit"}
            isResizable={viewMode === "edit"}
            draggableHandle=".drag-handle"
            resizeHandles={["se"]}
          >
            {cards.map((card) => (
              <div key={card.id} className="relative">
                <CardRenderer
                  card={card}
                  editMode={viewMode === "edit"}
                  onRemove={handleRemove}
                  onDuplicate={handleDuplicate}
                  onConfigure={setConfigCardId}
                  onRefreshCard={handleRefreshCard}
                  onFullscreen={setFullscreenCardId}
                  isRefreshing={refreshingCards.has(card.id)}
                />
                {configCardId === card.id && (
                  <CardSettingsPanel
                    config={card}
                    onSave={handleSaveConfig}
                    onCancel={() => setConfigCardId(null)}
                  />
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {/* ── Fullscreen Modal ── */}
      {fullscreenCard && (
        <FullscreenModal
          title={fullscreenCard.title}
          onClose={() => setFullscreenCardId(null)}
        >
          <div className="h-full">
            <CardRenderer
              card={fullscreenCard}
              editMode={false}
              onRemove={() => {}}
              onDuplicate={() => {}}
              onConfigure={() => {}}
              onRefreshCard={handleRefreshCard}
              onFullscreen={() => setFullscreenCardId(null)}
              isRefreshing={refreshingCards.has(fullscreenCard.id)}
            />
          </div>
        </FullscreenModal>
      )}
    </div>
  );
}
