import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
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

const DOT_COLORS = [
  "bg-[#FEB2B2]", // coral
  "bg-[#FBD38D]", // peach
  "bg-[#9AE6B4]", // mint
  "bg-[#D6BCFA]", // lavender
  "bg-[#90CDF4]", // sky
  "bg-[#FBB6CE]", // rose
];

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
    <aside className="w-60 shrink-0 border-r border-[#E5E5E3]/60 bg-[#FAFAF9] flex flex-col h-full">
      <div className="p-3 border-b border-[#E5E5E3]/60">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#2D2D2D] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-[#A3A3A3] text-center mt-8">
            No conversations yet
          </p>
        )}

        {conversations.map((conv, i) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "relative w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group",
              activeId === conv.id
                ? "bg-white shadow-sm border-l-2 border-l-[#1A1A1A] border border-[#E5E5E3]/50"
                : "text-[#525252] hover:bg-[#F5F5F4] border border-transparent border-l-2 border-l-transparent"
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full mt-1 shrink-0",
                  DOT_COLORS[i % DOT_COLORS.length]
                )}
              />
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate font-medium text-xs",
                    activeId === conv.id
                      ? "text-[#1A1A1A]"
                      : "text-[#525252]"
                  )}
                >
                  {conv.title}
                </span>
                <span className="block text-[11px] text-[#A3A3A3] mt-0.5">
                  {conv.updatedAt &&
                  !isNaN(new Date(conv.updatedAt).getTime())
                    ? formatDistanceToNow(new Date(conv.updatedAt), {
                        addSuffix: true,
                      })
                    : "just now"}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#F5F5F4] text-[#A3A3A3] hover:text-red-500 transition-all"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </button>
        ))}
      </div>
    </aside>
  );
}
