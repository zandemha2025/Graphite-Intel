import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, apiPatch, apiPost, apiDelete } from "@/lib/api";
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
  Bell,
  Radio,
  Pencil,
  Trash2,
} from "lucide-react";

/* ---------- Types ---------- */

interface BoardCard {
  id: string;
  title: string;
  type: "insight" | "chart" | "metric" | "text";
  content: string;
}

interface MonitorConfig {
  monitorTarget?: string;
  checkFrequency?: "hourly" | "daily" | "weekly";
  alertCondition?: string;
  refreshInterval?: string;
}

interface Board {
  id: string;
  title: string;
  type: "live" | "report" | "monitor";
  updatedAt: string;
  cards: BoardCard[];
  config?: MonitorConfig;
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

/* ---------- Edit Monitors Dialog ---------- */

function EditMonitorsDialog({
  config,
  onSave,
  onClose,
}: {
  config: MonitorConfig;
  onSave: (updates: MonitorConfig) => void;
  onClose: () => void;
}) {
  const [monitorTarget, setMonitorTarget] = useState(
    config.monitorTarget ?? "",
  );
  const [checkFrequency, setCheckFrequency] = useState<
    "hourly" | "daily" | "weekly"
  >(config.checkFrequency ?? "daily");
  const [alertCondition, setAlertCondition] = useState(
    config.alertCondition ?? "",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#4F46E5]" />
            <p className="text-sm font-semibold text-[#111827]">
              Edit Monitor Configuration
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6B7280]">
              What to monitor
            </label>
            <textarea
              value={monitorTarget}
              onChange={(e) => setMonitorTarget(e.target.value)}
              placeholder="Describe the signals to watch for..."
              rows={2}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6B7280]">
              Check frequency
            </label>
            <div className="flex gap-2">
              {(["hourly", "daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setCheckFrequency(f)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    checkFrequency === f
                      ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                      : "border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#6B7280]">
              Alert me when
            </label>
            <textarea
              value={alertCondition}
              onChange={(e) => setAlertCondition(e.target.value)}
              placeholder="Describe conditions that should trigger an alert..."
              rows={2}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave({
                ...config,
                monitorTarget: monitorTarget.trim(),
                checkFrequency,
                alertCondition: alertCondition.trim(),
              });
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

/* ---------- Monitoring Alerts Section ---------- */

interface ProactiveAlert {
  id: string;
  icon: "warning" | "chart" | "trending";
  title: string;
  description: string;
  sourceType: "1p" | "3p";
  sourceLabel: string;
  timestamp: string;
  query: string;
}

const SAMPLE_ALERTS: ProactiveAlert[] = [
  {
    id: "alert-1",
    icon: "warning",
    title: "3 high-value accounts inactive 14+ days",
    description:
      "Enterprise accounts Acme Corp, Globex, and Initech haven't had a sales touch in over two weeks. Pipeline value at risk: $420K.",
    sourceType: "1p",
    sourceLabel: "Your Salesforce",
    timestamp: "2 hours ago",
    query: "Which high-value accounts have had no contact in the last 14 days? Show pipeline value at risk.",
  },
  {
    id: "alert-2",
    icon: "chart",
    title: "Competitor updated pricing page",
    description:
      "Your monitored competitor appears to have restructured their pricing tiers yesterday. New enterprise tier detected.",
    sourceType: "3p",
    sourceLabel: "Web Monitoring",
    timestamp: "6 hours ago",
    query: "What changes did our main competitor make to their pricing recently? Analyze competitive implications.",
  },
  {
    id: "alert-3",
    icon: "trending",
    title: "Market sentiment shifted positive",
    description:
      "Industry sentiment in your sector moved from neutral to positive this week, driven by strong earnings across peers.",
    sourceType: "3p",
    sourceLabel: "Perplexity Research",
    timestamp: "1 day ago",
    query: "What's driving the positive market sentiment shift in our industry this week? What should we capitalize on?",
  },
];

function AlertIconBadge({ type }: { type: ProactiveAlert["icon"] }) {
  switch (type) {
    case "warning":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Bell className="h-4 w-4" />
        </div>
      );
    case "chart":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Eye className="h-4 w-4" />
        </div>
      );
    case "trending":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Activity className="h-4 w-4" />
        </div>
      );
  }
}

function MonitoringAlertsSection({
  config,
  onEditClick,
  onInvestigate,
}: {
  config?: MonitorConfig;
  onEditClick: () => void;
  onInvestigate?: (query: string) => void;
}) {
  return (
    <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#4F46E5]" />
          <span className="text-sm font-semibold text-[#111827]">Alerts</span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            {SAMPLE_ALERTS.length} new
          </span>
          {/* Active monitoring indicator */}
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Active
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={onEditClick}>
          <Pencil className="h-3.5 w-3.5" />
          Edit Monitors
        </Button>
      </div>

      {/* Config summary */}
      {config?.monitorTarget && (
        <div className="border-b border-[#E5E7EB] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              Watching: {config.monitorTarget}
            </span>
            {config.checkFrequency && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Checks {config.checkFrequency}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alert list */}
      <div className="divide-y divide-[#E5E7EB]">
        {SAMPLE_ALERTS.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 px-4 py-3">
            <AlertIconBadge type={alert.icon} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#111827]">
                  {alert.title}
                </p>
                <span
                  className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    alert.sourceType === "1p"
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {alert.sourceType === "1p" ? "1P" : "3P"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                {alert.description}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[10px] text-[#9CA3AF]">
                  {alert.sourceLabel} &middot; {alert.timestamp}
                </span>
                <button
                  onClick={() => onInvestigate?.(alert.query)}
                  className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5] hover:bg-[#4F46E5] hover:text-white transition-colors"
                >
                  Investigate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function BoardViewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const boardId = params.id ?? "";
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showEditMonitors, setShowEditMonitors] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const deleteBoardMutation = useMutation({
    mutationFn: () => apiDelete(`/boards/${boardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted");
      navigate("/boards");
    },
    onError: () => {
      toast.error("Failed to delete board");
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
          <Button
            variant="secondary"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Board
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

      {/* Monitoring Alerts section -- only for monitor boards */}
      {board.type === "monitor" && (
        <MonitoringAlertsSection
          config={board.config}
          onEditClick={() => setShowEditMonitors(true)}
          onInvestigate={(query) => {
            navigate(`/explore?q=${encodeURIComponent(query)}`);
          }}
        />
      )}

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

      {/* Edit monitors modal */}
      {showEditMonitors && board.type === "monitor" && (
        <EditMonitorsDialog
          config={board.config ?? {}}
          onSave={(updates) => {
            patchMutation.mutate({ config: updates });
          }}
          onClose={() => setShowEditMonitors(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-[#111827]">Delete this board?</p>
            <p className="mt-2 text-sm text-[#6B7280]">This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteBoardMutation.mutate()}
                loading={deleteBoardMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
