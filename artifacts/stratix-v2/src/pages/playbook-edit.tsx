import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { api, apiPatch, apiPost } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Play,
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";

type StepType = "checklist" | "review" | "extract" | "compare" | "flag";

interface PlaybookStep {
  type: StepType;
  title: string;
  config: Record<string, unknown>;
  required?: boolean;
}

interface Playbook {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: PlaybookStep[];
  tags?: string[];
}

const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: "checklist", label: "Checklist" },
  { value: "review", label: "Review" },
  { value: "extract", label: "Extract" },
  { value: "compare", label: "Compare" },
  { value: "flag", label: "Flag" },
];

const CATEGORIES = ["compliance", "security", "onboarding", "audit", "operations", "custom"];

const TYPE_VARIANT: Record<StepType, "default" | "success" | "warning" | "info" | "error"> = {
  checklist: "success",
  review: "info",
  extract: "default",
  compare: "warning",
  flag: "error",
};

export default function PlaybookEditPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/playbooks/:id");
  const id = params?.id;

  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Playbook>(`/playbooks/${id}`)
      .then(setPlaybook)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!playbook) return;
    setSaving(true);
    try {
      const updated = await apiPatch<Playbook>(`/playbooks/${playbook.id}`, {
        name: playbook.name,
        description: playbook.description,
        category: playbook.category,
        steps: playbook.steps,
        tags: playbook.tags,
      });
      setPlaybook(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!playbook) return;
    setRunning(true);
    try {
      const run = await apiPost<{ id: string }>(`/playbooks/${playbook.id}/execute`, {});
      navigate(`/playbooks/runs/${run.id}`);
    } finally {
      setRunning(false);
    }
  }

  async function handleGenerate() {
    if (!playbook || !aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await apiPost<{ steps: PlaybookStep[] }>(
        `/playbooks/${playbook.id}/generate`,
        { prompt: aiPrompt },
      );
      setPlaybook({ ...playbook, steps: result.steps });
      setAiPrompt("");
    } finally {
      setGenerating(false);
    }
  }

  function updateField<K extends keyof Playbook>(key: K, value: Playbook[K]) {
    if (!playbook) return;
    setPlaybook({ ...playbook, [key]: value });
  }

  function addStep() {
    if (!playbook) return;
    setPlaybook({
      ...playbook,
      steps: [...playbook.steps, { type: "checklist", title: "", config: {}, required: true }],
    });
  }

  function removeStep(index: number) {
    if (!playbook) return;
    setPlaybook({ ...playbook, steps: playbook.steps.filter((_, i) => i !== index) });
  }

  function updateStep(index: number, patch: Partial<PlaybookStep>) {
    if (!playbook) return;
    const steps = playbook.steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
    setPlaybook({ ...playbook, steps });
  }

  function moveStep(index: number, direction: -1 | 1) {
    if (!playbook) return;
    const target = index + direction;
    if (target < 0 || target >= playbook.steps.length) return;
    const steps = [...playbook.steps];
    const tmp = steps[index]!;
    steps[index] = steps[target]!;
    steps[target] = tmp;
    setPlaybook({ ...playbook, steps });
  }

  if (loading) {
    return (
      <Page title="Playbook">
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      </Page>
    );
  }

  if (!playbook) {
    return (
      <Page title="Playbook">
        <p className="text-sm text-[#9CA3AF] py-20 text-center">Playbook not found.</p>
      </Page>
    );
  }

  return (
    <Page
      title="Edit Playbook"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button onClick={handleRun} loading={running}>
            <Play className="h-4 w-4" />
            Run Playbook
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metadata */}
        <Card className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1">Name</label>
              <Input
                value={playbook.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Playbook name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1">Category</label>
              <select
                value={playbook.category ?? ""}
                onChange={(e) => updateField("category", e.target.value || undefined)}
                className="flex h-9 w-full rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm text-[#0A0A0A] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404040] mb-1">Description</label>
            <textarea
              value={playbook.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe what this playbook does..."
              rows={2}
              className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
          </div>
        </Card>

        {/* AI Generate */}
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[#0A0A0A] flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </h3>
          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe what steps this playbook should have..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button
              variant="secondary"
              onClick={handleGenerate}
              loading={generating}
              disabled={!aiPrompt.trim()}
            >
              Generate
            </Button>
          </div>
        </Card>

        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0A0A0A]">
              Steps ({playbook.steps.length})
            </h3>
            <Button size="sm" variant="secondary" onClick={addStep}>
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </Button>
          </div>

          {playbook.steps.length === 0 ? (
            <Card className="text-center py-8 text-[#9CA3AF]">
              <p className="text-sm">No steps yet. Add one manually or generate with AI.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {playbook.steps.map((step, i) => (
                <Card key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="text-[#9CA3AF] hover:text-[#0A0A0A] disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-[#9CA3AF] font-mono">{i + 1}</span>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === playbook.steps.length - 1}
                      className="text-[#9CA3AF] hover:text-[#0A0A0A] disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, { type: e.target.value as StepType })}
                        className="h-8 rounded-lg border border-[#E5E5E3] bg-white px-2 text-xs text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <Badge variant={TYPE_VARIANT[step.type]}>{step.type}</Badge>
                    </div>
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(i, { title: e.target.value })}
                      placeholder="Step title"
                      className="text-sm"
                    />
                    {step.type === "checklist" && (
                      <Input
                        value={(step.config.items as string) ?? ""}
                        onChange={(e) => updateStep(i, { config: { ...step.config, items: e.target.value } })}
                        placeholder="Comma-separated checklist items"
                        className="text-xs"
                      />
                    )}
                    {step.type === "extract" && (
                      <Input
                        value={(step.config.fields as string) ?? ""}
                        onChange={(e) => updateStep(i, { config: { ...step.config, fields: e.target.value } })}
                        placeholder="Fields to extract (comma-separated)"
                        className="text-xs"
                      />
                    )}
                    {step.type === "compare" && (
                      <Input
                        value={(step.config.sources as string) ?? ""}
                        onChange={(e) => updateStep(i, { config: { ...step.config, sources: e.target.value } })}
                        placeholder="Data sources to compare"
                        className="text-xs"
                      />
                    )}
                    {step.type === "flag" && (
                      <Input
                        value={(step.config.criteria as string) ?? ""}
                        onChange={(e) => updateStep(i, { config: { ...step.config, criteria: e.target.value } })}
                        placeholder="Flag criteria"
                        className="text-xs"
                      />
                    )}
                    {step.type === "review" && (
                      <Input
                        value={(step.config.reviewers as string) ?? ""}
                        onChange={(e) => updateStep(i, { config: { ...step.config, reviewers: e.target.value } })}
                        placeholder="Required reviewers (comma-separated)"
                        className="text-xs"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => removeStep(i)}
                    className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
