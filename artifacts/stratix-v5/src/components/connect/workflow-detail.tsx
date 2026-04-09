import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, CheckCircle, Clock, AlertCircle, Loader2, Play,
  ArrowRight, Activity, RotateCw, ChevronRight, Terminal,
} from "lucide-react";

export interface WorkflowDetailProps {
  workflowId: string;
  open: boolean;
  onClose: () => void;
}

type StepStatus = "pending" | "running" | "done" | "error";

type WorkflowStep = {
  name: string;
  status: StepStatus;
  duration?: number;
  output?: string;
  error?: string;
};

type ExecutionRecord = {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  stepsCompleted: number;
  totalSteps: number;
  error?: string;
};

type WorkflowOverview = {
  name: string;
  description: string;
  status: string;
  triggerType: string;
  schedule?: string;
  createdAt: string;
  steps: WorkflowStep[];
};

type LogLine = {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
};

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusIcon(status: StepStatus | string) {
  const s = status.toLowerCase();
  if (s === "done" || s === "complete" || s === "completed") return CheckCircle;
  if (s === "running") return Loader2;
  if (s === "error" || s === "failed") return AlertCircle;
  return Clock;
}

function statusColor(status: StepStatus | string) {
  const s = status.toLowerCase();
  if (s === "done" || s === "complete" || s === "completed") return "var(--success, #3C8B4E)";
  if (s === "running") return "var(--accent)";
  if (s === "error" || s === "failed") return "var(--error)";
  return "var(--text-muted)";
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "done" || s === "complete" || s === "completed") return "bg-[#D5E8D8] text-[#3C8B4E]";
  if (s === "running") return "bg-[#D5DDE8] text-[#3C5E8B]";
  if (s === "error" || s === "failed") return "bg-[#E8D5D5] text-[var(--error)]";
  return "bg-[var(--surface-secondary)] text-[var(--text-muted)]";
}

