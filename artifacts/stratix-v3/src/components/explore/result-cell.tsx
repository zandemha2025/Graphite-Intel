import {
  Lightbulb,
  Table,
  FileText,
  Bookmark,
  Copy,
  Share2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CellType = "key-finding" | "table" | "analysis" | "chart" | "comparison";

export interface ResultCellData {
  id: string;
  type: CellType;
  title: string;
  content: string;
  sources?: string[];
}

const cellIcons: Record<CellType, typeof Lightbulb> = {
  "key-finding": Lightbulb,
  table: Table,
  analysis: FileText,
  chart: BarChart3,
  comparison: Table,
};

const cellLabels: Record<CellType, string> = {
  "key-finding": "Key Finding",
  table: "Table",
  analysis: "Analysis",
  chart: "Chart",
  comparison: "Comparison",
};

interface ResultCellProps {
  cell: ResultCellData;
  onSave?: () => void;
  onCopy?: () => void;
  className?: string;
}

export function ResultCell({ cell, onSave, onCopy, className }: ResultCellProps) {
  const Icon = cellIcons[cell.type];

  function handleCopy() {
    navigator.clipboard.writeText(cell.content);
    onCopy?.();
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[#E5E7EB] bg-white p-4 transition-colors hover:bg-[#F9FAFB]",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#4F46E5]" />
          <Badge variant="indigo">{cellLabels[cell.type]}</Badge>
        </div>
      </div>

      {/* Title */}
      <h4 className="mb-2 text-sm font-semibold text-[#111827]">{cell.title}</h4>

      {/* Content */}
      <div className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">
        {cell.content}
      </div>

      {/* Sources */}
      {cell.sources && cell.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cell.sources.map((source) => (
            <Badge key={source} variant="default">
              {source}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1 border-t border-[#E5E7EB] pt-3">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save to Board
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  );
}
