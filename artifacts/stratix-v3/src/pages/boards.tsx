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
  LayoutGrid,
  Play,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  FileText,
  Activity,
  Eye,
  Wrench,
  Search,
  BookOpen,
  Sparkles,
  Trash2,
  X,
  Radio,
  Bell,
  Send,
} from "lucide-react";

/* ---------- Types ---------- */

interface Board {
  id: string;
  title: string;
  type: "live" | "report" | "monitor";
  updatedAt: string;
  cardCount?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  intakeQuestions: { id: string; label: string }[];
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
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
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
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-base font-semibold text-[#111827]">
            Create Board
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
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
            <label className="text-sm font-medium text-[#111827]">
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
                        ? "border-[#4F46E5] bg-[#EEF2FF]"
                        : "border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        selected
                          ? "bg-[#4F46E5] text-white"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          selected ? "text-[#4F46E5]" : "text-[#111827]"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#6B7280]">
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
            <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[#111827]">
                <Bell className="h-4 w-4 text-[#4F46E5]" />
                Monitor Configuration
              </div>

              {/* What to monitor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#6B7280]">
                  What to monitor
                </label>
                <textarea
                  value={monitorTarget}
                  onChange={(e) => setMonitorTarget(e.target.value)}
                  placeholder="e.g. Competitor pricing changes, new product launches, market shifts"
                  rows={2}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
                />
              </div>

              {/* Check frequency */}
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

              {/* Alert condition */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#6B7280]">
                  Alert me when
                </label>
                <textarea
                  value={alertCondition}
                  onChange={(e) => setAlertCondition(e.target.value)}
                  placeholder='e.g. "competitor launches new product", "market share changes >5%"'
                  rows={2}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
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
          <p className="text-[15px] text-[#6B7280] mb-4">No boards yet</p>
          <button
            className="text-[13px] text-[#4F46E5] hover:underline"
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
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-[#111827]">Delete this board?</p>
            <p className="mt-2 text-sm text-[#6B7280]">This cannot be undone.</p>
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
            className="group relative cursor-pointer transition-colors hover:border-[#4F46E5]/30"
            onClick={() => navigate(`/boards/${board.id}`)}
          >
            {/* Delete button on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(board.id);
              }}
              className="absolute right-2 top-2 rounded p-1 text-[#D1D5DB] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#111827] truncate pr-6">
                {board.title}
              </p>
              {getTypeBadge(board.type)}
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
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
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-[#6B7280] transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New Board</span>
        </button>
      </div>
    </>
  );
}

/* ---------- Automations Tab ---------- */

/* ---------- AI Workflow Creator ---------- */

function AIWorkflowCreator() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Please describe the workflow you want to create");
      return;
    }
    setCreating(true);
    try {
      // Create the workflow definition
      const data = await apiPost<{ definition: WorkflowDefinition }>(
        "/workflow-definitions",
        {
          name: "AI Generated Workflow",
          description: trimmed,
          steps: [],
        },
      );
      // Trigger AI step generation
      try {
        await apiPost(`/workflow-definitions/${data.definition.id}/generate`, {
          prompt: trimmed,
        });
      } catch {
        // Generation endpoint may not exist yet -- definition still created
      }
      toast.success("Workflow created -- review the steps before running");
      setPrompt("");
      navigate(`/workflows/builder?id=${data.definition.id}`);
    } catch {
      toast.error("Failed to create workflow");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#4F46E5]" />
        <span className="text-sm font-semibold text-[#111827]">
          Describe a workflow
        </span>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='e.g., "Every Monday, pull competitor pricing from their websites and compare with our rates"'
        rows={3}
        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleCreate();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-[#9CA3AF]">
          Ctrl+Enter to submit
        </p>
        <Button
          size="sm"
          onClick={handleCreate}
          loading={creating}
          disabled={!prompt.trim()}
        >
          <Send className="h-3.5 w-3.5" />
          Create Workflow
        </Button>
      </div>
    </div>
  );
}

/* ---------- Automations Tab ---------- */

function AutomationsTab() {
  const [, navigate] = useLocation();

  const { data: templates, isLoading: templatesLoading } = useQuery<
    WorkflowTemplate[]
  >({
    queryKey: ["workflow-templates"],
    queryFn: () =>
      api<{ templates: WorkflowTemplate[] }>("/workflows/templates").then(
        (r) => r.templates,
      ),
  });

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

  const isLoading = templatesLoading || runsLoading || defsLoading;

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
      {/* AI Workflow Creator */}
      <AIWorkflowCreator />

      {/* Workflow Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">
              Workflow Templates
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Pre-built intelligence workflows ready to run.
            </p>
          </div>
        </div>
        {templates && templates.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-sm font-medium text-[#111827]">
                      {tpl.name}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {tpl.description}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">
                    {tpl.intakeQuestions.length} intake question
                    {tpl.intakeQuestions.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/workflows/${tpl.id}/run`)
                    }
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10">
            <Zap className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">
              No templates available
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Workflow templates will appear here when configured.
            </p>
          </Card>
        )}
      </div>

      {/* Custom Workflow Definitions */}
      {definitions && definitions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">
                Custom Workflows
              </h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Your custom workflow definitions.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/workflows/builder")}
            >
              <Wrench className="h-3.5 w-3.5" />
              Builder
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {definitions.map((def) => (
              <Card key={def.id}>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#6B7280]" />
                  <p className="text-sm font-medium text-[#111827]">
                    {def.name}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {def.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#9CA3AF]">
                  <span>{def.stepCount} steps</span>
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
          <h3 className="text-sm font-semibold text-[#111827]">Recent Runs</h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            History of workflow executions.
          </p>
        </div>
        {runs && runs.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Workflow
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Output
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB]"
                  >
                    <td className="px-4 py-3 font-medium text-[#111827]">
                      {run.templateName}
                    </td>
                    <td className="px-4 py-3">
                      {getRunStatusBadge(run.status)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {format(new Date(run.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[#6B7280]">
                      {run.outputPreview ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[15px] text-[#6B7280] mb-4">No runs yet</p>
            <p className="text-[13px] text-[#9CA3AF]">
              Run a workflow template to see results here.
            </p>
          </div>
        )}
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
  "CMO Monthly Brief",
  "Campaign ROI Analysis",
  "Competitive Landscape Report",
  "Market Sizing & TAM Analysis",
  "Customer Journey Analysis",
  "Channel Performance Dashboard",
  "Brand Health Report",
  "Growth Opportunity Assessment",
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
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
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
    setReportType(REPORT_TYPES[0]);
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
        { type: reportType, company: company.trim(), context: context.trim(), depth },
        (event, data) => {
          try {
            const parsed = JSON.parse(data);
            switch (event) {
              case "progress":
                setProgress(parsed.message ?? parsed.status ?? "Processing...");
                break;
              case "content":
                setStreamContent((prev) => prev + (parsed.text ?? parsed.content ?? ""));
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
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Generate Deep Report</h2>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              {generating ? progress : "Pull from all intelligence sources"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!generating && !reportId ? (
            <div className="space-y-5">
              {/* Report Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#111827]">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
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
                <label className="text-sm font-medium text-[#111827]">
                  Additional Context <span className="font-normal text-[#9CA3AF]">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Any specific angles, competitors, time frames, or focus areas..."
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] resize-none"
                />
              </div>

              {/* Depth Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#111827]">Depth</label>
                <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
                  {(["quick", "standard", "deep"] as ReportDepth[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        depth === d
                          ? "bg-[#4F46E5] text-white"
                          : "bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9CA3AF]">
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
                  <div className="flex items-center gap-2 text-sm text-[#4F46E5]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">{progress}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div className="h-full rounded-full bg-[#4F46E5] animate-pulse" style={{ width: "60%" }} />
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
                <div className="max-h-80 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <div className="prose prose-sm max-w-none text-[#111827]">
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
        {/* Search + Create */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
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
            <p className="text-[15px] text-[#6B7280] mb-4">
              {searchQuery ? "No reports match your search" : "No reports yet"}
            </p>
            {!searchQuery ? (
              <button
                className="text-[13px] text-[#4F46E5] hover:underline"
                onClick={() => setDialogOpen(true)}
              >
                + Generate your first report
              </button>
            ) : (
              <p className="text-[13px] text-[#9CA3AF]">Try a different search term.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer transition-colors hover:border-[#4F46E5]/30 group"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <div className="mb-2 flex items-start justify-between">
                  <p className="text-sm font-medium text-[#111827] truncate pr-2">
                    {report.title}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this report?")) {
                        deleteMutation.mutate(report.id);
                      }
                    }}
                    className="shrink-0 rounded p-1 text-[#D1D5DB] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
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
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
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
