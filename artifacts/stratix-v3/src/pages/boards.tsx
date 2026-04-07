import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { api, apiPost, apiSSE, apiDelete } from "@/lib/api";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import {
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Activity,
  Eye,
  Search,
  BookOpen,
  Sparkles,
  Trash2,
  X,
  Radio,
  Bell,
} from "lucide-react";

/* ---------- Types ---------- */

interface Board {
  id: string;
  title: string;
  type: "live" | "report" | "monitor";
  updatedAt: string;
  cardCount?: number;
}

interface WorkflowRun {
  id: string;
  templateId: string;
  templateName: string;
  status: "running" | "completed" | "failed" | "queued";
  createdAt: string;
  outputPreview?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  updatedAt: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#27272A] ${className ?? ""}`}
    />
  );
}

/* ---------- Tabs config ---------- */

const tabs = [
  { id: "dashboards", label: "Dashboards" },
  { id: "automations", label: "Automations" },
  { id: "reports", label: "Reports" },
];

/* ---------- Board Creation Dialog ---------- */

type BoardType = "live" | "report" | "monitor";

const BOARD_TYPE_OPTIONS: {
  value: BoardType;
  label: string;
  description: string;
  icon: typeof Activity;
}[] = [
  {
    value: "live",
    label: "Live Dashboard",
    description: "Auto-refreshing dashboard on a schedule",
    icon: Activity,
  },
  {
    value: "report",
    label: "Report Board",
    description: "Static board for export and sharing",
    icon: FileText,
  },
  {
    value: "monitor",
    label: "Monitoring Board",
    description: "Alert-driven board that watches for signals",
    icon: Radio,
  },
];

function CreateBoardDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [boardType, setBoardType] = useState<BoardType>("live");
  const [monitorTarget, setMonitorTarget] = useState("");
  const [checkFrequency, setCheckFrequency] = useState<
    "hourly" | "daily" | "weekly"
  >("daily");
  const [alertCondition, setAlertCondition] = useState("");
  const [creating, setCreating] = useState(false);

  function reset() {
    setTitle("");
    setBoardType("live");
    setMonitorTarget("");
    setCheckFrequency("daily");
    setAlertCondition("");
    setCreating(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Please enter a board title");
      return;
    }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        type: boardType,
      };
      if (boardType === "monitor") {
        payload.config = {
          monitorTarget: monitorTarget.trim(),
          checkFrequency,
          alertCondition: alertCondition.trim(),
        };
      }
      const data = await apiPost<{ board: Board }>("/boards", payload);
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board created");
      handleClose();
      navigate(`/boards/${data.board.id}`);
    } catch {
      toast.error("Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#27272A] bg-[#18181B] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
          <h2 className="text-base font-semibold text-[#FAFAFA]">
            Create Board
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* Title */}
          <Input
            id="board-title"
            label="Board Title"
            placeholder="e.g. Competitor Watch, Market Overview"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Board type selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#FAFAFA]">
              Board Type
            </label>
            <div className="grid gap-2">
              {BOARD_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = boardType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setBoardType(opt.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-[#6366F1] bg-[#6366F1]/10"
                        : "border-[#27272A] hover:bg-[#18181B]"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-[#6366F1] text-white"
                          : "bg-[#27272A] text-[#A1A1AA]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          selected ? "text-[#6366F1]" : "text-[#FAFAFA]"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#A1A1AA]">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monitoring config - only shown for monitor type */}
          {boardType === "monitor" && (
            <div className="space-y-4 rounded-lg border border-[#27272A] bg-[#18181B] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#FAFAFA]">
                <Bell className="h-4 w-4 text-[#6366F1]" />
                Monitor Configuration
              </div>

              {/* What to monitor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">
                  What to monitor
                </label>
                <textarea
                  value={monitorTarget}
                  onChange={(e) => setMonitorTarget(e.target.value)}
                  placeholder="e.g. Competitor pricing changes, new product launches, market shifts"
                  rows={2}
                  className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none"
                />
              </div>

              {/* Check frequency */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">
                  Check frequency
                </label>
                <div className="flex gap-2">
                  {(["hourly", "daily", "weekly"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setCheckFrequency(f)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                        checkFrequency === f
                          ? "border-[#6366F1] bg-[#6366F1] text-white"
                          : "border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert condition */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#A1A1AA]">
                  Alert me when
                </label>
                <textarea
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value)}
                  placeholder='e.g. "competitor launches new product", "market share changes >5%"'
                  rows={2}
                  className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none"
                />
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            loading={creating}
          >
            <Plus className="h-4 w-4" />
            Create Board
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Dashboards Tab ---------- */

function DashboardsTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () =>
      api<{ boards: Board[] }>("/boards").then((r) => r.boards),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/boards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("Failed to delete board");
      setDeletingId(null);
    },
  });

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return (
      <>
        <CreateBoardDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
        />
        <div className="text-center py-16">
          <p className="text-[15px] text-[#A1A1AA] mb-4">No boards yet</p>
          <button
            className="text-[13px] text-[#6366F1] hover:underline"
            onClick={() => setCreateDialogOpen(true)}
          >
            + Create your first board
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <CreateBoardDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeletingId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#27272A] bg-[#18181B] p-6 shadow-xl">
            <p className="text-sm font-semibold text-[#FAFAFA]">Delete this board?</p>
            <p className="mt-2 text-sm text-[#A1A1AA]">This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteMutation.mutate(deletingId)}
                loading={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Card
            key={board.id}
            className="group relative cursor-pointer transition-colors hover:border-[#6366F1]/30"
            onClick={() => navigate(`/boards/${board.id}`)}
          >
            {/* Delete button on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(board.id);
              }}
              className="absolute right-2 top-2 rounded p-1 text-[#3F3F46] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#EF4444]/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#FAFAFA] truncate pr-6">
                {board.title}
              </p>
              {getTypeBadge(board.type)}
            </div>
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>
                Updated {format(new Date(board.updatedAt), "MMM d, yyyy")}
              </span>
              {board.cardCount !== undefined && (
                <span>{board.cardCount} cards</span>
              )}
            </div>
          </Card>
        ))}
        {/* Create new card */}
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#27272A] bg-[#18181B] p-6 text-[#A1A1AA] transition-colors hover:border-[#6366F1]/30 hover:text-[#6366F1]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New Board</span>
        </button>
      </div>
    </>
  );
}

/* ---------- Automations Tab ---------- */

/* ---------- CMO Workflow Templates (client-side) ---------- */

const CMO_WORKFLOW_TEMPLATES = [
  {
    id: "competitor-watch",
    name: "Weekly Competitor Watch",
    description: "Monitor competitor websites for pricing, feature, and messaging changes",
    schedule: "Every Monday 9am",
    icon: Eye,
    stepCount: 4,
  },
  {
    id: "pipeline-alert",
    name: "Deal Pipeline Alert",
    description: "Alert when deals stall, accounts go silent, or pipeline drops below threshold",
    schedule: "Daily 8am",
    icon: Bell,
    stepCount: 4,
  },
  {
    id: "content-brief",
    name: "Content Brief Generator",
    description: "Auto-generate content briefs based on trending topics in your industry",
    schedule: "Every Wednesday",
    icon: FileText,
    stepCount: 4,
  },
  {
    id: "market-monitor",
    name: "Market Intelligence Brief",
    description: "Weekly market intelligence summary with competitor moves, news, and trends",
    schedule: "Every Friday 5pm",
    icon: Radio,
    stepCount: 4,
  },
  {
    id: "account-health",
    name: "Account Health Check",
    description: "Weekly check on key account engagement, call sentiment, and renewal risk",
    schedule: "Every Monday 7am",
    icon: Activity,
    stepCount: 4,
  },
  {
    id: "campaign-report",
    name: "Campaign Performance Digest",
    description: "Auto-generate weekly campaign performance reports across all channels",
    schedule: "Every Monday 10am",
    icon: Sparkles,
    stepCount: 4,
  },
];

/* ---------- Automations Tab ---------- */

function AutomationsTab() {
  const [, navigate] = useLocation();

  const { data: runs, isLoading: runsLoading } = useQuery<WorkflowRun[]>({
    queryKey: ["workflow-runs"],
    queryFn: () =>
      api<{ workflows: WorkflowRun[] }>("/workflows").then(
        (r) => r.workflows,
      ),
  });

  const { data: definitions, isLoading: defsLoading } = useQuery<
    WorkflowDefinition[]
  >({
    queryKey: ["workflow-definitions"],
    queryFn: () =>
      api<{ definitions: WorkflowDefinition[] }>(
        "/workflow-definitions",
      ).then((r) => r.definitions),
  });

  function getRunStatusBadge(status: WorkflowRun["status"]) {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="info">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "queued":
        return (
          <Badge variant="default">
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
    }
  }

  function formatDuration(start: string) {
    const ms = Date.now() - new Date(start).getTime();
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  const isLoading = runsLoading || defsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with New Workflow button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#FAFAFA]">Automations</h2>
          <p className="mt-0.5 text-[13px] text-[#A1A1AA]">
            Build, deploy, and monitor automated workflows.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/workflows/new")}>
          <Plus className="h-3.5 w-3.5" />
          New Workflow
        </Button>
      </div>

      {/* Active Workflows (Custom Definitions) */}
      {definitions && definitions.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
              Active Workflows
            </h3>
            <p className="mt-0.5 text-xs text-[#A1A1AA]">
              Your deployed workflow automations.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {definitions.map((def) => (
              <Card key={def.id} className="cursor-pointer" onClick={() => navigate(`/workflows/new?id=${def.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#6366F1]" />
                    <p className="text-sm font-medium text-[#FAFAFA]">
                      {def.name}
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <p className="mt-1.5 text-xs text-[#A1A1AA]">
                  {def.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-[#71717A]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {def.stepCount} steps
                  </span>
                  <span>
                    Updated{" "}
                    {format(new Date(def.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">Recent Runs</h3>
          <p className="mt-0.5 text-xs text-[#A1A1AA]">
            History of workflow executions.
          </p>
        </div>
        {runs && runs.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#27272A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Workflow
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Date
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-medium text-[#A1A1AA] sm:table-cell">
                    Duration
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Output
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#A1A1AA]">
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[#27272A] last:border-b-0 hover:bg-[#18181B]"
                  >
                    <td className="px-4 py-3 font-medium text-[#FAFAFA]">
                      {run.templateName}
                    </td>
                    <td className="px-4 py-3">
                      {getRunStatusBadge(run.status)}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {format(new Date(run.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="hidden px-4 py-3 text-[#A1A1AA] sm:table-cell">
                      {formatDuration(run.createdAt)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[#A1A1AA]">
                      {run.outputPreview
                        ? run.outputPreview.length > 100
                          ? run.outputPreview.slice(0, 100) + "..."
                          : run.outputPreview
                        : "--"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {run.outputPreview && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/workflows/runs/${run.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-3 h-8 w-8 text-[#3F3F46]" />
            <p className="text-sm font-medium text-[#FAFAFA]">No runs yet</p>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Deploy a workflow to see execution history here.
            </p>
          </Card>
        )}
      </div>

      {/* CMO Templates */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Templates for CMOs
          </h3>
          <p className="mt-0.5 text-xs text-[#A1A1AA]">
            Pre-built workflow templates -- click to customize in the builder.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CMO_WORKFLOW_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Card
                key={tpl.id}
                className="cursor-pointer"
                onClick={() => navigate(`/workflows/new?template=${tpl.id}`)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#6366F1]" />
                  <p className="text-sm font-medium text-[#FAFAFA]">
                    {tpl.name}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-[#A1A1AA]">
                  {tpl.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-[#71717A]">
                    <Clock className="h-3 w-3" />
                    {tpl.schedule}
                  </span>
                  <span className="text-xs text-[#71717A]">
                    {tpl.stepCount} steps
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Reports Types ---------- */

interface Report {
  id: string;
  title: string;
  type: string;
  status: "ready" | "generating" | "failed";
  createdAt: string;
  depth?: string;
}

const REPORT_TYPES = [
  { value: "competitive_analysis", label: "Competitive Analysis" },
  { value: "market_intelligence", label: "Market Intelligence" },
  { value: "growth_strategy", label: "Growth Strategy" },
  { value: "brand_positioning", label: "Brand Positioning" },
  { value: "paid_acquisition", label: "Paid Acquisition Strategy" },
  { value: "financial_modeling", label: "Financial Modeling" },
  { value: "cultural_intelligence", label: "Cultural Intelligence" },
  { value: "full_business_audit", label: "Full Business Audit" },
  { value: "weekly_intelligence_brief", label: "Weekly Intelligence Brief" },
  { value: "win_loss_analysis", label: "Win/Loss Analysis" },
  { value: "quarterly_review", label: "Quarterly Business Review" },
  { value: "pricing_analysis", label: "Pricing Strategy Analysis" },
  { value: "content_strategy", label: "Content Strategy Report" },
  { value: "demand_gen", label: "Demand Generation Plan" },
  { value: "product_market_fit", label: "Product-Market Fit Assessment" },
  { value: "investor_update", label: "Investor Update Brief" },
] as const;

type ReportDepth = "quick" | "standard" | "deep";

/* ---------- Generate Report Dialog ---------- */

function GenerateReportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0].value);
  const [company, setCompany] = useState("");
  const [context, setContext] = useState("");
  const [depth, setDepth] = useState<ReportDepth>("standard");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [streamContent, setStreamContent] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    setReportType(REPORT_TYPES[0].value);
    setCompany("");
    setContext("");
    setDepth("standard");
    setGenerating(false);
    setProgress("");
    setStreamContent("");
    setSources([]);
    setReportId(null);
  }

  function handleClose() {
    if (abortRef.current) abortRef.current.abort();
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!company.trim()) {
      toast.error("Please enter a company or topic");
      return;
    }
    setGenerating(true);
    setProgress("Initializing...");
    setStreamContent("");
    setSources([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await apiSSE(
        "/reports",
        { reportType, company: company.trim(), additionalContext: context.trim(), depth },
        (event, data) => {
          try {
            const parsed = JSON.parse(data);
            switch (event) {
              case "progress":
                setProgress(parsed.message ?? parsed.status ?? "Processing...");
                break;
              case "content":
                setStreamContent((prev) => prev + (parsed.delta ?? parsed.text ?? parsed.content ?? ""));
                break;
              case "report_created":
                setReportId(parsed.id ?? null);
                setProgress("Generating report...");
                break;
              case "source":
                setSources((prev) => [...prev, parsed.name ?? parsed.source ?? "Source"]);
                break;
              case "complete":
              case "done":
                setReportId(parsed.id ?? parsed.reportId ?? null);
                setProgress("Complete");
                queryClient.invalidateQueries({ queryKey: ["reports"] });
                break;
              case "error":
                toast.error(parsed.message ?? "Generation failed");
                setGenerating(false);
                break;
              default:
                // Handle generic message events
                if (parsed.text || parsed.content) {
                  setStreamContent((prev) => prev + (parsed.text ?? parsed.content ?? ""));
                }
                if (parsed.progress || parsed.status) {
                  setProgress(parsed.progress ?? parsed.status);
                }
                break;
            }
          } catch {
            // Non-JSON data, treat as raw content
            setStreamContent((prev) => prev + data);
          }
        },
        controller.signal,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Report generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-[#27272A] bg-[#18181B] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#27272A] bg-[#18181B] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#FAFAFA]">Generate Deep Report</h2>
            <p className="mt-0.5 text-xs text-[#A1A1AA]">
              {generating ? progress : "Pull from all intelligence sources"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!generating && !reportId ? (
            <div className="space-y-5">
              {/* Report Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#FAFAFA]">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Company / Topic */}
              <Input
                id="report-company"
                label="Company / Topic"
                placeholder="e.g. Salesforce, AI SaaS market, Series B prospects"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />

              {/* Additional Context */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#FAFAFA]">
                  Additional Context <span className="font-normal text-[#71717A]">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Any specific angles, competitors, time frames, or focus areas..."
                  rows={3}
                  className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] resize-none"
                />
              </div>

              {/* Depth Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#FAFAFA]">Depth</label>
                <div className="flex rounded-lg border border-[#27272A] overflow-hidden">
                  {(["quick", "standard", "deep"] as ReportDepth[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        depth === d
                          ? "bg-[#6366F1] text-white"
                          : "bg-[#18181B] text-[#A1A1AA] hover:bg-[#18181B]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#71717A]">
                  {depth === "quick" && "5-10 pages. Fast overview with key findings."}
                  {depth === "standard" && "20-40 pages. Thorough analysis with supporting data."}
                  {depth === "deep" && "50-100 pages. Comprehensive deep-dive with full citations."}
                </p>
              </div>

              <Button className="w-full" onClick={handleSubmit}>
                <Sparkles className="h-4 w-4" />
                Generate Report
              </Button>
            </div>
          ) : (
            /* Streaming / generation view */
            <div className="space-y-4">
              {/* Progress bar */}
              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[#6366F1]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">{progress}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#27272A] overflow-hidden">
                    <div className="h-full rounded-full bg-[#6366F1] animate-pulse" style={{ width: "60%" }} />
                  </div>
                </div>
              )}

              {/* Sources found */}
              {sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((s, i) => (
                    <Badge key={i} variant="info">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Streamed content preview */}
              {streamContent && (
                <div className="max-h-80 overflow-y-auto rounded-lg border border-[#27272A] bg-[#18181B] p-4">
                  <div className="prose prose-sm max-w-none text-[#FAFAFA]">
                    <ReportMarkdown content={streamContent} />
                  </div>
                </div>
              )}

              {/* Done state */}
              {reportId && !generating && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={() => {
                      handleClose();
                      navigate(`/reports/${reportId}`);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                    View Full Report
                  </Button>
                  <Button variant="secondary" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Inline markdown renderer ---------- */

function ReportMarkdown({ content }: { content: string }) {
  return <ReactMarkdown>{content}</ReactMarkdown>;
}

/* ---------- Reports Tab ---------- */

function ReportsTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: () =>
      api<{ reports: Report[] }>("/reports").then((r) => r.reports),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted");
    },
    onError: () => toast.error("Failed to delete report"),
  });

  async function generateWeeklyBrief() {
    setGeneratingBrief(true);
    try {
      let reportId: string | null = null;
      await apiSSE(
        "/reports",
        {
          reportType: "weekly_intelligence_brief",
          company: "Our Company",
          additionalContext: "Auto-generated weekly intelligence brief for CMO Monday morning read.",
          depth: "standard",
        },
        (event, data) => {
          try {
            const parsed = JSON.parse(data);
            if (event === "report_created" || event === "complete" || event === "done") {
              reportId = parsed.id ?? parsed.reportId ?? reportId;
            }
          } catch {
            // ignore
          }
        },
      );
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Weekly Intelligence Brief generated");
      if (reportId) {
        navigate(`/reports/${reportId}`);
      }
    } catch {
      toast.error("Failed to generate brief");
    } finally {
      setGeneratingBrief(false);
    }
  }

  const filtered = reports?.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function getStatusBadge(status: Report["status"]) {
    switch (status) {
      case "ready":
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "generating":
        return (
          <Badge variant="info">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Generating
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
    }
  }

  function getTypeBadgeColor(type: string) {
    const map: Record<string, BadgeProps["variant"]> = {
      "CMO Monthly Brief": "indigo",
      "Campaign ROI Analysis": "info",
      "Competitive Landscape Report": "warning",
      "Market Sizing & TAM Analysis": "error",
      "Customer Journey Analysis": "success",
      "Channel Performance Dashboard": "default",
      "Brand Health Report": "info",
      "Growth Opportunity Assessment": "success",
    };
    return map[type] ?? "default";
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-xs" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <GenerateReportDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <div className="space-y-4">
        {/* Weekly Intelligence Brief */}
        <div className="rounded-lg border border-[#6366F1]/20 bg-[#6366F1]/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#FAFAFA]">Weekly Intelligence Brief</h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">Auto-generated every Monday. Your CMO morning read.</p>
            </div>
            <Button size="sm" onClick={() => generateWeeklyBrief()} loading={generatingBrief}>
              {generatingBrief ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search + Create */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#27272A] bg-[#18181B] pl-9 pr-3 text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1]"
            />
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Report Cards */}
        {!filtered || filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-[#A1A1AA] mb-4">
              {searchQuery ? "No reports match your search" : "No reports yet"}
            </p>
            {!searchQuery ? (
              <button
                className="text-[13px] text-[#6366F1] hover:underline"
                onClick={() => setDialogOpen(true)}
              >
                + Generate your first report
              </button>
            ) : (
              <p className="text-[13px] text-[#71717A]">Try a different search term.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer transition-colors hover:border-[#6366F1]/30 group"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <div className="mb-2 flex items-start justify-between">
                  <p className="text-sm font-medium text-[#FAFAFA] truncate pr-2">
                    {report.title}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this report?")) {
                        deleteMutation.mutate(report.id);
                      }
                    }}
                    className="shrink-0 rounded p-1 text-[#3F3F46] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#EF4444]/10 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <Badge variant={getTypeBadgeColor(report.type)}>
                    {report.type}
                  </Badge>
                  {getStatusBadge(report.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                  <span>{format(new Date(report.createdAt), "MMM d, yyyy")}</span>
                  {report.depth && (
                    <span className="capitalize">{report.depth}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Main Page ---------- */

export default function BoardsPage() {
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);

  return (
    <Page
      title="Boards"
      subtitle="Live dashboards, report boards, and monitoring boards"
      actions={
        <Button size="sm" onClick={() => setHeaderDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      }
    >
      <CreateBoardDialog
        open={headerDialogOpen}
        onClose={() => setHeaderDialogOpen(false)}
      />
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "dashboards") return <DashboardsTab />;
          if (activeTab === "reports") return <ReportsTab />;
          return <AutomationsTab />;
        }}
      </Tabs>
    </Page>
  );
}
