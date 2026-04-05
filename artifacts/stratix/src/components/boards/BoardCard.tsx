import { useState } from "react";
import { MoreHorizontal, Trash2, Copy, Maximize2 } from "lucide-react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { ChartCell } from "@/components/charts/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type BoardCardContent =
  | { kind: "chart"; cell: ChartCell }
  | { kind: "stat"; label: string; value: string; change?: string; positive?: boolean }
  | { kind: "text"; body: string }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type BoardCardData = {
  id: string;
  title: string;
  source?: string;
  content: BoardCardContent;
};

type Props = {
  card: BoardCardData;
  editMode: boolean;
  onRemove?: (id: string) => void;
  onDuplicate?: (id: string) => void;
};

function ContentBody({ content }: { content: BoardCardContent }) {
  switch (content.kind) {
    case "chart":
      return <ChartRenderer cell={content.cell} className="h-full" />;

    case "stat":
      return (
        <div className="flex flex-col justify-center h-full px-2">
          <div className="text-2xl font-bold" style={{ color: "#111827" }}>{content.value}</div>
          <div className="text-sm mt-1" style={{ color: "#6B7280" }}>{content.label}</div>
          {content.change && (
            <div className="text-xs mt-1 font-medium" style={{ color: content.positive ? "#059669" : "#DC2626" }}>
              {content.change}
            </div>
          )}
        </div>
      );

    case "text":
      return (
        <div className="text-sm leading-relaxed overflow-auto h-full" style={{ color: "#374151" }}>
          {content.body}
        </div>
      );

    case "table":
      return (
        <div className="overflow-auto h-full">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                {content.headers.map((h) => (
                  <th key={h} className="text-left py-1.5 px-2 font-medium" style={{ color: "#6B7280" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  {row.map((cell, j) => (
                    <td key={j} className="py-1.5 px-2" style={{ color: "#111827" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function BoardCard({ card, editMode, onRemove, onDuplicate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden"
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
          {card.source && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "#EEF2FF", color: "#4F46E5" }}
            >
              {card.source}
            </span>
          )}
        </div>
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

      {/* Body */}
      <div className="flex-1 p-3 overflow-hidden min-h-0">
        <ContentBody content={card.content} />
      </div>
    </div>
  );
}
