import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  Play,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MessageSquare,
  Wrench,
  Database,
  Zap,
  GitBranch,
  Repeat,
  UserCheck,
} from "lucide-react";
import { StepConfigForm } from "@/components/workflow/step-config-forms";
import { ExecutionTraceView } from "@/components/workflow/execution-trace-view";
import { TriggerConfigSection } from "@/components/workflow/trigger-config-section";

// ─── Types ─────────────────────────────────────────────────────

interface WorkflowStep {
  id?: number;
  /** Client-only key for React list rendering */
  _key: string;
  type: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  stepIndex: number;
}

interface WorkflowDefinition {
  id: number;
  name: string;
  description: string;
  icon?: string;
  config: Record<string, any>;
  steps: WorkflowStep[];
  status: string;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionStep {
  id: number;
  stepIndex: number;
  stepType: string;
  stepName: string;
  status: string;
  input?: any;
  output?: any;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

interface WorkflowExecution {
  id: number;
  status: string;
  title: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  steps: ExecutionStep[];
  createdAt: string;
  completedAt?: string;
}

// ─── Constants ─────────────────────────────────────────────────

const STEP_TYPES = [
  { value: "prompt", label: "AI Prompt", icon: MessageSquare, description: "Call an LLM with a prompt" },
  { value: "tool", label: "Tool Call", icon: Wrench, description: "Execute a function or tool" },
  { value: "data_pull", label: "Data Pull", icon: Database, description: "Fetch data from a source" },
  { value: "action", label: "Action", icon: Zap, description: "Perform an external action" },
  { value: "branch", label: "Branch", icon: GitBranch, description: "Conditional logic" },
  { value: "loop", label: "Loop", icon: Repeat, description: "Iterate over items" },
  { value: "human_review", label: "Human Review", icon: UserCheck, description: "Require human approval" },
] as const;

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

function getDefaultConfig(type: string): Record<string, any> {
  switch (type) {
    case "prompt":
      return { systemPrompt: "", analysisPrompt: "", model: "gpt-4o", temperature: 0.7, maxTokens: 4096, outputFormat: "markdown" };
    case "tool":
      return { toolName: "", inputMapping: "", timeout: 30 };
    case "data_pull":
      return { source: "vault", query: "", limit: 10 };
    case "action":
      return { action: "notify", params: {} };
    case "branch":
      return { expression: "", trueStepIndex: 0, falseStepIndex: -1 };
    case "loop":
      return { itemsSource: "", maxIterations: 10, bodyDescription: "" };
    case "human_review":
      return { reviewerPrompt: "", timeoutHours: 24, onTimeout: "escalate" };
    default:
      return {};
  }
}

// ─── Main Component ────────────────────────────────────────────

export function WorkflowBuilderEdit() {
  const [location, navigate] = useLocation();
  const pathParts = location.split("?")[0].split("/").filter(Boolean);
  const workflowId = pathParts[pathParts.length - 1];
  const isNew = workflowId === "new";

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showStepPicker, setShowStepPicker] = useState(false);

  // Parse execution ID from query params
  const executionId = (() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    return params.get("execution");
  })();

