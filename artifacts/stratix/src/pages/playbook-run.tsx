import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertTriangle,
  SkipForward,
  ChevronDown,
  ChevronUp,
  FileText,
  StickyNote,
} from "lucide-react";

interface StepDef {
  index: number;
  title: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  isRequired: boolean;
}

interface StepResult {
  stepIndex: number;
  status: string;
  result?: unknown;
  notes?: string;
  completedByUserId?: string;
  completedAt?: string;
}

interface PlaybookRunData {
  id: number;
  title: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  stepResults: StepResult[];
  startedAt: string | null;
  completedAt: string | null;
}

interface PlaybookData {
  id: number;
  name: string;
  steps: StepDef[];
}

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4" style={{ color: "#10b981" }} />,
  running: <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--workspace-fg)" }} />,
  failed: <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />,
  skipped: <SkipForward className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />,
  pending: <Circle className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />,
};

const typeLabels: Record<string, string> = {
  checklist: "Manual Check",
  review: "AI Review",
  extract: "Data Extraction",
  compare: "Comparison",
  flag: "Automated Flag",
};

export function PlaybookRun() {
  const { toast } = useToast();
  const [, params] = useRoute("/playbooks/runs/:id");
  const runId = params?.id;

  const [run, setRun] = useState<PlaybookRunData | null>(null);
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<number, string>>({});

  const fetchRun = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/playbook-runs/${runId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
        setPlaybook(data.playbook);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchRun();
  }, [runId]);

  const handleCompleteStep = async (stepIndex: number) => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/playbook-runs/${runId}/steps/${stepIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "completed",
          notes: noteInputs[stepIndex] || undefined,
        }),
      });
      if (res.ok) {
        await fetchRun();
        toast({ title: "Step completed" });
      }
    } catch {
      toast({ title: "Failed to update step", variant: "destructive" });
    }
  };

  const handleSkipStep = async (stepIndex: number) => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/playbook-runs/${runId}/steps/${stepIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "skipped" }),
      });
      if (res.ok) await fetchRun();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
      </div>
    );
  }

  if (!run || !playbook) {
    return <div className="p-8 text-center text-sm" style={{ color: "var(--workspace-muted)" }}>Playbook run not found</div>;
  }

  const progress = run.totalSteps > 0 ? (run.completedSteps / run.totalSteps) * 100 : 0;
  const steps = playbook.steps ?? [];
  const results = run.stepResults ?? [];

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>{run.title}</h1>
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--workspace-muted)" }}>
          <span>{playbook.name}</span>
          <span>{run.completedSteps}/{run.totalSteps} steps</span>
          <span className="uppercase tracking-wider px-1.5 py-0.5" style={{
            border: "1px solid var(--workspace-border)",
            color: run.status === "completed" ? "#10b981" : run.status === "failed" ? "#ef4444" : "var(--workspace-muted)",
          }}>
            {run.status}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5" style={{ background: "var(--workspace-border)" }}>
          <div className="h-1.5 transition-all" style={{ width: `${progress}%`, background: run.status === "completed" ? "#10b981" : "var(--workspace-fg)" }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
          <span>{Math.round(progress)}% complete</span>
          {run.completedAt && <span>Completed {new Date(run.completedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const result = results[i];
          const isExpanded = expandedStep === i;
          const isComplete = result?.status === "completed" || result?.status === "skipped";

          return (
            <div
              key={i}
              style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : i)}
              >
                {statusIcons[result?.status ?? "pending"]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: isComplete ? "var(--workspace-muted)" : "var(--workspace-fg)", textDecoration: isComplete ? "line-through" : undefined }}>
                      {step.title}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider px-1 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
                      {typeLabels[step.type] ?? step.type}
                    </span>
                    {step.isRequired && (
                      <span className="text-[9px] uppercase" style={{ color: "#ef4444" }}>Required</span>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--workspace-border)" }}>
                  <p className="text-xs mt-3 mb-3" style={{ color: "var(--workspace-muted)" }}>{step.description}</p>

                  {result?.notes && (
                    <div className="flex items-start gap-2 mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <StickyNote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>{result.notes}</p>
                    </div>
                  )}

                  {result?.result && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>Result</p>
                      <pre className="text-xs overflow-auto" style={{ color: "var(--workspace-fg)" }}>
                        {typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {!isComplete && (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Add notes (optional)..."
                        value={noteInputs[i] ?? ""}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [i]: e.target.value })}
                        className="w-full p-2 text-xs resize-none"
                        rows={2}
                        style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCompleteStep(i)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                          style={{ border: "1px solid var(--workspace-fg)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </button>
                        {!step.isRequired && (
                          <button
                            onClick={() => handleSkipStep(i)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                          >
                            <SkipForward className="h-3 w-3" />
                            Skip
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
