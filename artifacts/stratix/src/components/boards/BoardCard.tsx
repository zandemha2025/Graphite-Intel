import { GripVertical, MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { useState, useRef } from "react";
import { ChartRenderer } from "../charts/ChartRenderer";
import { type ChartCell } from "../charts/types";

type Props = {
  cell: ChartCell;
  isEditMode: boolean;
  onRemove?: () => void;
  onEdit?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

export function BoardCard({ cell, isEditMode, onRemove, onEdit, dragHandleProps }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderColor: "#F3F4F6" }}
      >
        {/* Drag handle */}
        {isEditMode && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        <span
          className="text-xs font-semibold flex-1 truncate"
          style={{ color: "#111827" }}
        >
          {cell.title}
        </span>

        {/* Overflow menu */}
        {isEditMode && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              style={{ color: "#9CA3AF" }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-36 rounded-lg py-1 z-20"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {onEdit && (
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                    style={{ color: "#374151" }}
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit card
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={() => { setMenuOpen(false); onRemove(); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-red-50 transition-colors"
                    style={{ color: "#EF4444" }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart content */}
      <div className="flex-1 overflow-hidden p-3" style={{ minHeight: 0 }}>
        <ChartRenderer cell={cell} className="h-full" />
      </div>
    </div>
  );
}