  // Fetch workflow and execution data
  useEffect(() => {
    if (!workflowId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (isNew) {
          setWorkflow({
            id: 0,
            name: "Untitled Workflow",
            description: "",
            config: { trigger: { type: "manual" } },
            steps: [],
            status: "draft",
            isPublished: false,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          const resp = await fetch(`/api/workflow-definitions/${workflowId}`, {
            credentials: "include",
          });
          if (resp.ok) {
            const data = await resp.json();
            // Normalize steps with _key for React rendering
            const steps = (data.steps || []).map((s: any) => ({
              ...s,
              _key: `step-${s.id || Date.now()}-${s.stepIndex}`,
              name: s.name || `Step ${s.stepIndex + 1}`,
              config: s.config || {},
            }));
            setWorkflow({ ...data, steps });
          }

          if (executionId) {
            const execResp = await fetch(`/api/workflow-executions/${executionId}`, {
              credentials: "include",
            });
            if (execResp.ok) {
              setExecution(await execResp.json());
            }
          }
        }
      } catch (error) {
        console.error("Error fetching workflow:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workflowId, executionId, isNew]);

  // ─── Handlers ──────────────────────────────────────────────

  const handleSave = async () => {
    if (!workflow) return;
    setSaving(true);

    const payload = {
      name: workflow.name,
      description: workflow.description || "",
      icon: workflow.icon || null,
      config: workflow.config || { trigger: { type: "manual" } },
      steps: workflow.steps.map((step, index) => ({
        type: step.type,
        name: step.name,
        description: step.description || null,
        config: step.config,
      })),
    };

    try {
      const url = isNew
        ? "/api/workflow-definitions"
        : `/api/workflow-definitions/${workflowId}`;
      const method = isNew ? "POST" : "PUT";

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const saved = await resp.json();
        const steps = (saved.steps || []).map((s: any) => ({
          ...s,
          _key: `step-${s.id || Date.now()}-${s.stepIndex}`,
          name: s.name || `Step ${s.stepIndex + 1}`,
          config: s.config || {},
        }));
        setWorkflow({ ...saved, steps });

        if (isNew) {
          navigate(`/workflow-builder/${saved.id}`);
        }
      } else {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || "Failed to save workflow");
      }
    } catch {
      alert("Error saving workflow");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflow || isNew) {
      alert("Save the workflow before publishing.");
      return;
    }
    try {
      const resp = await fetch(`/api/workflow-definitions/${workflowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publish: workflow.status === "draft" }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        const steps = (updated.steps || []).map((s: any) => ({
          ...s,
          _key: `step-${s.id}-${s.stepIndex}`,
          name: s.name || `Step ${s.stepIndex + 1}`,
          config: s.config || {},
        }));
        setWorkflow({ ...updated, steps });
      }
    } catch {
      alert("Error publishing workflow");
    }
  };

  const handleExecute = async () => {
    if (!workflow || isNew) {
      alert("Save the workflow before executing.");
      return;
    }
    try {
      const resp = await fetch(`/api/workflow-definitions/${workflowId}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inputs: {}, title: `Manual run: ${workflow.name}` }),
      });
      if (resp.ok) {
        const exec = await resp.json();
        navigate(`/workflow-builder/${workflowId}?execution=${exec.id}`);
      } else {
        const err = await resp.json().catch(() => ({}));
        alert(err.error || "Failed to execute workflow");
      }
    } catch {
      alert("Error executing workflow");
    }
  };

  const addStep = (type: string) => {
    if (!workflow) return;
    const stepInfo = STEP_TYPES.find((t) => t.value === type);
    const newStep: WorkflowStep = {
      _key: `step-new-${Date.now()}`,
      type,
      name: stepInfo?.label || "New Step",
      description: "",
      config: getDefaultConfig(type),
      stepIndex: workflow.steps.length,
    };
    setWorkflow({ ...workflow, steps: [...workflow.steps, newStep] });
    setExpandedSteps(new Set([...expandedSteps, newStep._key]));
    setShowStepPicker(false);
  };

  const removeStep = (key: string) => {
    if (!workflow) return;
    const updated = workflow.steps
      .filter((s) => s._key !== key)
      .map((s, i) => ({ ...s, stepIndex: i }));
    setWorkflow({ ...workflow, steps: updated });
  };

  const updateStep = (key: string, updates: Partial<WorkflowStep>) => {
    if (!workflow) return;
    const steps = workflow.steps.map((s) =>
      s._key === key ? { ...s, ...updates } : s
    );
    setWorkflow({ ...workflow, steps });
  };

  const moveStep = (key: string, direction: "up" | "down") => {
    if (!workflow) return;
    const idx = workflow.steps.findIndex((s) => s._key === key);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === workflow.steps.length - 1)) return;

