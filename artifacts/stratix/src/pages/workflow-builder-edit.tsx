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
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Settings,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  type: "ai_prompt" | "data_lookup" | "document_analysis" | "conditional" | "transform" | "notify" | "human_review" | "api_call";
  name: string;
  description?: string;
  config: Record<string, any>;
  order: number;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: "draft" | "published";
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed";
  stepTraces: StepTrace[];
  createdAt: string;
  completedAt?: string;
}

interface StepTrace {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: any;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

const STEP_TYPES = [
  { value: "ai_prompt", label: "AI Prompt" },
  { value: "data_lookup", label: "Data Lookup" },
  { value: "document_analysis", label: "Document Analysis" },
  { value: "conditional", label: "Conditional" },
  { value: "transform", label: "Transform" },
  { value: "notify", label: "Notify" },
  { value: "human_review", label: "Human Review" },
  { value: "api_call", label: "API Call" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--workspace-muted)",
  published: "#16a34a",
  pending: "#ca8a04",
  running: "#3b82f6",
  completed: "#16a34a",
  failed: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

export function WorkflowBuilderEdit() {
  const [location, navigate] = useLocation();
  const workflowId = location.split("/").pop();
  const [executionId, setExecutionId] = useState<string | null>(null);
  const isNew = workflowId === "new";

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Get execution ID from query params
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    setExecutionId(params.get("execution"));
  }, [location]);

