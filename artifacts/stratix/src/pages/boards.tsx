import { useState } from "react";
import { useLocation } from "wouter";
import { LayoutGrid, Plus, Clock, MoreHorizontal, Activity, FileText, Radio } from "lucide-react";
import type { BoardType } from "@/components/boards";

type BoardMeta = {
  id: string;
  title: string;
  type: BoardType;
  updatedAt: string;
  cardCount: number;
};

const SEED_BOARDS: BoardMeta[] = [
  { id: "1", title: "Revenue Overview", type: "live", updatedAt: "2 hours ago", cardCount: 5 },
  { id: "2", title: "Q1 Intelligence Report", type: "report", updatedAt: "Yesterday", cardCount: 7 },
  { id: "3", title: "Competitive Monitor", type: "monitor", updatedAt: "3 days ago", cardCount: 4 },
  { id: "4", title: "Pipeline Health", type: "live", updatedAt: "1 hour ago", cardCount: 6 },
  { id: "5", title: "Market Trends Q2", type: "report", updatedAt: "Last week", cardCount: 8 },
  { id: "6", title: "Ops Alerts", type: "monitor", updatedAt: "30 minutes ago", cardCount: 3 },
];

const TYPE_CONFIG: Record<BoardType, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; bg: string }> = {
  live: { label: "Live", icon: Activity, color: "#059669", bg: "#ECFDF5" },
  report: { label: "Report", icon: FileText, color: "#4F46E5", bg: "#EEF2FF" },
  monitor: { label: "Monitor", icon: Radio, color: "#D97706", bg: "#FFFBEB" },
};

function ThumbnailPlaceholder({ type }: { type: BoardType }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <div
      className="w-full h-28 rounded-md flex items-center justify-center"
      style={{ background: cfg.bg }}
    >
      <cfg.icon className="h-8 w-8 opacity-30" style={{ color: cfg.color }} />
    </div>
  );
}

export function BoardsList() {
  const [boards, setBoards] = useState<BoardMeta[]>(SEED_BOARDS);
  const [, setLocation] = useLocation();

  const createBoard = () => {
    const id = String(Date.now());
    const newBoard: BoardMeta = { id, title: "Untitled Board", type: "live", updatedAt: "Just now", cardCount: 0 };
    setBoards((prev) => [newBoard, ...prev]);
    setLocation(`/boards/${id}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="h-5 w-5" style={{ color: "#4F46E5" }} />
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#111827" }}>Boards</h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>Dashboards, reports, and monitors</p>
          </div>
        </div>
        <button
          onClick={createBoard}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium"
          style={{ background: "#4F46E5", color: "#FFFFFF" }}
        >
          <Plus className="h-4 w-4" />
          New Board
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => {
          const cfg = TYPE_CONFIG[board.type];
          return (
            <button
              key={board.id}
              onClick={() => setLocation(`/boards/${board.id}`)}
              className="text-left rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div className="p-4">
                <ThumbnailPlaceholder type={board.type} />
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{board.title}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                        {board.cardCount} card{board.cardCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <MoreHorizontal className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#D1D5DB" }} />
                </div>
                <div className="flex items-center gap-1 mt-2.5">
                  <Clock className="h-3 w-3" style={{ color: "#9CA3AF" }} />
                  <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{board.updatedAt}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