    const newSteps = [...workflow.steps];
    const target = direction === "up" ? idx - 1 : idx + 1;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setWorkflow({
      ...workflow,
      steps: newSteps.map((s, i) => ({ ...s, stepIndex: i })),
    });
  };

  const toggleExpanded = (key: string) => {
    const next = new Set(expandedSteps);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSteps(next);
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="h-16 animate-pulse" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--workspace-muted-bg)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="py-16 text-center">
        <p style={{ color: "var(--workspace-muted)" }}>Workflow not found</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Back Link */}
      <button
        onClick={() => navigate("/workflow-builder")}
        className="flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
        style={{ color: "var(--workspace-muted)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Header */}
      <div className="pb-6 border-b space-y-6" style={{ borderColor: "var(--workspace-border)" }}>
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] mb-2 block" style={{ color: "var(--workspace-muted)" }}>
            Workflow Name
          </label>
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            className="w-full text-3xl font-light font-serif mb-2 focus:outline-none"
            style={{ color: "var(--workspace-fg)", background: "transparent", borderBottom: "1px solid transparent", transition: "border-color 0.2s" }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--workspace-border)")}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] mb-2 block" style={{ color: "var(--workspace-muted)" }}>
            Description
          </label>
          <textarea
            value={workflow.description || ""}
            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
            className="w-full text-sm focus:outline-none resize-none"
            rows={2}
            placeholder="Describe what this workflow does..."
            style={{ color: "var(--workspace-fg)", background: "transparent", borderBottom: "1px solid transparent", transition: "border-color 0.2s" }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--workspace-border)")}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          />
        </div>

        {/* Status Bar & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5"
              style={{ border: "1px solid var(--workspace-border)", color: STATUS_COLORS[workflow.status] || "var(--workspace-muted)" }}
            >
              {STATUS_LABELS[workflow.status] || workflow.status}
            </span>
            <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
              v{workflow.version || 1}
            </span>
            {!isNew && (
              <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                Updated {format(new Date(workflow.updatedAt), "MMM d, yyyy")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF", opacity: saving ? 0.6 : 1 }}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>

            {!isNew && (
              <button
                onClick={handlePublish}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
                style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
              >
                {workflow.status === "draft" ? "Publish" : "Published"}
              </button>
            )}

            {!isNew && workflow.isPublished && (
              <button
                onClick={handleExecute}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
                style={{ background: "#16a34a", color: "#FFFFFF" }}
              >
                <Play className="h-3.5 w-3.5" />
                Run
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Execution Trace or Step Editor */}
      {execution && executionId ? (
        <ExecutionTraceView execution={execution} steps={workflow.steps} />
      ) : (
        <>
          {/* Trigger Configuration */}
          <div className="pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
            <TriggerConfigSection
              config={workflow.config}
              onChange={(config) => setWorkflow({ ...workflow, config })}
            />
          </div>

          {/* Steps List */}
          <div className="space-y-6">
            <h2 className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--workspace-muted)" }}>
              Workflow Steps ({workflow.steps.length})
            </h2>

            {workflow.steps.length === 0 ? (
              <div className="py-12 text-center" style={{ border: "1px dashed var(--workspace-border)" }}>
                <MessageSquare className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
                <p className="text-sm mb-2" style={{ color: "var(--workspace-muted)" }}>
                  No steps yet. Add your first step to build your workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {workflow.steps.map((step, index) => {
                  const typeInfo = STEP_TYPES.find((t) => t.value === step.type);
                  const Icon = typeInfo?.icon || Zap;
                  const isExpanded = expandedSteps.has(step._key);

                  return (
                    <div
                      key={step._key}
                      className="group transition-colors"
                      style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
                    >
                      {/* Step Header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                        onClick={() => toggleExpanded(step._key)}
                      >
                        <GripVertical className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />

                        <span className="text-xs font-medium shrink-0" style={{ color: "var(--workspace-muted)" }}>
                          {index + 1}
                        </span>

                        <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />

                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 shrink-0"
                          style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}
                        >
                          {typeInfo?.label || step.type}
                        </span>

                        <span className="font-medium truncate" style={{ color: "var(--workspace-fg)" }}>
                          {step.name}
                        </span>

                        {/* Reorder & Delete */}
                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(step._key, "up"); }}
                            disabled={index === 0}
                            className="h-6 w-6 flex items-center justify-center"
                            style={{ color: index === 0 ? "var(--workspace-border)" : "var(--workspace-muted)" }}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveStep(step._key, "down"); }}
                            disabled={index === workflow.steps.length - 1}
                            className="h-6 w-6 flex items-center justify-center"
                            style={{ color: index === workflow.steps.length - 1 ? "var(--workspace-border)" : "var(--workspace-muted)" }}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStep(step._key); }}
                            className="h-6 w-6 flex items-center justify-center"
                            style={{ color: "#dc2626" }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                        )}
                      </div>

                      {/* Expanded Config */}
                      {isExpanded && (
                        <div
                          className="px-4 py-4 border-t space-y-4"
                          style={{ borderColor: "var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
                        >
                          {/* Step Type Selector */}
                          <div>
                            <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "var(--workspace-muted)" }}>
                              Step Type
                            </label>
                            <select
                              value={step.type}
                              onChange={(e) => {
                                const newType = e.target.value;
                                updateStep(step._key, {
                                  type: newType,
                                  config: getDefaultConfig(newType),
                                });
                              }}
                              className="w-full px-3 py-2 text-xs focus:outline-none"
                              style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                            >
                              {STEP_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Step Name */}
                          <div>
                            <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "var(--workspace-muted)" }}>
                              Step Name
                            </label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => updateStep(step._key, { name: e.target.value })}
                              className="w-full px-3 py-2 text-xs focus:outline-none"
                              style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                            />
                          </div>

                          {/* Step Description */}
                          <div>
                            <label className="text-xs uppercase tracking-widest mb-1.5 block" style={{ color: "var(--workspace-muted)" }}>
                              Description
                            </label>
                            <textarea
                              value={step.description || ""}
                              onChange={(e) => updateStep(step._key, { description: e.target.value })}
                              rows={2}
                              placeholder="Optional description..."
                              className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
                              style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                            />
                          </div>

                          {/* Type-Specific Config Form */}
                          <div className="pt-2 border-t" style={{ borderColor: "var(--workspace-border)" }}>
                            <h3
                              className="text-[10px] uppercase tracking-[0.2em] mb-3"
                              style={{ color: "var(--workspace-muted)" }}
                            >
                              {typeInfo?.label || step.type} Configuration
                            </h3>
                            <StepConfigForm
                              stepType={step.type}
                              config={step.config}
                              onChange={(config) => updateStep(step._key, { config })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Step */}
            {showStepPicker ? (
              <div style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--workspace-border)" }}>
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>
                    Choose Step Type
                  </span>
                  <button
                    onClick={() => setShowStepPicker(false)}
                    className="text-xs"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3">
                  {STEP_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => addStep(t.value)}
                        className="flex items-start gap-3 p-3 text-left transition-colors"
                        style={{ border: "1px solid var(--workspace-border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
                      >
                        <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--workspace-muted)" }} />
                        <div>
                          <span className="text-xs font-medium block" style={{ color: "var(--workspace-fg)" }}>
                            {t.label}
                          </span>
                          <span className="text-[10px] block mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                            {t.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStepPicker(true)}
                className="flex items-center justify-center gap-2 w-full py-4 transition-colors"
                style={{ border: "2px dashed var(--workspace-border)", color: "var(--workspace-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs uppercase tracking-widest">Add Step</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

