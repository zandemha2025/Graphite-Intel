import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, LayoutDashboard, Clock, Layers, MoreHorizontal } from "lucide-react";

type BoardMeta = {
  id: string;
  title: string;
  description: string;
  type: "live" | "report" | "monitor";
  cardCount: number;
  updatedAt: string;
};

const SAMPLE_BOARDS: BoardMeta[] = [
  {
    id: "1",
    title: "Growth Overview",
    description: "Revenue, pipeline, and conversion trends across all segments.",
    type: "live",
    cardCount: 6,
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    title: "Q2 Marketing Report",
    description: "Campaign performance, CAC, and channel attribution for Q2.",
    type: "report",
    cardCount: 8,
    updatedAt: "Yesterday",
  },
  {
    id: "3",
    title: "Infrastructure Monitor",
    description: "Uptime, latency, and error rate across all services.",
    type: "monitor",
    cardCount: 5,
    updatedAt: "5 mins ago",
  },
  {
    id: "4",
    title: "Sales Pipeline",
    description: "Open opportunities by stage, rep, and close date.",
    type: "live",
    cardCount: 4,
    updatedAt: "1 hour ago",
  },
];

const TYPE_LABELS: Record<BoardMeta["type"], string> = {
  live: "Live",
  report: "Report",
  monitor: "Monitor",
};

const TYPE_COLORS: Record<BoardMeta["type"], { bg: string; text: string }> = {
  live: { bg: "#DCFCE7", text: "#16A34A" },
  report: { bg: "#EEF2FF", text: "#4F46E5" },
  monitor: { bg: "#FEF3C7", text: "#D97706" },
};

export function Boards() {
  const [, navigate] = useLocation();
  const [boards, setBoards] = useState<BoardMeta[]>(SAMPLE_BOARDS);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function createBoard() {
    const title = newTitle.trim();
    if (!title) return;
    const nb: BoardMeta = {
      id: String(Date.now()),
      title,
      description: "",
      type: "live",
      cardCount: 0,
      updatedAt: "Just now",
    };
    setBoards((prev) => [nb, ...prev]);
    setNewTitle("");
    setShowNew(false);
    navigate(`/boards/${nb.id}`);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#F9FAFB" }}>
      {/* Page header */}
      <div
        className="flex items-center justify-between px-8 py-5 border-b"
        style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
      >
        <div>
          <h1 className="text-base font-semibold" style={{ color: "#111827" }}>
            Boards
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
            Build and share drag-and-drop intelligence dashboards
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors"
          style={{ background: "#4F46E5", color: "#FFFFFF" }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Board
        </button>
      </div>

      {/* New board inline form */}
      {showNew && (
        <div
          className="flex items-center gap-3 px-8 py-3 border-b"
          style={{ background: "#EEF2FF", borderColor: "#C7D2FE" }}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" style={{ color: "#4F46E5" }} />
          <input
            autoFocus
            type="text"
            placeholder="Board name…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createBoard();
              if (e.key === "Escape") { setShowNew(false); setNewTitle(""); }
            }}
            className="flex-1 bg-transparent outline-none text-sm font-medium"
            style={{ color: "#111827" }}
          />
          <button
            onClick={createBoard}
            className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            style={{ background: "#4F46E5", color: "#FFFFFF" }}
          >
            Create
          </button>
          <button
            onClick={() => { setShowNew(false); setNewTitle(""); }}
            className="px-3 py-1 text-xs font-medium rounded-md border transition-colors hover:bg-white"
            style={{ borderColor: "#C7D2FE", color: "#374151" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Board grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-4">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            My Boards
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} onClick={() => navigate(`/boards/${board.id}`)} />
          ))}

          {/* Empty state / add tile */}
          <button
            onClick={() => setShowNew(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 group"
            style={{ borderColor: "#E5E7EB", minHeight: 160 }}
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "#F3F4F6" }}
            >
              <Plus className="h-4 w-4" style={{ color: "#9CA3AF" }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
              New board
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardCard({ board, onClick }: { board: BoardMeta; onClick: () => void }) {
  const tc = TYPE_COLORS[board.type];

  return (
    <div
      onClick={onClick}
      className="flex flex-col rounded-xl cursor-pointer group transition-all hover:-translate-y-0.5"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      }}
    >
      {/* Preview strip */}
      <div
        className="h-28 rounded-t-xl flex items-center justify-center relative overflow-hidden"
        style={{ background: "#F3F4F6" }}
      >
        <div className="grid grid-cols-2 gap-1.5 p-3 w-full h-full">
          {[...Array(Math.min(board.cardCount, 4))].map((_, i) => (
            <div
              key={i}
              className="rounded"
              style={{ background: i % 3 === 0 ? "#E0E7FF" : i % 3 === 1 ? "#D1FAE5" : "#FEF3C7" }}
            />
          ))}
        </div>

        {/* Overflow menu — appears on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(255,255,255,0.9)" }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-tight line-clamp-1" style={{ color: "#111827" }}>
            {board.title}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
            style={{ background: tc.bg, color: tc.text }}
          >
            {TYPE_LABELS[board.type]}
          </span>
        </div>

        {board.description && (
          <p className="text-xs leading-snug line-clamp-2" style={{ color: "#6B7280" }}>
            {board.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1" style={{ color: "#9CA3AF" }}>
          <span className="flex items-center gap-1 text-[11px]">
            <Layers className="h-3 w-3" />
            {board.cardCount} card{board.cardCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            {board.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
}
