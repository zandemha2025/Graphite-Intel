import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  Zap,
  Plus,
  Play,
  Copy,
  Trash2,
  Clock,
  ChevronRight,
  Timer,
  Database,
  BarChart3,
  Hand,
} from "lucide-react";

interface WorkflowDefinition {
  id: number;
  name: string;
  description: string;
  config: Record<string, any>;
  status: string;
  isPublished: boolean;
  version: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TRIGGER_BADGES: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  manual: { label: "Manual", icon: Hand, color: "var(--workspace-muted)" },
  cron: { label: "Scheduled", icon: Timer, color: "#3b82f6" },
  data_change: { label: "Auto", icon: Database, color: "#8b5cf6" },
  threshold: { label: "Threshold", icon: BarChart3, color: "#f59e0b" },
  webhook: { label: "Webhook", icon: Zap, color: "#06b6d4" },
  event: { label: "Event", icon: Zap, color: "#10b981" },
};

function getTriggerType(config: Record<string, any> | null | undefined): string {
  return config?.trigger?.type ?? "manual";
}

interface WorkflowExecution {
  id: number;
  workflowDefinitionId: number | null;
  title: string;
  status: string;
  triggeredByUserId: string;
  createdAt: string;
  completedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--workspace-muted)",
  published: "#16a34a",
  pending: "#ca8a04",
  "in-progress": "#3b82f6",
  completed: "#16a34a",
  failed: "#dc2626",
  cancelled: "var(--workspace-muted)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  pending: "Pending",
  "in-progress": "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function WorkflowBuilder() {
  const [, navigate] = useLocation();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(true);
  const [activeTab, setActiveTab] = useState<"workflows" | "executions">("workflows");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    // Fetch workflow definitions
    fetch("/api/workflow-definitions", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setWorkflows(Array.isArray(data) ? data : []);
        setLoadingWorkflows(false);
      })
      .catch(() => setLoadingWorkflows(false));

    // Fetch workflow executions
    fetch("/api/workflow-executions", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setExecutions(Array.isArray(data) ? data : []);
        setLoadingExecutions(false);
      })
      .catch(() => setLoadingExecutions(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this workflow definition? This action cannot be undone.")) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch(`/api/workflow-definitions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setWorkflows(workflows.filter((w) => w.id !== id));
      } else {
        alert("Failed to delete workflow");
      }
    } catch (error) {
      alert("Error deleting workflow");
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (workflow: WorkflowDefinition) => {
    try {
      const response = await fetch(`/api/workflow-definitions/${workflow.id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows([...workflows, newWorkflow]);
      } else {
        alert("Failed to duplicate workflow");
      }
    } catch (error) {
      alert("Error duplicating workflow");
    }
  };

  const handlePublish = async (id: number, publish: boolean) => {
    try {
      const response = await fetch(`/api/workflow-definitions/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publish }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWorkflows(workflows.map((w) => (w.id === id ? updated : w)));
      } else {
        alert("Failed to publish workflow");
      }
    } catch (error) {
      alert("Error publishing workflow");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-10 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-5 w-5" style={{ color: "var(--workspace-muted)" }} />
          <h1 className="font-sans text-2xl font-semibold tracking-tight" style={{ color: "var(--workspace-fg)" }}>
            Workflow Builder
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--workspace-muted)" }}>
          Design custom AI-powered workflows that automate your strategic work.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 mb-8 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <button
          onClick={() => setActiveTab("workflows")}
          className="pb-4 font-medium text-sm transition-colors"
          style={{
            color: activeTab === "workflows" ? "var(--workspace-fg)" : "var(--workspace-muted)",
            borderBottom: activeTab === "workflows" ? "2px solid var(--workspace-fg)" : "none",
          }}
        >
          My Workflows
        </button>
        <button
          onClick={() => setActiveTab("executions")}
          className="pb-4 font-medium text-sm transition-colors"
          style={{
            color: activeTab === "executions" ? "var(--workspace-fg)" : "var(--workspace-muted)",
            borderBottom: activeTab === "executions" ? "2px solid var(--workspace-fg)" : "none",
          }}
        >
          Executions
        </button>
      </div>

      {/* My Workflows Tab */}
      {activeTab === "workflows" && (
        <div className="space-y-6">
          {/* Create Button */}
          <div className="flex justify-end">
            <button
              onClick={() => navigate("/workflow-builder/new")}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create New Workflow
            </button>
          </div>

          {/* Workflows Grid */}
          {loadingWorkflows ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 animate-pulse h-48"
                  style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
                />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="py-16 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
              <Zap className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
              <h3 className="font-sans text-xl font-light mb-2" style={{ color: "var(--workspace-muted)" }}>
                No workflows yet
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--workspace-muted)" }}>
                Create your first custom workflow to automate strategic processes.
              </p>
              <button
                onClick={() => navigate("/workflow-builder/new")}
                className="inline-block text-xs font-medium pb-0.5 transition-colors"
                style={{ color: "var(--workspace-fg)", borderBottom: "1px solid var(--workspace-border)" }}
              >
                Create First Workflow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="group flex flex-col gap-4 p-5 transition-colors"
                  style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                      <span
                        className="font-sans text-base font-light transition-colors"
                        style={{ color: "var(--workspace-fg)" }}
                      >
                        {workflow.name}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {workflow.description && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--workspace-muted)" }}>
                      {workflow.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs mt-auto" style={{ color: "var(--workspace-muted)" }}>
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      <span>{Number(workflow.usageCount) || 0} runs</span>
                    </div>
                  </div>

                  {/* Status, Trigger & Version */}
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--workspace-border)" }}>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5"
                      style={{
                        border: "1px solid var(--workspace-border)",
                        color: STATUS_COLORS[workflow.status],
                      }}
                    >
                      {STATUS_LABELS[workflow.status]}
                    </span>
                    {(() => {
                      const triggerType = getTriggerType(workflow.config);
                      const badge = TRIGGER_BADGES[triggerType] ?? TRIGGER_BADGES.manual!;
                      const TriggerIcon = badge.icon;
                      return (
                        <span
                          className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5"
                          style={{ border: `1px solid ${badge.color}33`, color: badge.color }}
                        >
                          <TriggerIcon className="h-2.5 w-2.5" />
                          {badge.label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                      v{Number(workflow.version) || 1}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: "var(--workspace-border)" }}>
                    <button
                      onClick={() => navigate(`/workflow-builder/${workflow.id}`)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(workflow)}
                      className="flex items-center justify-center h-7 w-7 transition-colors"
                      style={{ color: "var(--workspace-muted)" }}
                      title="Duplicate workflow"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        handlePublish(
                          workflow.id,
                          workflow.status === "draft"
                        )
                      }
                      className="flex items-center justify-center h-7 w-7 transition-colors"
                      style={{ color: "var(--workspace-muted)" }}
                      title={workflow.status === "draft" ? "Publish" : "Unpublish"}
                    >
                      {workflow.status === "draft" ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" style={{ color: "#16a34a" }} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      disabled={deleting === workflow.id}
                      className="flex items-center justify-center h-7 w-7 transition-colors opacity-0 group-hover:opacity-100"
                      style={{ color: deleting === workflow.id ? "var(--workspace-muted)" : "#dc2626" }}
                      title="Delete workflow"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === "executions" && (
        <div className="space-y-6">
          <h2 className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
            Recent Executions
          </h2>

          {loadingExecutions ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse"
                  style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
                />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <div className="py-16 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
              <Clock className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
              <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
                No executions yet. Run a workflow to see the history.
              </p>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--workspace-border)" }}>
              {executions.map((execution, i) => (
                <Link
                  key={execution.id}
                  href={execution.workflowDefinitionId ? `/workflow-builder/${execution.workflowDefinitionId}?execution=${execution.id}` : "#"}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors group"
                  style={{
                    borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                    background: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--workspace-muted-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>
                      {execution.title}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      execution.status === "in-progress" ? "animate-pulse" : ""
                    }`}
                    style={{ color: STATUS_COLORS[execution.status] || "var(--workspace-muted)" }}
                  >
                    {STATUS_LABELS[execution.status] || execution.status}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--workspace-muted)" }}>
                    {format(new Date(execution.createdAt), "MMM d, yyyy")}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper icon component
function CheckCircle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
