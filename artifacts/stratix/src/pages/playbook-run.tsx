import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
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
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  FileSearch,
  GitCompare,
  Eye,
} from "lucide-react";

interface StepDef {
  index: number;
  title: string;
  description: string;
  type: string;
  config: {
    extractionFields?: string[];
    comparisonDocTypes?: string[];
    flagConditions?: string[];
    aiPrompt?: string;
  };
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
  const [, navigate] = useLocation();
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

  const handleReviewAction = async (stepIndex: number, approved: boolean) => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/playbook-runs/${runId}/steps/${stepIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "completed",
          result: { approved, action: approved ? "approved" : "rejected" },
          notes: noteInputs[stepIndex] || undefined,
        }),
      });
      if (res.ok) {
        await fetchRun();
        toast({ title: approved ? "Approved" : "Rejected" });
      }
    } catch {
      toast({ title: "Failed to update step", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate("/playbooks")}
        className="flex items-center gap-1.5 text-xs uppercase tracking-widest"
        style={{ color: "var(--workspace-muted)" }}
      >
        <ArrowLeft className="h-3 w-3" />
        Playbooks
      </button>

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

                  {/* Type-specific config info */}
                  {step.type === "extract" && step.config.extractionFields && step.config.extractionFields.length > 0 && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>Fields to Extract</p>
                      <div className="flex flex-wrap gap-1">
                        {step.config.extractionFields!.map((field: string) => (
                          <span key={field} className="text-xs px-1.5 py-0.5 font-mono" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}>{field}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.type === "flag" && step.config.flagConditions && step.config.flagConditions!.length > 0 && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>Conditions</p>
                      <ul className="text-xs space-y-1" style={{ color: "var(--workspace-fg)" }}>
                        {step.config.flagConditions!.map((c: string, ci: number) => (
                          <li key={ci} className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: "#f59e0b" }} />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step.type === "compare" && step.config.comparisonDocTypes && step.config.comparisonDocTypes!.length > 0 && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>Comparing</p>
                      <div className="flex flex-wrap gap-1">
                        {step.config.comparisonDocTypes!.map((t: string) => (
                          <span key={t} className="text-xs px-1.5 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.type === "review" && step.config.aiPrompt && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>AI Review Prompt</p>
                      <p className="text-xs italic" style={{ color: "var(--workspace-fg)" }}>{step.config.aiPrompt}</p>
                    </div>
                  )}

                  {/* Completed info */}
                  {result?.notes && (
                    <div className="flex items-start gap-2 mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <StickyNote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>{result.notes}</p>
                    </div>
                  )}

                  {result?.result != null && (
                    <div className="mb-3 p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--workspace-muted)" }}>Result</p>
                      <pre className="text-xs overflow-auto whitespace-pre-wrap" style={{ color: "var(--workspace-fg)" }}>
                        {typeof result.result === "string" ? result.result : JSON.stringify(result.result as object, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Actions for incomplete steps */}
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
                        {step.type === "review" ? (
                          <>
                            <button
                              onClick={() => handleReviewAction(i, true)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                              style={{ border: "1px solid #10b981", color: "#10b981", background: "#FFFFFF" }}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewAction(i, false)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                              style={{ border: "1px solid #ef4444", color: "#ef4444", background: "#FFFFFF" }}
                            >
                              <ThumbsDown className="h-3 w-3" />
                              Reject
                            </button>
                          </>
                        ) : step.type === "checklist" ? (
                          <button
                            onClick={() => handleCompleteStep(i)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                            style={{ border: "1px solid var(--workspace-fg)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
                          >
                            <CheckSquare className="h-3 w-3" />
                            Check Off
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCompleteStep(i)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                            style={{ border: "1px solid var(--workspace-fg)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </button>
                        )}
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
