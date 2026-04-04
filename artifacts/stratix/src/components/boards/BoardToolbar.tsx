import { BoardTypeSelector } from "./BoardTypeSelector";

interface BoardToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  boardType: "live" | "report" | "monitor";
  onBoardTypeChange: (type: "live" | "report" | "monitor") => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  onAddCard: () => void;
}

export function BoardToolbar({ title, onTitleChange, boardType, onBoardTypeChange, isEditing, onToggleEdit, onAddCard }: BoardToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1"
          placeholder="Untitled Board"
        />
        <BoardTypeSelector value={boardType} onChange={onBoardTypeChange} />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleEdit}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isEditing ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isEditing ? "Done" : "Edit"}
        </button>
        {isEditing && (
          <button
            onClick={onAddCard}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            + Add Card
          </button>
        )}
        <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
          Share
        </button>
      </div>
    </div>
  );
}
