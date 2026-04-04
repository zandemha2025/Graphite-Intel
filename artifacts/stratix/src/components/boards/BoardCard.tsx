import { ChartRenderer } from "../charts/ChartRenderer";
import type { ChartCell } from "../charts/types";

interface BoardCardProps {
  cell: ChartCell;
  isEditing: boolean;
  onRemove?: () => void;
}

export function BoardCard({ cell, isEditing, onRemove }: BoardCardProps) {
  return (
    <div className="h-full w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {isEditing && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 cursor-move">
          <span className="text-xs text-gray-400">⠿ drag</span>
          <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500">✕</button>
        </div>
      )}
      <div className="flex-1 p-4 min-h-0">
        <ChartRenderer cell={cell} />
      </div>
    </div>
  );
}
