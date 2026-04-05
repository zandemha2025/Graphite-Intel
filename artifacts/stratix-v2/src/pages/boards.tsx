import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, apiPost, apiDelete } from "@/lib/api";

interface Board {
  id: number;
  title: string;
  type: "live" | "report" | "monitor";
  cardCount: number;
  updatedAt: string;
}

const TYPE_BADGE: Record<string, "info" | "success" | "warning"> = {
  live: "info",
  report: "success",
  monitor: "warning",
};

const BOARD_TYPES = [
  { value: "live", label: "Live" },
  { value: "report", label: "Report" },
  { value: "monitor", label: "Monitor" },
] as const;

export default function BoardsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"live" | "report" | "monitor">("live");

  const { data: boards = [], isLoading } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () => api<Board[]>("/boards"),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiPost<Board>("/boards", {
        title: newTitle || "Untitled Board",
        type: newType,
        config: { cards: [], layout: [] },
      }),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setShowNew(false);
      setNewTitle("");
      setNewType("live");
      navigate(`/boards/${board.id}`);
    },
    onError: () => toast.error("Failed to create board"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiDelete(`/boards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setDeleteId(null);
      toast.success("Board deleted");
    },
    onError: () => toast.error("Failed to delete board"),
  });

  const deletingBoard = boards.find((b) => b.id === deleteId);

  return (
    <Page
      title="Boards"
      subtitle="Visual dashboards and layouts"
      actions={<Button onClick={() => setShowNew(true)}>New Board</Button>}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-[#F6F5F4] animate-pulse" />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <p className="text-sm text-[#9CA3AF] mb-3">No boards yet</p>
          <Button variant="secondary" onClick={() => setShowNew(true)}>
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              hoverable
              clickable
              className="flex flex-col justify-between"
              onClick={() => navigate(`/boards/${board.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[#0A0A0A] truncate">
                    {board.title}
                  </h3>
                  <Badge variant={TYPE_BADGE[board.type]}>{board.type}</Badge>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>
                  {board.cardCount} {board.cardCount === 1 ? "card" : "cards"}
                </span>
                <div className="flex items-center gap-2">
                  <span>{new Date(board.updatedAt).toLocaleDateString()}</span>
                  <button
                    className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(board.id);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Board Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogTitle>New Board</DialogTitle>
          <DialogDescription>Create a visual dashboard.</DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
          >
            <Input
              placeholder="Board title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-[#404040] mb-1">
                Type
              </label>
              <div className="flex gap-2">
                {BOARD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      newType === t.value
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E5E3] bg-white text-[#404040] hover:bg-[#F6F5F4]"
                    }`}
                    onClick={() => setNewType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogTitle>Delete Board</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{deletingBoard?.title}&rdquo;?
            This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
