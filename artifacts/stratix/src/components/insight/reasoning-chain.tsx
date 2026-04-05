import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";

export interface ReasoningStep {
  label: string;
  detail?: string;
}

interface ReasoningChainProps {
  steps: ReasoningStep[];
  model?: string;
  sourcesQueried?: string[];
}

export function ReasoningChain({ steps, model, sourcesQueried }: ReasoningChainProps) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--insight-border, #E5E7EB)",
        background: "var(--insight-subtle-bg, #F9FAFB)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
        style={{ color: "var(--insight-muted, #6B7280)" }}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Brain className="w-3.5 h-3.5" />
          Show reasoning
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold mt-px"
                  style={{
                    background: "var(--insight-accent-bg, #EEF2FF)",
                    color: "var(--insight-accent, #4F46E5)",
                  }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium" style={{ color: "var(--insight-text, #1F2937)" }}>
                    {step.label}
                  </p>
                  {step.detail && (
                    <p style={{ color: "var(--insight-muted, #6B7280)" }}>{step.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {(model || (sourcesQueried && sourcesQueried.length > 0)) && (
            <div
              className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]"
              style={{
                borderTop: "1px solid var(--insight-border, #E5E7EB)",
                color: "var(--insight-muted, #9CA3AF)",
              }}
            >
              {model && <span>Model: {model}</span>}
              {sourcesQueried && sourcesQueried.length > 0 && (
                <span>Queried: {sourcesQueried.join(", ")}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
