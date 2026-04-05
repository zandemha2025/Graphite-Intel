import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  Sparkles,
  Loader2,
  CheckSquare,
  Clock,
} from "lucide-react";
import { StepEditor, type PlaybookStep } from "@/components/playbook/step-editor";

// ---- Types ----

interface PlaybookData {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  steps: PlaybookStep[];
  isTemplate: boolean | null;
  isPublished: boolean | null;
  version: number | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface RunSummary {
  id: number;
  title: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "due_diligence", label: "Due Diligence" },
  { value: "compliance", label: "Compliance" },
  { value: "audit", label: "Audit" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

// ---- Component ----

export function PlaybookEdit() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  const pathParts = location.split("?")[0].split("/").filter(Boolean);
  const playbookId = pathParts[pathParts.length - 1];
  const isNew = playbookId === "new";

  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);

  // Fetch runs for existing playbooks
  useEffect(() => {
    if (isNew) return;
    const fetchRuns = async () => {
      try {
        const res = await fetch(`/api/playbooks/${playbookId}/runs`, { credentials: "include" });
        if (res.ok) setRuns(await res.json());
      } catch { /* ignore */ }
    };
    fetchRuns();
  }, [playbookId, isNew]);

  // Fetch or init
  useEffect(() => {
    if (isNew) {
      setPlaybook({
        id: 0,
        name: "Untitled Playbook",
        description: null,
        category: "custom",
        steps: [],
        isTemplate: false,
        isPublished: false,
        version: 1,
        tags: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    const fetchPlaybook = async () => {
      try {
        const res = await fetch(`/api/playbooks/${playbookId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setPlaybook(data);
        } else {
          toast({ title: "Playbook not found", variant: "destructive" });
          navigate("/playbooks");
        }
      } catch {
        toast({ title: "Failed to load playbook", variant: "destructive" });
      }
      setLoading(false);
    };
    fetchPlaybook();
  }, [playbookId, isNew]);

  // Polling for AI generation results
  useEffect(() => {
    if (!generating || isNew || !playbook?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/playbooks/${playbook.id}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const stepsChanged =
            data.steps &&
            data.steps.length > 0 &&
            (data.steps.length !== playbook.steps.length ||
              data.updatedAt !== playbook.updatedAt ||
              JSON.stringify(data.steps) !== JSON.stringify(playbook.steps));
          if (stepsChanged) {
            setPlaybook(data);
            setGenerating(false);
            setShowAiPanel(false);
            toast({ title: `Generated ${data.steps.length} steps` });
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, playbook?.id, playbook?.steps?.length, playbook?.updatedAt, isNew]);

  const updateField = useCallback(<K extends keyof PlaybookData>(key: K, value: PlaybookData[K]) => {
    setPlaybook((prev) => prev ? { ...prev, [key]: value } : prev);
    setDirty(true);
  }, []);

  const updateStep = useCallback((index: number, updates: Partial<PlaybookStep>) => {
    setPlaybook((prev) => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], ...updates };
      return { ...prev, steps };
    });
    setDirty(true);
  }, []);

  const addStep = useCallback(() => {
    setPlaybook((prev) => {
      if (!prev) return prev;
      const newStep: PlaybookStep = {
        index: prev.steps.length,
        title: "New Step",
        description: "",
        type: "checklist",
        config: {},
        isRequired: false,
      };
      return { ...prev, steps: [...prev.steps, newStep] };
    });
    setDirty(true);
  }, []);

  const removeStep = useCallback((index: number) => {
    setPlaybook((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, index: i }));
      return { ...prev, steps };
    });
    setExpandedStep(null);
    setDirty(true);
  }, []);

  const moveStep = useCallback((from: number, direction: "up" | "down") => {
    setPlaybook((prev) => {
      if (!prev) return prev;
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= prev.steps.length) return prev;
      const steps = [...prev.steps];
      [steps[from], steps[to]] = [steps[to], steps[from]];
      return { ...prev, steps: steps.map((s, i) => ({ ...s, index: i })) };
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!playbook) return;
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch("/api/playbooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: playbook.name,
            description: playbook.description,
            category: playbook.category,
            steps: playbook.steps,
            tags: playbook.tags,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          toast({ title: "Playbook created" });
          navigate(`/playbooks/${created.id}`);
          return;
        }
      } else {
        const res = await fetch(`/api/playbooks/${playbook.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: playbook.name,
            description: playbook.description,
            category: playbook.category,
            steps: playbook.steps,
            tags: playbook.tags,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setPlaybook(updated);
          toast({ title: "Playbook saved" });
          setDirty(false);
        }
      }
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleGenerate = async () => {
    if (!playbook || !aiPrompt.trim()) return;

    // Must save first if new
    let targetId = playbook.id;
    if (isNew) {
      try {
        const res = await fetch("/api/playbooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: playbook.name || "AI Generated Playbook",
            description: playbook.description,
            category: playbook.category,
            steps: [],
          }),
        });
        if (res.ok) {
          const created = await res.json();
          targetId = created.id;
          setPlaybook(created);
          navigate(`/playbooks/${created.id}`, { replace: true });
        } else {
          toast({ title: "Failed to create playbook", variant: "destructive" });
          return;
        }
      } catch {
        toast({ title: "Failed to create playbook", variant: "destructive" });
        return;
      }
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/playbooks/${targetId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) {
        toast({ title: "AI generation started - please wait..." });
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: err.error ?? "Generation failed", variant: "destructive" });
        setGenerating(false);
      }
    } catch {
      toast({ title: "Failed to start generation", variant: "destructive" });
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!playbook || isNew) return;

    // Save first if dirty
    if (dirty) await handleSave();

    try {
      const res = await fetch(`/api/playbooks/${playbook.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: `${playbook.name} Run` }),
      });
      if (res.ok) {
        const run = await res.json();
        toast({ title: "Playbook run started" });
        navigate(`/playbooks/runs/${run.id}`);
      } else {
        toast({ title: "Failed to start run", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to start run", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
      </div>
    );
  }

  if (!playbook) {
    return <div className="p-8 text-center text-sm" style={{ color: "var(--workspace-muted)" }}>Playbook not found</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/playbooks")}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest"
          style={{ color: "var(--workspace-muted)" }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
          >
            <Sparkles className="h-3 w-3" />
            AI Generate
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
          {!isNew && playbook.steps.length > 0 && (
            <button
              onClick={handleExecute}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{ border: "1px solid var(--workspace-fg)", color: "#FFFFFF", background: "var(--workspace-fg)" }}
            >
              <Play className="h-3 w-3" />
              Run
            </button>
          )}
        </div>
      </div>

      {/* AI Generation Panel */}
      {showAiPanel && (
        <div className="p-4 space-y-3" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--workspace-fg)" }}>Generate with AI</span>
          </div>
          <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>
            Describe the playbook you want and AI will generate the steps for you.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Create a due diligence playbook for reviewing financial statements of a target acquisition company..."
            className="w-full p-3 text-sm resize-none"
            rows={3}
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !aiPrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest disabled:opacity-40"
              style={{ border: "1px solid var(--workspace-fg)", color: "#FFFFFF", background: "var(--workspace-fg)" }}
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {generating ? "Generating..." : "Generate Steps"}
            </button>
            <button
              onClick={() => setShowAiPanel(false)}
              className="px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{ color: "var(--workspace-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Playbook Metadata */}
      <div className="space-y-4 p-5" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
        <input
          value={playbook.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="w-full font-serif text-xl font-light outline-none"
          style={{ color: "var(--workspace-fg)", background: "transparent" }}
          placeholder="Playbook Name"
        />
        <textarea
          value={playbook.description ?? ""}
          onChange={(e) => updateField("description", e.target.value || null)}
          placeholder="Describe this playbook..."
          className="w-full text-sm resize-none outline-none"
          rows={2}
          style={{ color: "var(--workspace-muted)", background: "transparent" }}
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>Category</label>
            <select
              value={playbook.category ?? "custom"}
              onChange={(e) => updateField("category", e.target.value)}
              className="text-xs px-2 py-1 outline-none"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          {playbook.version && (
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--workspace-muted)" }}>v{playbook.version}</span>
          )}
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--workspace-fg)" }}>
            Steps ({playbook.steps.length})
          </h2>
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 px-2 py-1 text-xs uppercase tracking-widest"
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
          >
            <Plus className="h-3 w-3" />
            Add Step
          </button>
        </div>

        {playbook.steps.length === 0 ? (
          <div className="p-8 text-center border border-dashed" style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}>
            <CheckSquare className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
            <p className="text-sm mb-1" style={{ color: "var(--workspace-fg)" }}>No steps yet</p>
            <p className="text-xs mb-4" style={{ color: "var(--workspace-muted)" }}>Add steps manually or use AI to generate them</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={addStep}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
              >
                <Plus className="h-3 w-3" />
                Add Step
              </button>
              <button
                onClick={() => setShowAiPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
              >
                <Sparkles className="h-3 w-3" />
                Generate
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {playbook.steps.map((step, i) => (
              <StepEditor
                key={`step-${i}`}
                step={step}
                index={i}
                total={playbook.steps.length}
                isExpanded={expandedStep === i}
                onToggle={() => setExpandedStep(expandedStep === i ? null : i)}
                onUpdate={(updates) => updateStep(i, updates)}
                onRemove={() => removeStep(i)}
                onMove={(dir) => moveStep(i, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {!isNew && runs.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--workspace-fg)" }}>
            Recent Runs ({runs.length})
          </h2>
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="px-4 py-3 flex items-center justify-between cursor-pointer"
                style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
                onClick={() => navigate(`/playbooks/runs/${run.id}`)}
              >
                <div>
                  <span className="text-sm" style={{ color: "var(--workspace-fg)" }}>{run.title}</span>
                  <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                    <span>{run.completedSteps}/{run.totalSteps} steps</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(run.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: run.status === "completed" ? "#10b981" : run.status === "failed" ? "#ef4444" : "var(--workspace-muted)",
                  }}
                >
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

