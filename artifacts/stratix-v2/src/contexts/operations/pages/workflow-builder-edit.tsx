import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { api, apiPut, apiPost } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Rocket,
  Play,
  Loader2,
} from "lucide-react";

const STEP_TYPES = [
  { value: "prompt", label: "Prompt" },
  { value: "tool", label: "Tool" },
  { value: "branch", label: "Branch" },
  { value: "loop", label: "Loop" },
  { value: "human_review", label: "Human Review" },
  { value: "data_pull", label: "Data Pull" },
  { value: "action", label: "Action" },
];

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "schedule", label: "Schedule" },
  { value: "data_change", label: "Data Change" },
];

interface Step {
  id: string;
  type: string;
  name: string;
  config: string;
}

interface TriggerConfig {
  type: string;
  cron?: string;
  source?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published";
  steps: Step[];
  trigger: TriggerConfig;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function WorkflowBuilderEditPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/workflow-builder/:id");
  const defId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [steps, setSteps] = useState<Step[]>([]);
  const [trigger, setTrigger] = useState<TriggerConfig>({ type: "manual" });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const def = await api<WorkflowDefinition>(
          `/workflow-definitions/${defId}`,
        );
        setName(def.name);
        setDescription(def.description ?? "");
        setStatus(def.status);
        setSteps(
          (def.steps ?? []).map((s: Partial<Step>) => ({
            id: (s as Step).id ?? makeId(),
            type: (s as Step).type ?? "prompt",
            name: (s as Step).name ?? "",
            config: (s as Step).config ?? "",
          })),
        );
        setTrigger(def.trigger ?? { type: "manual" });
      } catch {
        setError("Failed to load workflow definition");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [defId]);

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { id: makeId(), type: "prompt", name: "", config: "" },
    ]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id: string, field: keyof Step, value: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await apiPut(`/workflow-definitions/${defId}`, {
        name,
        description,
        steps,
        trigger,
      });
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setSaving(true);
    setError("");
    try {
      await apiPut(`/workflow-definitions/${defId}`, {
        name,
        description,
        steps,
        trigger,
      });
      await apiPost(`/workflow-definitions/${defId}/publish`, {});
      setStatus("published");
    } catch {
      setError("Failed to publish");
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    try {
      await apiPost(`/workflow-definitions/${defId}/trigger`, {});
      navigate("/workflow-builder");
    } catch {
      setError("Failed to trigger workflow");
    }
  }

  if (loading) {
    return (
      <Page title="Edit Workflow">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Edit Workflow"
      subtitle={name || "Untitled"}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/workflow-builder")}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button variant="secondary" onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button variant="secondary" onClick={handlePublish} loading={saving}>
            <Rocket className="w-4 h-4" />
            Publish
          </Button>
          {status === "published" && (
            <Button onClick={handleRun}>
              <Play className="w-4 h-4" />
              Run
            </Button>
          )}
        </div>
      }
    >
      {error && (
        <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: name, description, steps */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#404040] mb-1.5">
                  Workflow Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <label className="block text-sm text-[#404040] mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="Describe what this workflow does"
                />
              </div>
            </div>
          </Card>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[#404040]">
                Steps ({steps.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={addStep}>
                <Plus className="w-3.5 h-3.5" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#E5E5E3] rounded-xl">
                <p className="text-sm text-[#9CA3AF]">No steps yet</p>
                <Button variant="ghost" className="mt-2" onClick={addStep}>
                  <Plus className="w-4 h-4" />
                  Add first step
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <Card key={step.id} className="relative">
                    <div className="flex items-start gap-3">
                      {/* Reorder controls */}
                      <div className="flex flex-col items-center gap-0.5 pt-1">
                        <button
                          className="p-0.5 text-[#9CA3AF] hover:text-[#0A0A0A] disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, -1)}
                          title="Move up"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {idx + 1}
                        </span>
                        <button
                          className="p-0.5 text-[#9CA3AF] hover:text-[#0A0A0A] disabled:opacity-30"
                          disabled={idx === steps.length - 1}
                          onClick={() => moveStep(idx, 1)}
                          title="Move down"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                      </div>

                      {/* Step fields */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-36">
                            <Select
                              value={step.type}
                              onChange={(e) =>
                                updateStep(step.id, "type", e.target.value)
                              }
                              options={STEP_TYPES}
                            />
                          </div>
                          <Input
                            value={step.name}
                            onChange={(e) =>
                              updateStep(step.id, "name", e.target.value)
                            }
                            placeholder="Step name"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                          </Button>
                        </div>

                        <textarea
                          value={step.config}
                          onChange={(e) =>
                            updateStep(step.id, "config", e.target.value)
                          }
                          rows={3}
                          className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-xs font-mono text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          placeholder='Step configuration (JSON or prompt text)'
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: trigger config, status */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-[#404040] mb-3">Status</h3>
            <Badge variant={status === "published" ? "success" : "default"}>
              {status}
            </Badge>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-[#404040] mb-3">Trigger</h3>
            <div className="space-y-3">
              <Select
                value={trigger.type}
                onChange={(e) =>
                  setTrigger((prev) => ({ ...prev, type: e.target.value }))
                }
                options={TRIGGER_TYPES}
              />

              {trigger.type === "schedule" && (
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">
                    Cron Expression
                  </label>
                  <Input
                    value={trigger.cron ?? ""}
                    onChange={(e) =>
                      setTrigger((prev) => ({ ...prev, cron: e.target.value }))
                    }
                    placeholder="0 9 * * 1-5"
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {trigger.type === "data_change" && (
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">
                    Data Source
                  </label>
                  <Input
                    value={trigger.source ?? ""}
                    onChange={(e) =>
                      setTrigger((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    placeholder="e.g. vault/project-123"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
