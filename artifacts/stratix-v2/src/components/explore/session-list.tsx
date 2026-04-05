import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionListProps {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
  isCollapsed: boolean;
}

export function SessionList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  isCollapsed,
}: SessionListProps) {
  if (isCollapsed) return null;

  return (
    <aside className="w-60 shrink-0 border-r border-stone-200 bg-stone-50 flex flex-col h-full">
      <div className="p-3 border-b border-stone-200">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-stone-400 text-center mt-8">
            No conversations yet
          </p>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "relative w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group",
              activeId === conv.id
                ? "bg-white border border-stone-200 text-stone-900 shadow-sm"
                : "text-stone-600 hover:bg-stone-100"
            )}
          >
            <span className="block truncate font-medium text-xs">
              {conv.title}
            </span>
            <span className="block text-[11px] text-stone-400 mt-0.5">
              {formatDistanceToNow(new Date(conv.updatedAt), {
                addSuffix: true,
              })}
            </span>
            {activeId === conv.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-red-500 transition-all"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
