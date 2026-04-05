import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, Plus, Clock, MoreHorizontal, Activity, FileText, Radio, Trash2, Loader2 } from "lucide-react";
import {
  useListBoards,
  getListBoardsQueryKey,
  useCreateBoard,
  useDeleteBoard,
} from "@workspace/api-client-react";
import type { Board } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { BoardType } from "@/components/boards";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<BoardType, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; bg: string }> = {
  live: { label: "Live", icon: Activity, color: "#059669", bg: "#ECFDF5" },
  report: { label: "Report", icon: FileText, color: "#4F46E5", bg: "#EEF2FF" },
  monitor: { label: "Monitor", icon: Radio, color: "#D97706", bg: "#FFFBEB" },
};

function ThumbnailPlaceholder({ type }: { type: BoardType }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.live;
  return (
    <div
      className="w-full h-28 rounded-md flex items-center justify-center"
      style={{ background: cfg.bg }}
    >
      <cfg.icon className="h-8 w-8 opacity-30" style={{ color: cfg.color }} />
    </div>
  );
}

function formatUpdatedAt(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function BoardsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: boards, isLoading } = useListBoards();
  const createBoardMutation = useCreateBoard();
  const deleteBoardMutation = useDeleteBoard();

  const createBoard = () => {
    createBoardMutation.mutate(
      { data: { title: "Untitled Board", type: "live" } },
      {
        onSuccess: (board) => {
          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
          setLocation(`/boards/${board.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create board", variant: "destructive" });
        },
      },
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this board?")) return;

    deleteBoardMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
          toast({ title: "Board deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete board", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#9CA3AF" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <LayoutGrid className="h-5 w-5" style={{ color: "#4F46E5" }} />
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "#111827" }}>Boards</h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>Dashboards, reports, and monitors</p>
          </div>
        </div>
        <button
          onClick={createBoard}
          disabled={createBoardMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          style={{ background: "#4F46E5", color: "#FFFFFF" }}
        >
          {createBoardMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Board
        </button>
      </div>

      {/* Empty state */}
      {(!boards || boards.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
            style={{ background: "#EEF2FF" }}
          >
            <LayoutGrid className="h-6 w-6" style={{ color: "#4F46E5" }} />
          </div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: "#111827" }}>Create your first board</h3>
          <p className="text-sm max-w-sm text-center mb-6" style={{ color: "#6B7280" }}>
            Build live dashboards, report boards, and monitors to track what matters most.
          </p>
          <div className="flex gap-3 mb-6">
            {(["live", "report", "monitor"] as BoardType[]).map((type) => {
              const cfg = TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    createBoardMutation.mutate(
                      { data: { title: "Untitled Board", type } },
                      {
                        onSuccess: (board) => {
                          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
                          setLocation(`/boards/${board.id}`);
                        },
                        onError: () => {
                          toast({ title: "Failed to create board", variant: "destructive" });
                        },
                      },
                    );
                  }}
                  disabled={createBoardMutation.isPending}
                  className="flex flex-col items-center gap-2 px-6 py-4 rounded-lg transition-all hover:-translate-y-0.5"
                  style={{ border: "1px solid #E5E7EB", background: "#FFFFFF" }}
                >
                  <cfg.icon className="h-5 w-5" style={{ color: cfg.color }} />
                  <span className="text-xs font-medium" style={{ color: "#374151" }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      {boards && boards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board: Board) => {
            const boardType = (board.type as BoardType) || "live";
            const cfg = TYPE_CONFIG[boardType] ?? TYPE_CONFIG.live;
            const config = board.config as { cards?: unknown[] } | null;
            const cardCount = Array.isArray(config?.cards) ? config!.cards.length : 0;

            return (
              <button
                key={board.id}
                onClick={() => setLocation(`/boards/${board.id}`)}
                className="text-left rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 relative group"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div className="p-4">
                  <ThumbnailPlaceholder type={boardType} />
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{board.title}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                          {cardCount} card{cardCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(board.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                      title="Delete board"
                    >
                      <Trash2 className="h-4 w-4" style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2.5">
                    <Clock className="h-3 w-3" style={{ color: "#9CA3AF" }} />
                    <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      {formatUpdatedAt(board.updatedAt)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
