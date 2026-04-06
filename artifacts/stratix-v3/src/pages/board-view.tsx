import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, apiPatch, apiPost } from "@/lib/api";
import {
  LayoutGrid,
  RefreshCw,
  Settings,
  Save,
  ArrowLeft,
  Activity,
  FileText,
  Eye,
  Clock,
  X,
} from "lucide-react";

/* ---------- Types ---------- */

interface BoardCard {
  id: string;
  title: string;
  type: "insight" | "chart" | "metric" | "text";
  content: string;
}

interface Board {
  id: string;
  title: string;
  type: "live" | "report" | "monitor";
  updatedAt: string;
  cards: BoardCard[];
  config?: {
    refreshInterval?: string;
  };
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Schedule Config Dialog ---------- */

function ScheduleConfig({
  currentInterval,
  onSave,
  onClose,
}: {
  currentInterval?: string;
  onSave: (interval: string) => void;
  onClose: () => void;
}) {
  const [interval, setInterval] = useState(currentInterval ?? "daily");

  const options = [
    { value: "hourly", label: "Every hour" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "manual", label: "Manual only" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111827]">
            Refresh Schedule
          </p>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                interval === opt.value
                  ? "border-[#4F46E5] bg-indigo-50 text-[#4F46E5]"
                  : "border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
              }`}
            >
              <input
                type="radio"
                name="interval"
                value={opt.value}
                checked={interval === opt.value}
                onChange={(e) => setInterval(e.target.value)}
                className="sr-only"
              />
              <Clock className="h-4 w-4" />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(interval);
              onClose();
            }}
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Board Card Widget ---------- */

function BoardCardWidget({ card }: { card: BoardCard }) {
  return (
    <Card className="h-full">
      <p className="mb-2 text-xs font-medium text-[#6B7280] uppercase tracking-wide">
        {card.type}
      </p>
      <p className="text-sm font-medium text-[#111827]">{card.title}</p>
      <p className="mt-2 text-sm text-[#6B7280] whitespace-pre-wrap">
        {card.content}
      </p>
    </Card>
  );
}

/* ---------- Main Page ---------- */

export default function BoardViewPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id ?? "";
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: board, isLoading, isError } = useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: () => api<{ board: Board }>(`/boards/${boardId}`).then((r) => r.board),
    enabled: !!boardId,
  });

  const patchMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      apiPatch(`/boards/${boardId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Board updated");
    },
    onError: () => {
      toast.error("Failed to update board");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiPost(`/boards/${boardId}/refresh`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Board refreshed");
    },
    onError: () => {
      toast.error("Refresh failed");
    },
  });

  function handleSaveTitle() {
    if (editTitle.trim() && editTitle !== board?.title) {
      patchMutation.mutate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  }

  function handleSaveSchedule(interval: string) {
    patchMutation.mutate({
      config: { ...board?.config, refreshInterval: interval },
    });
  }

  function getTypeBadge(type: Board["type"]) {
    switch (type) {
      case "live":
        return (
          <Badge variant="success">
            <Activity className="mr-1 h-3 w-3" />
            Live
          </Badge>
        );
      case "report":
        return (
          <Badge variant="info">
            <FileText className="mr-1 h-3 w-3" />
            Report
          </Badge>
        );
      case "monitor":
        return (
          <Badge variant="warning">
            <Eye className="mr-1 h-3 w-3" />
            Monitor
          </Badge>
        );
    }
  }

  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="Fetching board data">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (isError || !board) {
    return (
      <Page title="Board not found" subtitle="This board may have been deleted">
        <Card className="flex flex-col items-center justify-center py-16">
          <LayoutGrid className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            Board not found
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            The board you are looking for does not exist or has been deleted.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Boards
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title=""
      actions={
        <div className="flex items-center gap-2">
          {getTypeBadge(board.type)}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSchedule(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            loading={refreshMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      {/* Editable title */}
      <div className="mb-6">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-lg font-semibold text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleSaveTitle}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            className="text-lg font-semibold text-[#111827] hover:text-[#4F46E5] transition-colors"
            onClick={() => {
              setEditTitle(board.title);
              setIsEditing(true);
            }}
          >
            {board.title}
          </button>
        )}
        <div className="mt-1 flex items-center gap-3 text-xs text-[#6B7280]">
          <span>
            Updated {format(new Date(board.updatedAt), "MMM d, yyyy HH:mm")}
          </span>
          {board.config?.refreshInterval && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Refreshes {board.config.refreshInterval}
            </span>
          )}
        </div>
      </div>

      {/* Board cards grid */}
      {board.cards && board.cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.cards.map((card) => (
            <BoardCardWidget key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <LayoutGrid className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            This board is empty
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Save insights from Explore or Notebooks to populate this board.
          </p>
        </Card>
      )}

      {/* Schedule modal */}
      {showSchedule && (
        <ScheduleConfig
          currentInterval={board.config?.refreshInterval}
          onSave={handleSaveSchedule}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </Page>
  );
}
