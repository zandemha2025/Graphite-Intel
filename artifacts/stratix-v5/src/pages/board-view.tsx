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
  BarChart3,
  Hash,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

/* ── Types ── */

interface BoardCard {
  id: string;
  type: "stat" | "chart" | "text";
  title: string;
  data?: Record<string, unknown>;
  content?: string;
}

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
      data: {
        value: "$246K",
        label: "Total Revenue (YTD)",
        change: "+18% vs last year",
        positive: true,
      },
    },
    {
      id: "c2",
      type: "chart",
      title: "Revenue by Quarter",
      data: {
        type: "bar",
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
      type: "text",
      title: "Board Instructions",
      content:
        "Pin insights from **Explore** using the *Save to Board* button, or add manual cards.",
    },
  ];
}

const SEED_LAYOUT: GridLayout.Layout[] = [
  { i: "c1", x: 0, y: 0, w: 4, h: 3 },
  { i: "c2", x: 4, y: 0, w: 8, h: 4 },
  { i: "c3", x: 0, y: 3, w: 4, h: 3 },
];

/* ── Card Renderer ── */

function CardRenderer({
  card,
  editMode,
  onRemove,
  onDuplicate,
}: {
  card: BoardCard;
  editMode: boolean;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const TypeIcon =
    card.type === "stat" ? Hash : card.type === "chart" ? BarChart3 : FileText;

  return (
    <div className="h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden group">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-secondary)] shrink-0">
        {editMode && (
          <GripVertical className="h-3.5 w-3.5 text-[var(--text-muted)] cursor-grab active:cursor-grabbing drag-handle" />
        )}
        <TypeIcon className="h-3 w-3 text-[var(--text-muted)]" />
        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate flex-1">
          {card.title}
        </span>
        {editMode && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 p-3 overflow-hidden">
        {card.type === "stat" && card.data && (
          <div>
            <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none">
              {card.data.value as string}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">
              {card.data.label as string}
            </p>
            {typeof card.data.change === "string" && (
              <p
                className={`text-[12px] mt-1 ${(card.data.positive as boolean) ? "text-[var(--success)]" : "text-[var(--error)]"}`}
              >
                {card.data.change}
              </p>
            )}
          </div>
        )}

        {card.type === "chart" && card.data && (
          <div className="h-full flex items-end gap-1 pb-2">
            {(
              (card.data.data as Array<{ name: string; value: number }>) || []
            ).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[3px] bg-[var(--accent)] transition-all"
                  style={{
                    height: `${(d.value / 100000) * 100}%`,
                    minHeight: 4,
                  }}
                />
                <span className="text-[9px] text-[var(--text-muted)]">
                  {d.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {card.type === "text" && card.content && (
          <div className="prose prose-sm max-w-none text-[13px] text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)]">
            <ReactMarkdown>{card.content}</ReactMarkdown>
          </div>
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

  /* Loading timeout — if loading takes > 10s, show error state */
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

  const handleAddCard = () => {
    const cid = `c-${Date.now()}`;
    const c = [
      ...cards,
      {
        id: cid,
        type: "text" as const,
        title: "New Card",
        content: "Edit this card...",
      },
    ];
    const l = [...layout, { i: cid, x: 0, y: Infinity, w: 6, h: 4 }];
    setCards(c);
    setLayout(l);
    persistConfig(c, l);
  };

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

  /* Board not found (data is null/undefined but no error) */
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
          {/* View/Edit toggle */}
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
          <Button variant="outline" size="sm" onClick={handleAddCard}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Card
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        {cards.length === 0 ? (
          <div className="h-full min-h-[400px] rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
            <div className="text-center">
              <p className="text-[14px] text-[var(--text-muted)] mb-2">
                No cards yet
              </p>
              <Button variant="accent" size="sm" onClick={handleAddCard}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add First Card
              </Button>
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
              <div key={card.id}>
                <CardRenderer
                  card={card}
                  editMode={viewMode === "edit"}
                  onRemove={handleRemove}
                  onDuplicate={handleDuplicate}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
