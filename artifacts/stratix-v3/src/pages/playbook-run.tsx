import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPatch } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  Check,
  X,
  SkipForward,
  FileText,
  Play,
} from "lucide-react";

/* ---------- Types ---------- */

type StepStatus = "pending" | "in_progress" | "complete" | "skipped" | "failed";

interface RunStep {
  title: string;
  description: string;
  type: string;
  status: StepStatus;
  notes?: string;
  completedAt?: string;
}

interface PlaybookRun {
  id: string;
  playbookId: string;
  playbookTitle: string;
  status: "running" | "completed" | "failed" | "cancelled";
  steps: RunStep[];
  createdAt: string;
  completedAt?: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#27272A] ${className ?? ""}`}
    />
  );
}

/* ---------- Step status icon ---------- */

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-[#71717A]" />;
    case "in_progress":
      return <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "skipped":
      return <MinusCircle className="h-4 w-4 text-[#71717A]" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "complete":
      return "Complete";
    case "skipped":
      return "Skipped";
    case "failed":
      return "Failed";
  }
}

function stepStatusBadgeVariant(
  status: StepStatus,
): "default" | "info" | "success" | "warning" | "error" {
  switch (status) {
    case "pending":
      return "default";
    case "in_progress":
      return "info";
    case "complete":
      return "success";
    case "skipped":
      return "warning";
    case "failed":
      return "error";
  }
}

/* ---------- Progress Bar ---------- */

function ProgressBar({ steps }: { steps: RunStep[] }) {
  const total = steps.length;
  if (total === 0) return null;

  const completed = steps.filter(
    (s) => s.status === "complete" || s.status === "skipped",
  ).length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-[#FAFAFA]">
          {completed} of {total} steps complete
        </span>
        <span className="font-medium text-[#6366F1]">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#27272A]">
        <div
          className="h-full rounded-full bg-[#6366F1] transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Run Step Card ---------- */

function RunStepCard({
  step,
  index,
  runId,
  isRunning,
}: {
  step: RunStep;
  index: number;
  runId: string;
  isRunning: boolean;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(step.notes ?? "");
  const [showNotes, setShowNotes] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (payload: { status: StepStatus; notes?: string }) =>
      apiPatch(`/playbook-runs/${runId}/steps/${index}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook-run", runId] });
    },
    onError: () => {
      toast.error("Failed to update step");
    },
  });

  function handleAction(status: StepStatus) {
    updateMutation.mutate({ status, notes: notes || undefined });
  }

  const canAct =
    isRunning &&
    (step.status === "pending" || step.status === "in_progress");

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start gap-3 p-4">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">
          <StepStatusIcon status={step.status} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#71717A]">
              Step {index + 1}
            </span>
            <Badge variant={stepStatusBadgeVariant(step.status)}>
              {stepStatusLabel(step.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-[#FAFAFA]">
            {step.title || "Untitled step"}
          </p>
          {step.description && (
            <p className="mt-0.5 text-xs text-[#A1A1AA]">
              {step.description}
            </p>
          )}

          {/* Notes */}
          {(showNotes || step.notes) && (
            <div className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this step..."
                rows={2}
                disabled={!canAct}
                className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-xs text-[#FAFAFA] placeholder:text-[#71717A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 focus:border-[#6366F1] disabled:bg-[#18181B] disabled:text-[#A1A1AA]"
              />
            </div>
          )}

          {/* Actions */}
          {canAct && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleAction("complete")}
                loading={updateMutation.isPending}
              >
                <Check className="h-3.5 w-3.5" />
                Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("skipped")}
                disabled={updateMutation.isPending}
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("failed")}
                disabled={updateMutation.isPending}
                className="text-red-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              {!showNotes && !step.notes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(true)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Notes
                </Button>
              )}
            </div>
          )}

          {/* Completed timestamp */}
          {step.completedAt && (
            <p className="mt-2 text-[10px] text-[#71717A]">
              Completed at{" "}
              {new Date(step.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Run Status Badge ---------- */

function RunStatusBadge({ status }: { status: PlaybookRun["status"] }) {
  switch (status) {
    case "running":
      return (
        <Badge variant="info">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="error">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="warning">
          <MinusCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
  }
}

/* ---------- Main Page ---------- */

export default function PlaybookRunPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const runId = params.id ?? "";

  const {
    data: run,
    isLoading,
    isError,
  } = useQuery<PlaybookRun>({
    queryKey: ["playbook-run", runId],
    queryFn: () =>
      api<{ run: PlaybookRun }>(`/playbook-runs/${runId}`).then(
        (r) => r.run,
      ),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status === "running") return 5000;
      return false;
    },
  });

  /* Loading state */
  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full rounded-full" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  /* Error state */
  if (isError || !run) {
    return (
      <Page title="Run not found" subtitle="">
        <Card className="flex flex-col items-center justify-center py-16">
          <Play className="mb-3 h-8 w-8 text-[#3F3F46]" />
          <p className="text-sm font-medium text-[#FAFAFA]">
            Could not load this run
          </p>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            It may have been deleted or you may not have access.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/playbooks")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Playbooks
          </Button>
        </Card>
      </Page>
    );
  }

  const isRunning = run.status === "running";

  return (
    <div className="mx-auto max-w-[900px] px-6 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/playbooks/${run.playbookId}`)}
            className="rounded-lg p-1.5 text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#FAFAFA]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#FAFAFA]">
              {run.playbookTitle}
            </h1>
            <p className="mt-0.5 text-xs text-[#71717A]">
              Started {new Date(run.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <RunStatusBadge status={run.status} />
      </div>

      {/* Progress */}
      <ProgressBar steps={run.steps} />

      {/* Step list */}
      <div className="space-y-2">
        {run.steps.map((step, i) => (
          <RunStepCard
            key={i}
            step={step}
            index={i}
            runId={runId}
            isRunning={isRunning}
          />
        ))}
      </div>

      {/* Empty state */}
      {run.steps.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-3 h-8 w-8 text-[#3F3F46]" />
          <p className="text-sm font-medium text-[#FAFAFA]">
            No steps in this run
          </p>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            This playbook had no steps when it was executed.
          </p>
        </Card>
      )}
    </div>
  );
}