  // Fetch workflow definition and execution if applicable
  useEffect(() => {
    if (!workflowId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // If creating a new workflow, initialize with blank template
        if (isNew) {
          const blankWorkflow: WorkflowDefinition = {
            id: "new",
            name: "Untitled Workflow",
            description: "",
            steps: [],
            status: "draft",
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setWorkflow(blankWorkflow);
        } else {
          // Fetch workflow definition
          const workflowResponse = await fetch(`/api/workflow-definitions/${workflowId}`, {
            credentials: "include",
          });
          if (workflowResponse.ok) {
            const workflowData = await workflowResponse.json();
            setWorkflow(workflowData);
          }

          // Fetch execution if provided
          if (executionId) {
            const executionResponse = await fetch(`/api/workflow-executions/${executionId}`, {
              credentials: "include",
            });
            if (executionResponse.ok) {
              const executionData = await executionResponse.json();
              setExecution(executionData);
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

  const handleSave = async () => {
    if (!workflow) return;

    setSaving(true);
    try {
      if (isNew) {
        // Create new workflow
        const response = await fetch("/api/workflow-definitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps,
          }),
        });

        if (response.ok) {
          const created = await response.json();
          setWorkflow(created);
          // Navigate to the newly created workflow
          navigate(`/workflow-builder/${created.id}`);
        } else {
          alert("Failed to create workflow");
        }
      } else {
        // Update existing workflow
        const response = await fetch(`/api/workflow-definitions/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps,
          }),
        });

        if (response.ok) {
          const updated = await response.json();
          setWorkflow(updated);
        } else {
          alert("Failed to save workflow");
        }
      }
    } catch (error) {
      alert("Error saving workflow");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!workflow) return;

    // Cannot publish a new unsaved workflow
    if (isNew) {
      alert("Please save the workflow first before publishing");
      return;
    }

    try {
      const response = await fetch(`/api/workflow-definitions/${workflowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publish: workflow.status === "draft" }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWorkflow(updated);
      } else {
        alert("Failed to publish workflow");
      }
    } catch (error) {
      alert("Error publishing workflow");
    }
  };

  const handleExecute = async () => {
    if (!workflow) return;

    // Cannot execute a new unsaved workflow
    if (isNew) {
      alert("Please save the workflow first before executing");
      return;
    }

    try {
      const response = await fetch("/api/workflow-executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workflowId: workflow.id,
          inputs: {},
        }),
      });

      if (response.ok) {
        const newExecution = await response.json();
        setExecution(newExecution);
        setExecutionId(newExecution.id);
      } else {
        alert("Failed to execute workflow");
      }
    } catch (error) {
      alert("Error executing workflow");
    }
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!workflow) return;

    const updatedSteps = workflow.steps.map((step) =>
      step.id === stepId ? { ...step, ...updates } : step
    );

    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const addStep = () => {
    if (!workflow) return;

    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: "ai_prompt",
      name: "New Step",
      description: "",
      config: {},
      order: workflow.steps.length,
    };

    setWorkflow({
      ...workflow,
      steps: [...workflow.steps, newStep],
    });
  };

  const removeStep = (stepId: string) => {
    if (!workflow) return;

    const updatedSteps = workflow.steps
      .filter((step) => step.id !== stepId)
      .map((step, index) => ({ ...step, order: index }));

    setWorkflow({ ...workflow, steps: updatedSteps });
    setEditingStep(null);
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    if (!workflow) return;

    const index = workflow.steps.findIndex((step) => step.id === stepId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === workflow.steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...workflow.steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    const updatedSteps = newSteps.map((step, i) => ({ ...step, order: i }));
    setWorkflow({ ...workflow, steps: updatedSteps });
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepTypeLabel = (type: string) => {
    return STEP_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getStepIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      ai_prompt: "✨",
      data_lookup: "🔍",
      document_analysis: "📄",
      conditional: "⚡",
      transform: "🔄",
      notify: "📢",
      human_review: "👤",
      api_call: "🔗",
    };
    return iconMap[type] || "⚙️";
  };

  if (loading) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="h-16 animate-pulse" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse" style={{ background: "var(--workspace-muted-bg)" }} />
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
      {/* Header with Back Link */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/workflow-builder")}
          className="flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
          style={{ color: "var(--workspace-muted)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      {/* Title Section */}
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
            style={{
              color: "var(--workspace-fg)",
              background: "transparent",
              borderBottom: "1px solid transparent",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--workspace-border)")}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] mb-2 block" style={{ color: "var(--workspace-muted)" }}>
            Description
          </label>
          <textarea
            value={workflow.description}
            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
            className="w-full text-sm focus:outline-none resize-none"
            rows={3}
            style={{
              color: "var(--workspace-fg)",
              background: "transparent",
              borderBottom: "1px solid transparent",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--workspace-border)")}
            onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          />
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5"
              style={{
                border: "1px solid var(--workspace-border)",
                color: STATUS_COLORS[workflow.status],
              }}
            >
              {STATUS_LABELS[workflow.status]}
            </span>
            <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
              v{workflow.version}
            </span>
            <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
              Last updated {format(new Date(workflow.updatedAt), "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
              style={{
                background: "var(--workspace-fg)",
                color: "#FFFFFF",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
              style={{
                border: "1px solid var(--workspace-border)",
                color: workflow.status === "draft" ? "var(--workspace-fg)" : "var(--workspace-muted)",
                background: "#FFFFFF",
              }}
            >
              {workflow.status === "draft" ? "Publish" : "Published"}
            </button>

            {workflow.status === "published" && (
              <button
                onClick={handleExecute}
                className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
                style={{
                  background: "#16a34a",
                  color: "#FFFFFF",
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Execute
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step Editor or Execution Trace */}
      {execution && executionId ? (
        <ExecutionTrace execution={execution} workflow={workflow} />
      ) : (
        <StepEditor
          workflow={workflow}
          editingStep={editingStep}
          expandedSteps={expandedSteps}
          onAddStep={addStep}
          onRemoveStep={removeStep}
          onUpdateStep={updateStep}
          onMoveStep={moveStep}
          onToggleExpanded={toggleStepExpanded}
          onSetEditingStep={setEditingStep}
          getStepTypeLabel={getStepTypeLabel}
          getStepIcon={getStepIcon}
        />
      )}
    </div>
  );
}

interface StepEditorProps {
  workflow: WorkflowDefinition;
  editingStep: string | null;
  expandedSteps: Set<string>;
  onAddStep: () => void;
  onRemoveStep: (stepId: string) => void;
  onUpdateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
  onMoveStep: (stepId: string, direction: "up" | "down") => void;
  onToggleExpanded: (stepId: string) => void;
  onSetEditingStep: (stepId: string | null) => void;
  getStepTypeLabel: (type: string) => string;
  getStepIcon: (type: string) => React.ReactNode;
}

function StepEditor({
  workflow,
  editingStep,
  expandedSteps,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onMoveStep,
  onToggleExpanded,
  onSetEditingStep,
  getStepTypeLabel,
  getStepIcon,
}: StepEditorProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--workspace-muted)" }}>
        Workflow Steps
      </h2>

      <div className="space-y-3">
        {workflow.steps.length === 0 ? (
          <div className="py-12 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
            <Settings className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
            <p className="text-sm mb-6" style={{ color: "var(--workspace-muted)" }}>
              No steps yet. Add your first step to get started.
            </p>
          </div>
        ) : (
          workflow.steps.map((step, index) => (
            <div
              key={step.id}
              className="group transition-colors"
              style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
            >
              {/* Step Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => onToggleExpanded(step.id)}>
                <GripVertical className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--workspace-muted)" }}>
                    Step {index + 1}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wide px-2 py-0.5"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: "var(--workspace-muted)",
                    }}
                  >
                    {getStepTypeLabel(step.type)}
                  </span>
                </div>

                <span className="font-medium" style={{ color: "var(--workspace-fg)" }}>
                  {step.name}
                </span>

                {step.description && (
                  <span className="text-xs flex-1 line-clamp-1" style={{ color: "var(--workspace-muted)" }}>
                    {step.description}
                  </span>
                )}

                <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveStep(step.id, "up");
                    }}
                    disabled={index === 0}
                    className="h-6 w-6 flex items-center justify-center transition-colors"
                    style={{
                      color: index === 0 ? "var(--workspace-border)" : "var(--workspace-muted)",
                    }}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveStep(step.id, "down");
                    }}
                    disabled={index === workflow.steps.length - 1}
                    className="h-6 w-6 flex items-center justify-center transition-colors"
                    style={{
                      color:
                        index === workflow.steps.length - 1
                          ? "var(--workspace-border)"
                          : "var(--workspace-muted)",
                    }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStep(step.id);
                    }}
                    className="h-6 w-6 flex items-center justify-center transition-colors"
                    style={{ color: "#dc2626" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {expandedSteps.has(step.id) ? (
                  <ChevronUp className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
                ) : (
                  <ChevronDown className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
                )}
              </div>

              {/* Step Details */}
              {expandedSteps.has(step.id) && (
                <div className="px-4 py-4 border-t" style={{ borderColor: "var(--workspace-border)", background: "var(--workspace-muted-bg)" }}>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--workspace-muted)" }}>
                        Step Type
                      </label>
                      <select
                        value={step.type}
                        onChange={(e) =>
                          onUpdateStep(step.id, {
                            type: e.target.value as WorkflowStep["type"],
                          })
                        }
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--workspace-border)",
                          color: "var(--workspace-fg)",
                        }}
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--workspace-muted)" }}>
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => onUpdateStep(step.id, { name: e.target.value })}
                        className="w-full px-3 py-2 text-xs focus:outline-none"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--workspace-border)",
                          color: "var(--workspace-fg)",
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--workspace-muted)" }}>
                        Description
                      </label>
                      <textarea
                        value={step.description || ""}
                        onChange={(e) => onUpdateStep(step.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 text-xs focus:outline-none resize-none"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--workspace-border)",
                          color: "var(--workspace-fg)",
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: "var(--workspace-muted)" }}>
                        Configuration (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(step.config, null, 2)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            onUpdateStep(step.id, { config });
                          } catch (error) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={4}
                        className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-none"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--workspace-border)",
                          color: "var(--workspace-fg)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Step Button */}
      <button
        onClick={onAddStep}
        className="flex items-center justify-center gap-2 w-full py-4 transition-colors"
        style={{
          border: "2px dashed var(--workspace-border)",
          color: "var(--workspace-muted)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest">Add Step</span>
      </button>
    </div>
  );
}

interface ExecutionTraceProps {
  execution: WorkflowExecution;
  workflow: WorkflowDefinition;
}

function ExecutionTrace({ execution, workflow }: ExecutionTraceProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <h2 className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--workspace-muted)" }}>
          Execution Trace
        </h2>
        <span
          className="text-[10px] uppercase tracking-wide px-2 py-0.5"
          style={{
            border: "1px solid var(--workspace-border)",
            color: STATUS_COLORS[execution.status] || "var(--workspace-muted)",
          }}
        >
          {STATUS_LABELS[execution.status]}
        </span>
      </div>

      <div className="space-y-3">
        {workflow.steps.map((step, index) => {
          const trace = execution.stepTraces?.find((t) => t.stepId === step.id);
          const isRunning = execution.status === "running" && trace?.status === "running";

          return (
            <div
              key={step.id}
              className="p-4 space-y-3 transition-colors"
              style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  {trace?.status === "completed" && (
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#16a34a" }} />
                  )}
                  {trace?.status === "failed" && (
                    <XCircle className="h-4 w-4" style={{ color: "#dc2626" }} />
                  )}
                  {trace?.status === "running" && (
                    <Clock className="h-4 w-4 animate-spin" style={{ color: "#3b82f6" }} />
                  )}
                  {(trace?.status === "pending" || !trace) && (
                    <Clock className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
                  )}

                  <div className="min-w-0">
                    <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>
                      Step {index + 1}: {step.name}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--workspace-muted)" }}>
                      {getStepTypeLabel(step.type)}
                    </span>
                  </div>
                </div>

                {trace?.status && (
                  <span
                    className={`text-[10px] uppercase tracking-wide px-2 py-0.5 shrink-0 ${
                      isRunning ? "animate-pulse" : ""
                    }`}
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: STATUS_COLORS[trace.status],
                    }}
                  >
                    {STATUS_LABELS[trace.status]}
                  </span>
                )}
              </div>

              {/* Timing */}
              {trace?.startedAt && (
                <div className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                  <span>Started: {format(new Date(trace.startedAt), "HH:mm:ss")}</span>
                  {trace.completedAt && (
                    <span>
                      {" · "}
                      Completed: {format(new Date(trace.completedAt), "HH:mm:ss")}
                    </span>
                  )}
                </div>
              )}

              {/* Input/Output Data */}
              {(trace?.input || trace?.output || trace?.error) && (
                <div className="space-y-2 text-xs">
                  {trace.input && (
                    <details className="group cursor-pointer">
                      <summary className="font-medium transition-colors" style={{ color: "var(--workspace-muted)" }}>
                        Input Data
                      </summary>
                      <pre className="mt-2 p-2 text-[10px] overflow-auto" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-fg)" }}>
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </details>
                  )}

                  {trace.output && (
                    <details className="group cursor-pointer">
                      <summary className="font-medium transition-colors" style={{ color: "var(--workspace-muted)" }}>
                        Output Data
                      </summary>
                      <pre className="mt-2 p-2 text-[10px] overflow-auto" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-fg)" }}>
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </details>
                  )}

                  {trace.error && (
                    <div
                      className="p-2 rounded"
                      style={{ background: "#fecaca", color: "#991b1b" }}
                    >
                      <div className="font-medium flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Error
                      </div>
                      <pre className="mt-1 text-[10px] overflow-auto">
                        {trace.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {execution.completedAt && (
        <div
          className="p-4 text-center text-xs"
          style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-muted)" }}
        >
          Execution completed at {format(new Date(execution.completedAt), "MMM d, yyyy HH:mm:ss")}
        </div>
      )}
    </div>
  );
}

// Helper function
function getStepTypeLabel(type: string): string {
  const types = STEP_TYPES.find((t) => t.value === type);
  return types?.label || type;
}
