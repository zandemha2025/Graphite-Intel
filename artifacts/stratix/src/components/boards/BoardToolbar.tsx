import { useState } from "react";
import { RefreshCw, Download, Share2, Edit3, Eye, Clock, Loader2 } from "lucide-react";
import { BoardTypeSelector, BoardType } from "./BoardTypeSelector";
import { cronToLabel } from "./board-types";

type ViewMode = "layout" | "edit";

type Props = {
  title: string;
  boardType: BoardType;
  viewMode: ViewMode;
  onTitleChange: (t: string) => void;
  onBoardTypeChange: (t: BoardType) => void;
  onViewModeChange: (m: ViewMode) => void;
  onRefresh?: () => void;
  onAddCard?: () => void;
  onScheduleOpen?: () => void;
  refreshSchedule?: string;
  lastRefreshedAt?: string;
  isRefreshing?: boolean;
};

export function BoardToolbar({
  title,
  boardType,
  viewMode,
  onTitleChange,
  onBoardTypeChange,
  onViewModeChange,
  onRefresh,
  onAddCard,
  onScheduleOpen,
  refreshSchedule,
  lastRefreshedAt,
  isRefreshing,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);

  const commitTitle = () => {
    onTitleChange(titleDraft.trim() || title);
    setEditingTitle(false);
  };

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-b shrink-0"
      style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      {/* Left: title + type */}
      <div className="flex items-center gap-3">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
            className="text-sm font-semibold outline-none border-b-2 bg-transparent"
            style={{ color: "#111827", borderColor: "#4F46E5", minWidth: 120 }}
          />
        ) : (
          <button
            onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
            className="flex items-center gap-1.5 group"
          >
            <span className="text-sm font-semibold" style={{ color: "#111827" }}>{title}</span>
            <Edit3 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: "#6B7280" }} />
          </button>
        )}
        <BoardTypeSelector value={boardType} onChange={onBoardTypeChange} />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div className="flex items-center rounded-md p-0.5" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
          <button
            onClick={() => onViewModeChange("layout")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: viewMode === "layout" ? "#FFFFFF" : "transparent",
              color: viewMode === "layout" ? "#111827" : "#6B7280",
              border: viewMode === "layout" ? "1px solid #E5E7EB" : "1px solid transparent",
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Layout
          </button>
          <button
            onClick={() => onViewModeChange("edit")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: viewMode === "edit" ? "#FFFFFF" : "transparent",
              color: viewMode === "edit" ? "#111827" : "#6B7280",
              border: viewMode === "edit" ? "1px solid #E5E7EB" : "1px solid transparent",
            }}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        {viewMode === "edit" && onAddCard && (
          <button
            onClick={onAddCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: "#4F46E5", color: "#FFFFFF" }}
          >
            + Add Card
          </button>
        )}

        {/* Schedule info / button */}
        {(refreshSchedule || lastRefreshedAt) && (
          <div className="flex items-center gap-1.5 mr-1">
            {refreshSchedule && (
              <span
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
                style={{ background: "#ECFDF5", color: "#059669" }}
              >
                <Clock className="h-3 w-3" />
                {cronToLabel(refreshSchedule)}
              </span>
            )}
            {lastRefreshedAt && (
              <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                Last: {formatRelativeTime(lastRefreshedAt)}
              </span>
            )}
          </div>
        )}

        {onScheduleOpen && (
          <button
            onClick={onScheduleOpen}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Schedule"
          >
            <Clock className="h-4 w-4" style={{ color: refreshSchedule ? "#059669" : "#6B7280" }} />
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh all cards"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#4F46E5" }} />
          ) : (
            <RefreshCw className="h-4 w-4" style={{ color: "#6B7280" }} />
          )}
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Export (PDF/PPTX)"
        >
          <Download className="h-4 w-4" style={{ color: "#6B7280" }} />
        </button>
        <button
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Share"
        >
          <Share2 className="h-4 w-4" style={{ color: "#6B7280" }} />
        </button>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}
