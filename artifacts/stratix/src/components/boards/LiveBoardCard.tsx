import { useState } from "react";
import { RefreshCw, Trash2, Edit3, MoreHorizontal, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartCell } from "@/components/charts/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardCard } from "./board-types";

type Props = {
  card: BoardCard;
  editMode: boolean;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRefreshCard?: (id: string) => void;
};

// ---------------------------------------------------------------------------
// Card body renderers by type
// ---------------------------------------------------------------------------

function InsightBody({ card }: { card: BoardCard }) {
  const content = card.answerContent ?? card.content ?? "";
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "#9CA3AF" }}>No insight data yet</span>
      </div>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none overflow-auto h-full"
      style={{
        "--tw-prose-body": "#374151",
        "--tw-prose-headings": "#111827",
        "--tw-prose-links": "#4F46E5",
        "--tw-prose-bold": "#111827",
        "--tw-prose-code": "#111827",
        "--tw-prose-pre-bg": "#F3F4F6",
        fontSize: "12px",
      } as React.CSSProperties}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function NotebookCellBody({ card }: { card: BoardCard }) {
  const content = card.content ?? "";
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "#9CA3AF" }}>Notebook cell not loaded</span>
      </div>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none overflow-auto h-full"
      style={{ "--tw-prose-body": "#374151", fontSize: "12px" } as React.CSSProperties}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function StatBody({ card }: { card: BoardCard }) {
  const data = card.data as { value?: string; label?: string; change?: string; positive?: boolean } | undefined;
  const value = data?.value ?? card.content ?? "--";
  const label = data?.label ?? card.title;
  const change = data?.change;
  const positive = data?.positive ?? true;

  return (
    <div className="flex flex-col justify-center h-full px-2">
      <div className="text-2xl font-bold" style={{ color: "#111827" }}>{value}</div>
      <div className="text-sm mt-1" style={{ color: "#6B7280" }}>{label}</div>
      {change && (
        <div className="text-xs mt-1 font-medium" style={{ color: positive ? "#059669" : "#DC2626" }}>
          {change}
        </div>
      )}
    </div>
  );
}

function ChartBody({ card }: { card: BoardCard }) {
  const cell = card.data as ChartCell | undefined;
  if (!cell || !cell.data) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "#9CA3AF" }}>No chart data</span>
      </div>
    );
  }
  return <ChartRenderer cell={cell} className="h-full" />;
}

function TextBody({ card }: { card: BoardCard }) {
  const content = card.content ?? "";
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs" style={{ color: "#9CA3AF" }}>Empty text card</span>
      </div>
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none overflow-auto h-full"
      style={{ "--tw-prose-body": "#374151", fontSize: "12px" } as React.CSSProperties}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function CardContent({ card }: { card: BoardCard }) {
  switch (card.type) {
    case "insight":
      return <InsightBody card={card} />;
    case "notebook_cell":
      return <NotebookCellBody card={card} />;
    case "stat":
      return <StatBody card={card} />;
    case "chart":
      return <ChartBody card={card} />;
    case "text":
      return <TextBody card={card} />;
    default:
      return <div className="text-xs" style={{ color: "#9CA3AF" }}>Unknown card type</div>;
  }
}

// ---------------------------------------------------------------------------
// Card type badge colors
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  insight: { bg: "#EEF2FF", color: "#4F46E5", label: "Insight" },
  notebook_cell: { bg: "#FDF4FF", color: "#9333EA", label: "Notebook" },
  stat: { bg: "#ECFDF5", color: "#059669", label: "Stat" },
  chart: { bg: "#FFF7ED", color: "#EA580C", label: "Chart" },
  text: { bg: "#F9FAFB", color: "#6B7280", label: "Text" },
};

// ---------------------------------------------------------------------------
// LiveBoardCard
// ---------------------------------------------------------------------------

export function LiveBoardCard({ card, editMode, onRemove, onDuplicate, onRefreshCard }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = TYPE_BADGE[card.type] ?? TYPE_BADGE.text;

  return (
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden group/card"
      style={{
        background: "#FFFFFF",
        border: editMode ? "1.5px dashed #4F46E5" : "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #F3F4F6" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold truncate" style={{ color: "#111827" }}>
            {card.title}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          {card.refreshEnabled && (
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: "#10B981" }}
              title="Auto-refresh enabled"
            />
          )}
        </div>

        {/* Hover toolbar (always visible on hover, not just in edit mode) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {onRefreshCard && (
            <button
              onClick={() => onRefreshCard(card.id)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Refresh card"
            >
              <RefreshCw className="h-3 w-3" style={{ color: "#6B7280" }} />
            </button>
          )}
          {editMode && (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-gray-100 transition-colors shrink-0">
                  <MoreHorizontal className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                <DropdownMenuItem onClick={() => onDuplicate?.(card.id)} className="text-xs gap-2">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRemove?.(card.id)}
                  className="text-xs gap-2"
                  style={{ color: "#DC2626" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Prompt subtitle for insight cards */}
      {card.type === "insight" && card.prompt && (
        <div className="px-3 py-1.5 shrink-0" style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
          <p className="text-[10px] truncate" style={{ color: "#6B7280" }} title={card.prompt}>
            Q: {card.prompt}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 p-3 overflow-hidden min-h-0">
        <CardContent card={card} />
      </div>

      {/* Last refreshed footer */}
      {card.lastRefreshedAt && (
        <div className="px-3 py-1 shrink-0" style={{ borderTop: "1px solid #F3F4F6" }}>
          <span className="text-[9px]" style={{ color: "#9CA3AF" }}>
            Refreshed {formatRelative(card.lastRefreshedAt)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
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
    return iso;
  }
}