export function WorkflowDetail({ workflowId, open, onClose }: WorkflowDetailProps) {
  const [overview, setOverview] = useState<WorkflowOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"steps" | "history" | "logs">("steps");
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load workflow overview
  useEffect(() => {
    if (!open || !workflowId) return;
    setLoading(true);
    fetch(`/api/pipedream/workflows/${workflowId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setOverview({
          name: data.name || "Untitled Workflow",
          description: data.description || "",
          status: data.status || data.active ? "active" : "inactive",
          triggerType: data.trigger?.type || "manual",
          schedule: data.trigger?.cron || data.schedule,
          createdAt: data.createdAt || new Date().toISOString(),
          steps: data.steps || [],
        });
      })
      .catch(() => {
        setOverview({
          name: `Workflow ${workflowId.slice(0, 8)}`,
          description: "Could not load workflow details.",
          status: "unknown",
          triggerType: "manual",
          createdAt: new Date().toISOString(),
          steps: [],
        });
      })
      .finally(() => setLoading(false));
  }, [open, workflowId]);

  // Load execution history
  useEffect(() => {
    if (!open || !workflowId || tab !== "history") return;
    setLoadingHistory(true);
    fetch(`/api/pipedream/workflows/${workflowId}/executions`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.executions || data?.data || [];
        setHistory(arr);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [open, workflowId, tab]);

  // Poll logs when viewing live logs
  useEffect(() => {
    if (!open || !workflowId || tab !== "logs") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const fetchLogs = () => {
      fetch(`/api/pipedream/workflows/${workflowId}/logs`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const arr = Array.isArray(data) ? data : data?.logs || data?.data || [];
          setLogs(arr);
        })
        .catch(() => {});
    };

    fetchLogs();
    pollRef.current = setInterval(fetchLogs, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, workflowId, tab]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleRetryStep = useCallback(
    async (stepIndex: number) => {
      try {
        await fetch(`/api/pipedream/workflows/${workflowId}/retry`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromStep: stepIndex }),
        });
      } catch {}
    },
    [workflowId],
  );

  if (!open) return null;

  const isRunning = overview?.steps?.some((s) => s.status === "running");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center">
              <Activity className="h-4.5 w-4.5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-editorial text-[18px] text-[var(--text-primary)]">
                {loading ? "Loading..." : overview?.name || "Workflow"}
              </h2>
              {overview?.description && (
                <p className="text-caption text-[var(--text-secondary)]">{overview.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-body-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workflow...
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Overview Meta */}
            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Status", value: overview.status, badge: true },
                  { label: "Trigger", value: overview.triggerType },
                  { label: "Schedule", value: overview.schedule || "None" },
                  { label: "Created", value: formatDate(new Date(overview.createdAt)) },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">{item.label}</p>
                    {item.badge ? (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeClass(item.value)}`}>
                        {item.value}
                      </span>
                    ) : (
                      <p className="text-body-sm font-medium text-[var(--text-primary)] mt-0.5">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--surface-secondary)]">
              {[
                { id: "steps" as const, label: "Steps" },
                { id: "history" as const, label: "Execution History" },
                { id: "logs" as const, label: `Live Logs${isRunning ? " (active)" : ""}` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-caption font-medium transition-colors ${
                    tab === t.id
                      ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t.label}
                  {t.id === "logs" && isRunning && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Steps Visualization */}
            {tab === "steps" && (
              <div className="space-y-4">
                {/* Horizontal Pipeline */}
                {overview && overview.steps.length > 0 ? (
                  <>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex items-center gap-0 min-w-max px-2">
                        {overview.steps.map((step, i) => {
                          const Icon = statusIcon(step.status);
                          const color = statusColor(step.status);
                          const isLast = i === overview.steps.length - 1;
                          return (
                            <div key={i} className="flex items-center">
                              <button
                                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors min-w-[120px] cursor-pointer"
                                style={{ borderColor: expandedStep === i ? color : undefined }}
                              >
                                <Icon
                                  className={`h-5 w-5 ${step.status === "running" ? "animate-spin" : ""}`}
                                  style={{ color }}
                                />
                                <span className="text-caption font-medium text-[var(--text-primary)] text-center leading-tight">
                                  {step.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadgeClass(step.status)}`}
                                >
                                  {step.status === "done" ? "Complete" : step.status === "running" ? "Running..." : step.status === "error" ? "Failed" : "Pending"}
                                </span>
                                {step.duration != null && (
                                  <span className="text-[11px] text-[var(--text-muted)]">{step.duration}ms</span>
                                )}
                              </button>
                              {!isLast && (
                                <div className="flex items-center px-1">
                                  <div className="w-6 h-px bg-[var(--border)]" />
                                  <ArrowRight className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
                                  <div className="w-6 h-px bg-[var(--border)]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expanded Step Detail */}
                    {expandedStep !== null && overview.steps[expandedStep] && (() => {
                      const step = overview.steps[expandedStep];
                      return (
                        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-[var(--text-muted)]" />
                              <p className="text-body-sm font-medium text-[var(--text-primary)]">{step.name}</p>
                            </div>
                            {step.status === "error" && (
                              <button
                                onClick={() => handleRetryStep(expandedStep)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                              >
                                <RotateCw className="h-3 w-3" />
                                Retry from this step
                              </button>
                            )}
                          </div>
                          {step.output && (
                            <pre className="bg-[var(--surface-secondary)] font-mono text-[13px] rounded-lg p-4 overflow-x-auto text-[var(--text-primary)] max-h-40 overflow-y-auto">
                              {step.output}
                            </pre>
                          )}
                          {step.error && (
                            <div className="p-3 rounded-[var(--radius-md)] border border-[var(--error)]/20 bg-[var(--error)]/5">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-3.5 w-3.5 text-[var(--error)]" />
                                <p className="text-caption font-medium text-[var(--error)]">Error</p>
                              </div>
                              <p className="text-caption text-[var(--text-primary)]">{step.error}</p>
                            </div>
                          )}
                          {!step.output && !step.error && (
                            <p className="text-caption text-[var(--text-muted)]">No output available for this step.</p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No step information available.</p>
                )}
              </div>
            )}

            {/* Execution History */}
            {tab === "history" && (
              <div>
                {loadingHistory ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-caption text-[var(--text-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No execution history yet.</p>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-caption">
                      <thead>
                        <tr className="bg-[var(--surface-secondary)]">
                          <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Started</th>
                          <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Duration</th>
                          <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Status</th>
                          <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Steps</th>
                          <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((rec) => {
                          const durationSec =
                            rec.completedAt && rec.startedAt
                              ? Math.round(
                                  (new Date(rec.completedAt).getTime() - new Date(rec.startedAt).getTime()) / 1000,
                                )
                              : null;
                          return (
                            <tr key={rec.id} className="border-t border-[var(--border)]">
                              <td className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap">
                                {formatDate(new Date(rec.startedAt))} {formatTime(new Date(rec.startedAt))}
                              </td>
                              <td className="px-3 py-2 text-[var(--text-secondary)]">
                                {durationSec != null ? `${durationSec}s` : "--"}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadgeClass(rec.status)}`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-[var(--text-secondary)]">
                                {rec.stepsCompleted}/{rec.totalSteps}
                              </td>
                              <td className="px-3 py-2 text-[var(--error)] truncate max-w-[200px]">
                                {rec.error || "--"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Live Logs */}
            {tab === "logs" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <span className="flex items-center gap-1 text-caption text-[var(--accent)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      Polling every 3s
                    </span>
                  )}
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] max-h-80 overflow-y-auto font-mono text-[13px]">
                  {logs.length === 0 ? (
                    <p className="text-caption text-[var(--text-muted)] py-8 text-center font-sans">
                      No log lines available. Logs appear here when a workflow is executing.
                    </p>
                  ) : (
                    <div className="p-3 space-y-0.5">
                      {logs.map((line, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-[var(--text-muted)] shrink-0 w-[70px]">
                            {formatTime(new Date(line.ts))}
                          </span>
                          <span
                            className={`shrink-0 w-[40px] text-[11px] font-medium ${
                              line.level === "error"
                                ? "text-[var(--error)]"
                                : line.level === "warn"
                                  ? "text-[#8B7A3C]"
                                  : "text-[var(--text-muted)]"
                            }`}
                          >
                            {line.level.toUpperCase()}
                          </span>
                          <span className="text-[var(--text-primary)] break-all">{line.message}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
