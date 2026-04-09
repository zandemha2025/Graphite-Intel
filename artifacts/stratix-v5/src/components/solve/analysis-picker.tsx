import { useState, useRef, useEffect } from "react";
import { ChevronDown, Layers } from "lucide-react";

export type AnalysisMode =
  | "standard"
  | "cohort"
  | "funnel"
  | "sentiment"
  | "cross_source";

const MODES: { value: AnalysisMode; label: string; description: string }[] = [
  { value: "standard", label: "Standard", description: "General-purpose analysis" },
  { value: "cohort", label: "Cohort Analysis", description: "Break down by user segments over time" },
  { value: "funnel", label: "Funnel Analysis", description: "Track conversion through stages" },
  { value: "sentiment", label: "Sentiment Analysis", description: "Analyze tone and sentiment in data" },
  { value: "cross_source", label: "Cross-Source Query", description: "Query across all connected data sources" },
];

export function AnalysisPicker({
  mode,
  onChange,
}: {
  mode: AnalysisMode;
  onChange: (m: AnalysisMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = MODES.find((m) => m.value === mode) || MODES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-all"
      >
        <Layers className="h-3 w-3 text-[var(--text-muted)]" />
        {current.label}
        <ChevronDown className={`h-3 w-3 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50 overflow-hidden">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => { onChange(m.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 transition-colors ${
                mode === m.value
                  ? "bg-[var(--accent-muted)]"
                  : "hover:bg-[var(--surface-secondary)]"
              }`}
            >
              <div className="text-[12px] font-medium text-[var(--text-primary)]">{m.label}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
