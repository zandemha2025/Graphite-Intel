import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutGrid, Plus, Check, Loader2 } from "lucide-react";
import {
  useListBoards,
  useUpdateBoard,
  useCreateBoard,
  getListBoardsQueryKey,
  getGetBoardQueryKey,
} from "@workspace/api-client-react";
import type { Board } from "@workspace/api-client-react";
import type { BoardConfig, BoardCard } from "@/components/boards/board-types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The question that was asked */
  question: string;
  /** The AI answer markdown */
  answerContent: string;
  /** Optional conversation ID reference */
  conversationId?: number;
  /** Optional message ID reference */
  messageId?: number;
};

export function SaveToBoardDialog({
  open,
  onClose,
  question,
  answerContent,
  conversationId,
  messageId,
}: Props) {
  const queryClient = useQueryClient();
  const { data: boards, isLoading } = useListBoards();
  const updateBoardMutation = useUpdateBoard();
  const createBoardMutation = useCreateBoard();

  const [selectedBoardId, setSelectedBoardId] = useState<number | "new" | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!selectedBoardId) return;
    setSaving(true);

    const newCard: BoardCard = {
      id: `c-${Date.now()}`,
      type: "insight",
      title: question.length > 60 ? question.slice(0, 57) + "..." : question,
      prompt: question,
      answerContent,
      conversationId,
      messageId,
      refreshEnabled: false,
      lastRefreshedAt: new Date().toISOString(),
    };

    try {
      if (selectedBoardId === "new") {
        // Create new board then add card
        const title = newBoardTitle.trim() || "Untitled Board";
        const config: BoardConfig = {
          cards: [newCard],
          layout: [{ i: newCard.id, x: 0, y: 0, w: 6, h: 4 }],
          approvalStatus: "draft",
        };
        await createBoardMutation.mutateAsync({
          data: { title, type: "live", config },
        });
        queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
      } else {
        // Add card to existing board
        const board = (boards ?? []).find((b: Board) => b.id === selectedBoardId);
        if (!board) return;

        const existingConfig = (board.config as BoardConfig | null) ?? { cards: [], layout: [] };
        const cards = [...(existingConfig.cards ?? []), newCard];
        const layout = [
          ...(existingConfig.layout ?? []),
          { i: newCard.id, x: 0, y: Infinity, w: 6, h: 4 },
        ];
        const config: BoardConfig = { ...existingConfig, cards, layout };

        await updateBoardMutation.mutateAsync({
          id: selectedBoardId,
          data: { config },
        });
        queryClient.invalidateQueries({ queryKey: getGetBoardQueryKey(selectedBoardId) });
        queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
      }

      setDone(true);
      setTimeout(() => {
        setDone(false);
        setSaving(false);
        setSelectedBoardId(null);
        setNewBoardTitle("");
        onClose();
      }, 800);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#111827" }}>
            <LayoutGrid className="h-4 w-4" style={{ color: "#4F46E5" }} />
            Save to Board
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Pin this insight to a board as a live card.
          </p>

          {/* Question preview */}
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#9CA3AF" }}>
              Question
            </p>
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#111827" }}>
              {question}
            </p>
          </div>

          {/* Board list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#9CA3AF" }} />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {/* New board option */}
              <button
                onClick={() => setSelectedBoardId("new")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: selectedBoardId === "new" ? "#EEF2FF" : "#F9FAFB",
                  border: selectedBoardId === "new" ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                }}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: selectedBoardId === "new" ? "#4F46E5" : "#6B7280" }} />
                <span className="text-xs font-medium" style={{ color: selectedBoardId === "new" ? "#4F46E5" : "#111827" }}>
                  New Board
                </span>
              </button>

              {selectedBoardId === "new" && (
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Board title..."
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
                  autoFocus
                />
              )}

              {/* Existing boards */}
              {(boards ?? []).map((board: Board) => {
                const active = selectedBoardId === board.id;
                const config = board.config as { cards?: unknown[] } | null;
                const cardCount = Array.isArray(config?.cards) ? config!.cards.length : 0;
                return (
                  <button
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: active ? "#EEF2FF" : "#F9FAFB",
                      border: active ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                    }}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium truncate block" style={{ color: active ? "#4F46E5" : "#111827" }}>
                        {board.title}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                        {cardCount} card{cardCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#4F46E5" }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{ background: "#F3F4F6", color: "#374151" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedBoardId || saving}
              className="px-4 py-1.5 rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
              style={{ background: "#4F46E5", color: "#FFFFFF" }}
            >
              {done ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
