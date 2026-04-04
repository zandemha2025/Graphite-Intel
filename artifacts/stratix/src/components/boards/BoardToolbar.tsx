import { Edit2, Eye, Plus, Share2, Check, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BoardTypeSelector, type BoardType } from "./BoardTypeSelector";

type Props = {
  title: string;
  boardType: BoardType;
  isEditMode: boolean;
  onTitleChange: (t: string) => void;
  onBoardTypeChange: (t: BoardType) => void;
  onToggleEditMode: () => void;
  onAddCard: () => void;
  onShare: () => void;
};

export function BoardToolbar({
  title,
  boardType,
  isEditMode,
  onTitleChange,
  onBoardTypeChange,
  onToggleEditMode,
  onAddCard,
  onShare,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitTitle() {
    const trimmed = draft.trim();
    if (trimmed) onTitleChange(trimmed);
    else setDraft(title);
    setEditing(false);
  }

  function cancelTitle() {
    setDraft(title);
    setEditing(false);
  }

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
      style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") cancelTitle();
              }}
              className="text-sm font-semibold border rounded px-2 py-0.5 outline-none min-w-0 flex-1"
              style={{ borderColor: "#4F46E5", color: "#111827" }}
            />
            <button onClick={commitTitle} className="p-1 rounded hover:bg-gray-100" style={{ color: "#4F46E5" }}>
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={cancelTitle} className="p-1 rounded hover:bg-gray-100" style={{ color: "#6B7280" }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <span
              className="text-sm font-semibold truncate cursor-pointer hover:text-indigo-600 transition-colors"
              style={{ color: "#111827" }}
              onClick={() => { setDraft(title); setEditing(true); }}
            >
              {title}
            </span>
            <button
              onClick={() => { setDraft(title); setEditing(true); }}
              className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#9CA3AF" }}
            >
              <Edit2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {/* Board type selector */}
      <BoardTypeSelector value={boardType} onChange={onBoardTypeChange} />

      {/* Edit / View toggle */}
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-md"
        style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}
      >
        <button
          type="button"
          onClick={() => !isEditMode && onToggleEditMode()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all"
          style={{
            background: isEditMode ? "#FFFFFF" : "transparent",
            color: isEditMode ? "#4F46E5" : "#6B7280",
            fontWeight: isEditMode ? 600 : 400,
            boxShadow: isEditMode ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Edit2 className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => isEditMode && onToggleEditMode()}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all"
          style={{
            background: !isEditMode ? "#FFFFFF" : "transparent",
            color: !isEditMode ? "#4F46E5" : "#6B7280",
            fontWeight: !isEditMode ? 600 : 400,
            boxShadow: !isEditMode ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      </div>

      {/* Actions */}
      {isEditMode && (
        <button
          onClick={onAddCard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          style={{ background: "#4F46E5", color: "#FFFFFF" }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Card
        </button>
      )}

      <button
        onClick={onShare}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-gray-50"
        style={{ borderColor: "#E5E7EB", color: "#374151" }}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    </div>
  );
}
