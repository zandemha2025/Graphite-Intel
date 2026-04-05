import { Bookmark } from "lucide-react";
import { SourceBadge } from "./SourceBadge";
import { ChartRenderer } from "@/components/charts";
import type { CellData } from "@/components/charts";

export function CellCard({ cell }: { cell: CellData }) {
  const hasHeader = !!(cell.title || cell.source);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {hasHeader && (
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid #F3F4F6" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {cell.title && (
              <span className="text-sm font-medium truncate" style={{ color: "#111827" }}>
                {cell.title}
              </span>
            )}
            {cell.source && <SourceBadge source={cell.source} />}
          </div>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ml-2 shrink-0"
            style={{ color: "#9CA3AF" }}
            title="Save to Board"
            onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          >
            <Bookmark className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      )}
      <div className="p-4">
        <ChartRenderer cell={cell as any} />
      </div>
    </div>
  );
}
