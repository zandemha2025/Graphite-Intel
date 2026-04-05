import { format } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

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

interface WorkflowStep {
  _key: string;
  type: string;
  name: string;
  stepIndex: number;
  config: Record<string, any>;
}

// ─── Constants ─────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────────

export function ExecutionTraceView({
  execution,
  steps,
}: {
  execution: WorkflowExecution;
  steps: WorkflowStep[];
}) {
  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-between pb-6 border-b"
        style={{ borderColor: "var(--workspace-border)" }}
      >
        <h2
          className="text-xs font-medium"
          style={{ color: "var(--workspace-muted)" }}
        >
          Execution Trace
        </h2>
        <span
          className="text-[11px] font-medium px-2 py-0.5"
          style={{
            border: "1px solid var(--workspace-border)",
            color: STATUS_COLORS[execution.status] || "var(--workspace-muted)",
          }}
        >
          {STATUS_LABELS[execution.status] || execution.status}
        </span>
      </div>

      <div className="space-y-3">
        {(execution.steps || []).map((trace) => {
          const defStep = steps.find((s) => s.stepIndex === trace.stepIndex);
          const isRunning = trace.status === "in-progress";

          return (
            <div
              key={trace.id}
              className="p-4 space-y-3"
              style={{
                border: "1px solid var(--workspace-border)",
                background: "#FFFFFF",
              }}
            >
              <div className="flex items-center gap-3">
                {trace.status === "completed" && (
                  <CheckCircle2
                    className="h-4 w-4"
                    style={{ color: "#16a34a" }}
                  />
                )}
                {trace.status === "failed" && (
                  <XCircle className="h-4 w-4" style={{ color: "#dc2626" }} />
                )}
                {trace.status === "in-progress" && (
                  <Clock
                    className="h-4 w-4 animate-spin"
                    style={{ color: "#3b82f6" }}
                  />
                )}
                {trace.status === "pending" && (
                  <Clock
                    className="h-4 w-4"
                    style={{ color: "var(--workspace-muted)" }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--workspace-fg)" }}
                  >
                    Step {trace.stepIndex + 1}:{" "}
                    {trace.stepName || defStep?.name || "Unknown"}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    {trace.stepType}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-medium px-2 py-0.5 shrink-0 ${
                    isRunning ? "animate-pulse" : ""
                  }`}
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color:
                      STATUS_COLORS[trace.status] || "var(--workspace-muted)",
                  }}
                >
                  {STATUS_LABELS[trace.status] || trace.status}
                </span>
              </div>

              {trace.startedAt && (
                <div
                  className="text-[10px]"
                  style={{ color: "var(--workspace-muted)" }}
                >
                  Started: {format(new Date(trace.startedAt), "HH:mm:ss")}
                  {trace.completedAt && (
                    <span>
                      {" "}
                      &middot; Completed:{" "}
                      {format(new Date(trace.completedAt), "HH:mm:ss")}
                    </span>
                  )}
                </div>
              )}

              {(trace.input || trace.output || trace.errorMessage) && (
                <div className="space-y-2 text-xs">
                  {trace.input && (
                    <details className="cursor-pointer">
                      <summary style={{ color: "var(--workspace-muted)" }}>
                        Input
                      </summary>
                      <pre
                        className="mt-1 p-2 text-[10px] overflow-auto"
                        style={{ background: "var(--workspace-muted-bg)" }}
                      >
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </details>
                  )}
                  {trace.output && (
                    <details className="cursor-pointer">
                      <summary style={{ color: "var(--workspace-muted)" }}>
                        Output
                      </summary>
                      <pre
                        className="mt-1 p-2 text-[10px] overflow-auto"
                        style={{ background: "var(--workspace-muted-bg)" }}
                      >
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </details>
                  )}
                  {trace.errorMessage && (
                    <div
                      className="p-2 flex items-start gap-2"
                      style={{ background: "#fecaca", color: "#991b1b" }}
                    >
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      <pre className="text-[10px] overflow-auto">
                        {trace.errorMessage}
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
          style={{
            background: "var(--workspace-muted-bg)",
            color: "var(--workspace-muted)",
          }}
        >
          Completed at{" "}
          {format(new Date(execution.completedAt), "MMM d, yyyy HH:mm:ss")}
        </div>
      )}
    </div>
  );
}
