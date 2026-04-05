import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import GridLayout, { LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BoardToolbar } from "@/components/boards/BoardToolbar";
import { LiveBoardCard } from "@/components/boards/LiveBoardCard";
import { AddCardModal } from "@/components/boards/AddCardModal";
import { ApprovalBanner } from "@/components/boards/ApprovalBanner";
import { ScheduleDialog } from "@/components/boards/ScheduleDialog";
import type { BoardConfig, BoardCard, ApprovalStatus } from "@/components/boards/board-types";
import type { BoardCardContent } from "@/components/boards/BoardCard";
import type { BoardType } from "@/components/boards/BoardTypeSelector";
import {
  useGetBoard,
  useUpdateBoard,
  getGetBoardQueryKey,
  getListBoardsQueryKey,
} from "@workspace/api-client-react";

// ── seed helpers (used only for brand-new boards with no config) ────────────

function makeSeedCards(): BoardCard[] {
  return [
    {
      id: "c1",
      type: "stat",
      title: "Total Revenue",
      data: { value: "$246K", label: "Total Revenue (YTD)", change: "+18% vs last year", positive: true },
      refreshEnabled: false,
    },
    {
      id: "c2",
      type: "chart",
      title: "Revenue by Quarter",
      data: {
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
      refreshEnabled: false,
    },
    {
      id: "c3",
      type: "text",
      title: "Board Instructions",
      content: "Pin insights from **Explore** using the *Save to Board* button, or add manual stat/chart/text cards.",
      refreshEnabled: false,
    },
  ];
}

const SEED_LAYOUT: LayoutItem[] = [
  { i: "c1", x: 0, y: 0, w: 4, h: 3 },
  { i: "c2", x: 4, y: 0, w: 8, h: 4 },
  { i: "c3", x: 0, y: 3, w: 4, h: 3 },
];

// ── helpers to bridge legacy AddCardModal → BoardCard ───────────────────────

function legacyContentToBoardCard(
  id: string,
  cardTitle: string,
  content: BoardCardContent,
): BoardCard {
  switch (content.kind) {
    case "chart":
      return { id, type: "chart", title: cardTitle, data: content.cell, refreshEnabled: false };
    case "stat":
      return {
        id,
        type: "stat",
        title: cardTitle,
        data: { value: content.value, label: content.label, change: content.change, positive: content.positive },
        refreshEnabled: false,
      };
    case "text":
      return { id, type: "text", title: cardTitle, content: content.body, refreshEnabled: false };
    case "table":
      return { id, type: "text", title: cardTitle, content: `| ${content.headers.join(" | ")} |`, refreshEnabled: false };
  }
}

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
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(900);
  const [initialized, setInitialized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Board config-level state
  const [refreshSchedule, setRefreshSchedule] = useState<string | undefined>();
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("draft");
  const [approvedByName, setApprovedByName] = useState<string>();
  const [approvedAt, setApprovedAt] = useState<string>();
  const [reviewedByName, setReviewedByName] = useState<string>();
  const [reviewedAt, setReviewedAt] = useState<string>();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialize from fetched board ──────────────────────────────────────
  useEffect(() => {
    if (!board || initialized) return;

    setTitle(board.title);
    setBoardType((board.type as BoardType) || "live");

    const config = board.config as BoardConfig | null;
    if (config && Array.isArray(config.cards) && config.cards.length > 0) {
      setCards(config.cards);
      setLayout(config.layout ?? []);
      setRefreshSchedule(config.refreshSchedule);
      setApprovalStatus(config.approvalStatus ?? "draft");
      setApprovedByName(config.approvedByName);
      setApprovedAt(config.approvedAt);
      setReviewedByName(config.reviewedByName);
      setReviewedAt(config.reviewedAt);
    } else {
      setCards(makeSeedCards());
      setLayout(SEED_LAYOUT);
    }

    setInitialized(true);
  }, [board, initialized]);

  // ── Persist config (debounced) ─────────────────────────────────────────
  const buildConfig = useCallback(
    (c: BoardCard[], l: LayoutItem[], overrides?: Partial<BoardConfig>): BoardConfig => ({
      cards: c,
      layout: l,
      refreshSchedule,
      approvalStatus,
      approvedByName,
      approvedAt,
      reviewedByName,
      reviewedAt,
      ...overrides,
    }),
    [refreshSchedule, approvalStatus, approvedByName, approvedAt, reviewedByName, reviewedAt],
  );

  const persistConfig = useCallback(
    (newCards: BoardCard[], newLayout: LayoutItem[], overrides?: Partial<BoardConfig>) => {
      if (!initialized || !boardId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const config = buildConfig(newCards, newLayout, overrides);
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
    [initialized, boardId, updateBoardMutation, queryClient, buildConfig],
  );

  // ── Container width tracking ───────────────────────────────────────────
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(node);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!boardId) return;
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
    const newCard = legacyContentToBoardCard(id, cardTitle, content);
    const newCards = [...cards, newCard];
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

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    const layoutArr = [...newLayout];
    setLayout(layoutArr);
    persistConfig(cards, layoutArr);
  };

  // ── Refresh all cards ──────────────────────────────────────────────────
  const handleRefreshAll = async () => {
    if (!boardId || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetch(`/api/boards/${boardId}/refresh`, { method: "POST", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey(boardId) });
      // Update local lastRefreshedAt for all cards
      const now = new Date().toISOString();
      const refreshed = cards.map((c) => ({ ...c, lastRefreshedAt: now }));
      setCards(refreshed);
      persistConfig(refreshed, layout);
    } catch {
      // Refresh endpoint may not exist yet — still update timestamps locally
      const now = new Date().toISOString();
      const refreshed = cards.map((c) => ({ ...c, lastRefreshedAt: now }));
      setCards(refreshed);
      persistConfig(refreshed, layout);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshCard = (cardId: string) => {
    const now = new Date().toISOString();
    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, lastRefreshedAt: now } : c,
    );
    setCards(newCards);
    persistConfig(newCards, layout);
  };

  // ── Schedule ───────────────────────────────────────────────────────────
  const handleScheduleSave = (cron: string | undefined) => {
    setRefreshSchedule(cron);
    persistConfig(cards, layout, { refreshSchedule: cron });
  };

  // ── Approval ───────────────────────────────────────────────────────────
  const handleMarkReviewed = () => {
    const now = new Date().toISOString();
    setApprovalStatus("reviewed");
    setReviewedByName("You");
    setReviewedAt(now);
    persistConfig(cards, layout, {
      approvalStatus: "reviewed",
      reviewedByName: "You",
      reviewedAt: now,
    });
  };

  const handleApprove = () => {
    const now = new Date().toISOString();
    setApprovalStatus("approved");
    setApprovedByName("You");
    setApprovedAt(now);
    persistConfig(cards, layout, {
      approvalStatus: "approved",
      approvedByName: "You",
      approvedAt: now,
    });
  };

  // ── Render: loading / error ────────────────────────────────────────────
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

  // ── Find the latest lastRefreshedAt across all cards ───────────────────
  const latestRefresh = cards.reduce<string | undefined>((latest, c) => {
    if (!c.lastRefreshedAt) return latest;
    if (!latest) return c.lastRefreshedAt;
    return c.lastRefreshedAt > latest ? c.lastRefreshedAt : latest;
  }, undefined);

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

      {/* Approval banner */}
      <ApprovalBanner
        status={approvalStatus}
        approvedByName={approvedByName}
        approvedAt={approvedAt}
        reviewedByName={reviewedByName}
        reviewedAt={reviewedAt}
        onMarkReviewed={handleMarkReviewed}
        onApprove={handleApprove}
      />

      <BoardToolbar
        title={title}
        boardType={boardType}
        viewMode={viewMode}
        onTitleChange={handleTitleChange}
        onBoardTypeChange={handleBoardTypeChange}
        onViewModeChange={setViewMode}
        onAddCard={() => setAddOpen(true)}
        onRefresh={handleRefreshAll}
        onScheduleOpen={() => setScheduleOpen(true)}
        refreshSchedule={refreshSchedule}
        lastRefreshedAt={latestRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <GridLayout
          className="layout"
          layout={layout as LayoutItem[]}
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
              <LiveBoardCard
                card={card}
                editMode={viewMode === "edit"}
                onRemove={handleRemove}
                onDuplicate={handleDuplicate}
                onRefreshCard={handleRefreshCard}
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
      <ScheduleDialog
        open={scheduleOpen}
        currentCron={refreshSchedule}
        onClose={() => setScheduleOpen(false)}
        onSave={handleScheduleSave}
      />
    </div>
  );
}
