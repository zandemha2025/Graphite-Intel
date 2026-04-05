import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { api, apiPatch } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  SkipForward,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface StepResult {
  stepIndex: number;
  type: string;
  title: string;
  status: StepStatus;
  result?: string;
  required?: boolean;
  config?: Record<string, unknown>;
}

interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookName: string;
  status: string;
  stepResults: StepResult[];
  createdAt: string;
}

const STATUS_ICON: Record<StepStatus, typeof CheckCircle2> = {
  pending: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: SkipForward,
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pending: "text-[#9CA3AF]",
  running: "text-[#2563EB] animate-spin",
  completed: "text-[#059669]",
  failed: "text-[#DC2626]",
  skipped: "text-[#9CA3AF]",
};

const STATUS_BADGE: Record<StepStatus, "default" | "success" | "warning" | "info" | "error"> = {
  pending: "default",
  running: "info",
  completed: "success",
  failed: "error",
  skipped: "default",
};

export default function PlaybookRunPage() {
  const [, params] = useRoute("/playbooks/runs/:id");
  const runId = params?.id;

  const [run, setRun] = useState<PlaybookRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const fetchRun = useCallback(() => {
    if (!runId) return;
    api<PlaybookRun>(`/playbook-runs/${runId}`)
      .then(setRun)
      .finally(() => setLoading(false));
  }, [runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  async function updateStep(stepIndex: number, status: StepStatus, result?: string) {
    if (!run) return;
    setUpdating(stepIndex);
    try {
      await apiPatch(`/playbook-runs/${run.id}/steps/${stepIndex}`, {
        status,
        result: result ?? notes[stepIndex] ?? undefined,
      });
      fetchRun();
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <Page title="Playbook Run">
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      </Page>
    );
  }

  if (!run) {
    return (
      <Page title="Playbook Run">
        <p className="text-sm text-[#9CA3AF] py-20 text-center">Run not found.</p>
      </Page>
    );
  }

  const totalSteps = run.stepResults.length;
  const completedSteps = run.stepResults.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Page
      title={run.playbookName}
      subtitle={`Run started ${new Date(run.createdAt).toLocaleString()}`}
      actions={
        <Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "error" : "info"}>
          {run.status}
        </Badge>
      }
    >
      <div className="space-y-6">
        {/* Progress */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#0A0A0A]">Progress</span>
            <span className="text-[#9CA3AF]">
              {completedSteps} / {totalSteps} steps ({progressPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F3F3F1] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </Card>

        {/* Steps */}
        <div className="space-y-3">
          {run.stepResults.map((step, i) => {
            const Icon = STATUS_ICON[step.status];
            const isActive = step.status === "pending" || step.status === "running";

            return (
              <Card key={i} className="space-y-3">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${STATUS_COLOR[step.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#0A0A0A]">
                        {i + 1}. {step.title}
                      </span>
                      <Badge variant={STATUS_BADGE[step.status]} className="text-[10px]">
                        {step.status}
                      </Badge>
                      <Badge variant="default" className="text-[10px]">
                        {step.type}
                      </Badge>
                      {!step.required && (
                        <span className="text-[10px] text-[#9CA3AF]">optional</span>
                      )}
                    </div>

                    {step.result && (
                      <p className="text-xs text-[#404040] mt-1">{step.result}</p>
                    )}

                    {/* Action area */}
                    {isActive && (
                      <div className="mt-3 space-y-2">
                        {/* Checklist: complete button */}
                        {step.type === "checklist" && (
                          <Button
                            size="sm"
                            onClick={() => updateStep(i, "completed")}
                            loading={updating === i}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark Complete
                          </Button>
                        )}

                        {/* Review: approve / reject */}
                        {step.type === "review" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateStep(i, "completed", "approved")}
                              loading={updating === i}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStep(i, "failed", "rejected")}
                              loading={updating === i}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Other types: generic complete */}
                        {step.type !== "checklist" && step.type !== "review" && (
                          <Button
                            size="sm"
                            onClick={() => updateStep(i, "completed")}
                            loading={updating === i}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}

                        {/* Skip (non-required only) */}
                        {!step.required && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStep(i, "skipped")}
                            loading={updating === i}
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                            Skip
                          </Button>
                        )}

                        {/* Notes */}
                        <textarea
                          value={notes[i] ?? ""}
                          onChange={(e) => setNotes({ ...notes, [i]: e.target.value })}
                          placeholder="Add notes for this step..."
                          rows={2}
                          className="w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-xs text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
