import { CheckCircle2, Clock, XCircle, Loader2, Eye } from "lucide-react";

interface ExecutionStep {
  id: number;
  stepIndex: number;
  stepType: string;
  stepName: string | null;
  status: string;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  tokensCost: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
  currentStepIndex: number | null;
  onViewStep?: (step: ExecutionStep) => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={16} style={{ color: "#16a34a" }} />,
  running: <Loader2 size={16} style={{ color: "#ca8a04" }} className="animate-spin" />,
  failed: <XCircle size={16} style={{ color: "#dc2626" }} />,
  pending: <Clock size={16} style={{ color: "var(--workspace-muted)" }} />,
};

const STEP_TYPE_LABELS: Record<string, string> = {
  prompt: "AI Prompt",
  tool: "Tool",
  branch: "Branch",
  loop: "Loop",
  human_review: "Human Review",
};

export function ExecutionTimeline({
  steps,
  currentStepIndex,
  onViewStep,
}: ExecutionTimelineProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {steps.map((step, i) => {
        const isActive = step.stepIndex === currentStepIndex;
        const duration =
          step.startedAt && step.completedAt
            ? Math.round(
                (new Date(step.completedAt).getTime() -
                  new Date(step.startedAt).getTime()) /
                  1000,
              )
            : null;

        return (
          <div
            key={step.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: isActive
                ? "var(--workspace-accent-bg, rgba(59,130,246,0.08))"
                : "transparent",
              border: isActive
                ? "1px solid var(--workspace-accent, #3b82f6)"
                : "1px solid transparent",
              transition: "all 150ms",
            }}
          >
            {/* Step number & connector */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "24px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--workspace-surface, #1a1a2e)",
                  border: "2px solid var(--workspace-border, #333)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--workspace-text-muted)",
                }}
              >
                {step.stepIndex + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: "2px",
                    height: "12px",
                    background: "var(--workspace-border, #333)",
                    marginTop: "2px",
                  }}
                />
              )}
            </div>

            {/* Status icon */}
            {STATUS_ICON[step.status] || STATUS_ICON.pending}

            {/* Step info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--workspace-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {step.stepName || `Step ${step.stepIndex + 1}`}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--workspace-text-muted)",
                  display: "flex",
                  gap: "8px",
                  marginTop: "2px",
                }}
              >
                <span>{STEP_TYPE_LABELS[step.stepType] || step.stepType}</span>
                {duration !== null && <span>{duration}s</span>}
                {step.tokensCost && (
                  <span>{step.tokensCost.toLocaleString()} tokens</span>
                )}
              </div>
            </div>

            {/* View button */}
            {onViewStep && step.status === "completed" && (
              <button
                onClick={() => onViewStep(step)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--workspace-text-muted)",
                  padding: "4px",
                }}
                title="View step output"
              >
                <Eye size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
