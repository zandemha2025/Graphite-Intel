import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPatch, apiPost } from "@/lib/api";

type CardType = "stat" | "chart" | "text" | "insight";

interface BoardCard {
  id: string;
  type: CardType;
  title: string;
  value?: string;
  content?: string;
  unit?: string;
  change?: string;
}

interface BoardConfig {
  cards: BoardCard[];
  layout: unknown[];
}

interface Board {
  id: number;
  title: string;
  type: "live" | "report" | "monitor";
  config: BoardConfig;
  approvalStatus?: string;
  updatedAt: string;
}

const CARD_TYPES: { value: CardType; label: string; desc: string }[] = [
  { value: "stat", label: "Stat", desc: "Big number with label" },
  { value: "chart", label: "Chart", desc: "Visualization placeholder" },
  { value: "text", label: "Text", desc: "Markdown / rich text" },
  { value: "insight", label: "Insight", desc: "AI-generated insight" },
];

function BoardCardRenderer({
  card,
  onRemove,
}: {
  card: BoardCard;
  onRemove: () => void;
}) {
  return (
    <Card className="group relative">
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#9CA3AF] hover:text-[#DC2626] p-1"
        onClick={onRemove}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-2">
        {card.title || card.type}
      </p>

      {card.type === "stat" && (
        <div>
          <p className="text-3xl font-semibold text-[#0A0A0A]">
            {card.value ?? "--"}
            {card.unit && (
              <span className="text-lg text-[#9CA3AF] ml-1">{card.unit}</span>
            )}
          </p>
          {card.change && (
            <p
              className={`text-sm mt-1 ${
                card.change.startsWith("+")
                  ? "text-[#065F46]"
                  : card.change.startsWith("-")
                    ? "text-[#991B1B]"
                    : "text-[#9CA3AF]"
              }`}
            >
              {card.change}
            </p>
          )}
        </div>
      )}

      {card.type === "chart" && (
        <div className="h-32 flex items-center justify-center border border-dashed border-[#E5E5E3] rounded-lg text-sm text-[#9CA3AF]">
          Chart placeholder
        </div>
      )}

      {card.type === "text" && (
        <div className="text-sm text-[#404040] whitespace-pre-wrap">
          {card.content || "No content"}
        </div>
      )}

      {card.type === "insight" && (
        <div className="text-sm text-[#404040] italic border-l-2 border-[#0A0A0A] pl-3">
          {card.content || "Waiting for insight..."}
        </div>
      )}
    </Card>
  );
}

export default function BoardViewPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const boardId = Number(id);

  const { data: board, isLoading } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: () => api<Board>(`/boards/${boardId}`),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [boardType, setBoardType] = useState<"live" | "report" | "monitor">("live");
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newCardType, setNewCardType] = useState<CardType>("stat");
  const [newCardTitle, setNewCardTitle] = useState("");

  useEffect(() => {
    if (board) {
      setTitle(board.title);
      setBoardType(board.type);
      setCards(board.config?.cards ?? []);
    }
  }, [board]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<Board>) =>
      apiPatch(`/boards/${boardId}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  });

  const refreshMut = useMutation({
    mutationFn: () => apiPost(`/boards/${boardId}/refresh`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Board refreshed");
    },
    onError: () => toast.error("Refresh failed"),
  });

  function saveCards(updated: BoardCard[]) {
    setCards(updated);
    updateMut.mutate({ config: { cards: updated, layout: [] } } as never);
  }

  function addCard() {
    const card: BoardCard = {
      id: crypto.randomUUID(),
      type: newCardType,
      title: newCardTitle || newCardType,
    };
    saveCards([...cards, card]);
    setShowAddCard(false);
    setNewCardTitle("");
    setNewCardType("stat");
  }

  function removeCard(cardId: string) {
    saveCards(cards.filter((c) => c.id !== cardId));
  }

  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-64 bg-[#E5E5E3] rounded" />
          <div className="h-48 bg-[#E5E5E3] rounded-xl" />
        </div>
      </Page>
    );
  }

  if (!board) {
    return (
      <Page title="Not Found" subtitle="">
        <p className="text-sm text-[#9CA3AF]">Board not found.</p>
      </Page>
    );
  }

  return (
    <Page
      title=""
      fullWidth
      actions={
        <div className="flex items-center gap-2">
          {board.approvalStatus && (
            <Badge
              variant={
                board.approvalStatus === "approved" ? "success" : "warning"
              }
            >
              {board.approvalStatus}
            </Badge>
          )}
          <Button
            variant="secondary"
            onClick={() => setShowSchedule(true)}
          >
            Schedule
          </Button>
          <Button
            variant="secondary"
            onClick={() => refreshMut.mutate()}
            loading={refreshMut.isPending}
          >
            Refresh All
          </Button>
          <Button onClick={() => setShowAddCard(true)}>Add Card</Button>
        </div>
      }
    >
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* Editable header */}
        <div className="flex items-center gap-3">
          <input
            className="flex-1 text-2xl font-semibold text-[#0A0A0A] bg-transparent border-none outline-none placeholder:text-[#C8C8C6]"
            value={title}
            placeholder="Untitled Board"
            onChange={(e) => {
              setTitle(e.target.value);
              updateMut.mutate({ title: e.target.value });
            }}
          />
          <div className="flex gap-1">
            {(["live", "report", "monitor"] as const).map((t) => (
              <button
                key={t}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  boardType === t
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-[#F6F5F4] text-[#404040] hover:bg-[#E5E5E3]"
                }`}
                onClick={() => {
                  setBoardType(t);
                  updateMut.mutate({ type: t });
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#E5E5E3] rounded-xl">
            <p className="text-sm text-[#9CA3AF] mb-2">No cards yet</p>
            <Button variant="secondary" onClick={() => setShowAddCard(true)}>
              Add your first card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <BoardCardRenderer
                key={card.id}
                card={card}
                onRemove={() => removeCard(card.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent>
          <DialogTitle>Add Card</DialogTitle>
          <DialogDescription>Choose a card type to add to your board.</DialogDescription>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Card title"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    newCardType === ct.value
                      ? "border-[#0A0A0A] bg-[#F6F5F4]"
                      : "border-[#E5E5E3] hover:bg-[#F6F5F4]"
                  }`}
                  onClick={() => setNewCardType(ct.value)}
                >
                  <p className="text-sm font-medium text-[#0A0A0A]">
                    {ct.label}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">{ct.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowAddCard(false)}>
                Cancel
              </Button>
              <Button onClick={addCard}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogTitle>Schedule Refresh</DialogTitle>
          <DialogDescription>
            Configure automatic refresh for this board.
          </DialogDescription>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-[#404040] mb-1">
                Frequency
              </label>
              <select className="flex h-9 w-full appearance-none rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]">
                <option value="manual">Manual only</option>
                <option value="hourly">Every hour</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowSchedule(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowSchedule(false);
                  toast.success("Schedule saved");
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
