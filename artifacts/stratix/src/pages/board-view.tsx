import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import GridLayout, { LayoutItem, Layout as GridLayoutType } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BoardToolbar } from "@/components/boards/BoardToolbar";
import { BoardCard } from "@/components/boards/BoardCard";
import { AddCardModal } from "@/components/boards/AddCardModal";
import type { BoardCardData, BoardCardContent } from "@/components/boards/BoardCard";
import type { BoardType } from "@/components/boards/BoardTypeSelector";
import {
  useGetBoard,
  useUpdateBoard,
  getGetBoardQueryKey,
  getListBoardsQueryKey,
} from "@workspace/api-client-react";

// ── types for persisted config ─────────────────────────────────────────────

interface BoardConfig {
  cards: BoardCardData[];
  layout: LayoutItem[];
}

// ── seed helpers (used only for brand-new boards with no config) ────────────

function makeSeedCards(): BoardCardData[] {
  return [
    {
      id: "c1",
      title: "Revenue by Quarter",
      source: "CRM",
      content: {
        kind: "chart",
        cell: {
          type: "bar",
          title: "Revenue by Quarter",
          data: [
            { name: "Q1", value: 42000 },
            { name: "Q2", value: 68000 },
            { name: "Q3", value: 55000 },
            { name: "Q4", value: 81000 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
    {
      id: "c2",
      title: "Monthly Active Users",
      source: "Analytics",
      content: {
        kind: "chart",
        cell: {
          type: "line",
          title: "Monthly Active Users",
          data: [
            { name: "Jan", value: 1200 },
            { name: "Feb", value: 1450 },
            { name: "Mar", value: 1380 },
            { name: "Apr", value: 1710 },
            { name: "May", value: 1960 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
    {
      id: "c3",
      title: "Total Revenue",
      source: "Finance",
      content: { kind: "stat", label: "Total Revenue (YTD)", value: "$246K", change: "+18% vs last year", positive: true },
    },
    {
      id: "c4",
      title: "Segment Breakdown",
      source: "CRM",
      content: {
        kind: "chart",
        cell: {
          type: "pie",
          title: "Segment Breakdown",
          data: [
            { name: "Enterprise", value: 55 },
            { name: "Mid-Market", value: 30 },
            { name: "SMB", value: 15 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
  ];
}

const SEED_LAYOUT: LayoutItem[] = [
  { i: "c1", x: 0, y: 0, w: 6, h: 4 },
  { i: "c2", x: 6, y: 0, w: 6, h: 4 },
  { i: "c3", x: 0, y: 4, w: 3, h: 3 },
  { i: "c4", x: 3, y: 4, w: 5, h: 3 },
];

// ── page ────────────────────────────────────────────────────────────────────

export default function BoardView() {
  const params = useParams<{ id: string }>();
  const boardId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: board, isLoading, isError } = useGetBoard(boardId);
  const updateBoardMutation = useUpdateBoard();

  const [title, setTitle] = useState("Untitled Board");
  const [boardType, setBoardType] = useState<BoardType>("live");
  const [viewMode, setViewMode] = useState<"layout" | "edit">("layout");
  const [cards, setCards] = useState<BoardCardData[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(900);
  const [initialized, setInitialized] = useState(false);

  // Debounce timer ref for auto-saving config
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize local state from fetched board data
  useEffect(() => {
    if (!board || initialized) return;

    setTitle(board.title);
    setBoardType((board.type as BoardType) || "live");

    const config = board.config as BoardConfig | null;
    if (config && Array.isArray(config.cards) && config.cards.length > 0) {
      setCards(config.cards);
      setLayout(config.layout ?? []);
    } else {
      // Brand-new board with no config — use seed data
      setCards(makeSeedCards());
      setLayout(SEED_LAYOUT);
    }

    setInitialized(true);
  }, [board, initialized]);

  // Auto-save config when cards or layout change (debounced)
  const persistConfig = useCallback(
    (newCards: BoardCardData[], newLayout: LayoutItem[]) => {
      if (!initialized || !boardId) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const config: BoardConfig = { cards: newCards, layout: newLayout };
        updateBoardMutation.mutate(
          { id: boardId, data: { config } },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey(boardId) });
              queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
            },
          },
        );
      }, 1000);
    },
    [initialized, boardId, updateBoardMutation, queryClient],
  );

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!boardId) return;
    // Save title immediately (no debounce)
    updateBoardMutation.mutate(
      { id: boardId, data: { title: newTitle } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey(boardId) });
          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
        },
      },
    );
  };

  const handleBoardTypeChange = (newType: BoardType) => {
    setBoardType(newType);
    if (!boardId) return;
    updateBoardMutation.mutate(
      { id: boardId, data: { type: newType } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey(boardId) });
          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
        },
      },
    );
  };

  const handleAddCard = (cardTitle: string, content: BoardCardContent) => {
    const id = `c-${Date.now()}`;
    const newCards = [...cards, { id, title: cardTitle, content }];
    const newLayout = [...layout, { i: id, x: 0, y: Infinity, w: 6, h: 4 }];
    setCards(newCards);
    setLayout(newLayout);
    persistConfig(newCards, newLayout);
  };

  const handleRemove = (id: string) => {
    const newCards = cards.filter((c) => c.id !== id);
    const newLayout = layout.filter((l) => l.i !== id);
    setCards(newCards);
    setLayout(newLayout);
    persistConfig(newCards, newLayout);
  };

  const handleDuplicate = (id: string) => {
    const original = cards.find((c) => c.id === id);
    if (!original) return;
    const newId = `c-${Date.now()}`;
    const newCards = [...cards, { ...original, id: newId, title: `${original.title} (copy)` }];
    const origLayout = layout.find((l) => l.i === id);
    const newLayout = [...layout, { ...(origLayout ?? { w: 6, h: 4, x: 0 }), i: newId, y: Infinity }];
    setCards(newCards);
    setLayout(newLayout);
    persistConfig(newCards, newLayout);
  };

  const handleLayoutChange = (newLayout: GridLayoutType) => {
    const layoutArr = [...newLayout];
    setLayout(layoutArr);
    persistConfig(cards, layoutArr);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "#F3F4F6" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  if (isError || (!isLoading && !board)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: "#F3F4F6" }}>
        <div className="text-sm" style={{ color: "#EF4444" }}>Board not found.</div>
        <button
          onClick={() => setLocation("/boards")}
          className="text-sm underline"
          style={{ color: "#4F46E5" }}
        >
          Back to Boards
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#F3F4F6" }}>
      {/* Back nav */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b" style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}>
        <button
          onClick={() => setLocation("/boards")}
          className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Boards
        </button>
        {updateBoardMutation.isPending && (
          <span className="text-[10px] ml-auto" style={{ color: "#9CA3AF" }}>Saving...</span>
        )}
      </div>

      <BoardToolbar
        title={title}
        boardType={boardType}
        viewMode={viewMode}
        onTitleChange={handleTitleChange}
        onBoardTypeChange={handleBoardTypeChange}
        onViewModeChange={setViewMode}
        onAddCard={() => setAddOpen(true)}
      />

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <GridLayout
          className="layout"
          layout={layout as GridLayoutType}
          width={containerWidth - 32}
          onLayoutChange={handleLayoutChange}
          cols={12}
          rowHeight={80}
          margin={[12, 12] as [number, number]}
          containerPadding={[0, 0] as [number, number]}
          isDraggable={viewMode === "edit"}
          isResizable={viewMode === "edit"}
          draggableHandle=".drag-handle"
          resizeHandles={["se"]}
        >
          {cards.map((card) => (
            <div key={card.id} className="relative group">
              {viewMode === "edit" && (
                <div
                  className="drag-handle absolute top-0 left-0 right-0 h-7 cursor-grab active:cursor-grabbing z-10 rounded-t-lg"
                  style={{ background: "rgba(79,70,229,0.06)" }}
                />
              )}
              <BoardCard
                card={card}
                editMode={viewMode === "edit"}
                onRemove={handleRemove}
                onDuplicate={handleDuplicate}
              />
            </div>
          ))}
        </GridLayout>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="text-sm" style={{ color: "#9CA3AF" }}>No cards yet.</div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
              style={{ background: "#4F46E5", color: "#FFFFFF" }}
            >
              + Add Card
            </button>
          </div>
        )}
      </div>

      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddCard} />
    </div>
  );
}
