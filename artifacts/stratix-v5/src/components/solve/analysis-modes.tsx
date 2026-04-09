import { useRef, useEffect } from "react";
import {
  BarChart3,
  GitBranch,
  SmilePlus,
  Network,
  Database,
  Sparkles,
} from "lucide-react";

export type AnalysisMode =
  | "general"
  | "cohort"
  | "funnel"
  | "sentiment"
  | "clustering"
  | "sql";

const MODES: {
  value: AnalysisMode;
  label: string;
  description: string;
  icon: typeof BarChart3;
}[] = [
  {
    value: "general",
    label: "General",
    description: "Ask anything",
    icon: Sparkles,
  },
  {
    value: "cohort",
    label: "Cohort Analysis",
    description: "Analyze user cohorts over time",
    icon: BarChart3,
  },
  {
    value: "funnel",
    label: "Funnel Builder",
    description: "Build conversion funnels",
    icon: GitBranch,
  },
  {
    value: "sentiment",
    label: "Sentiment Scan",
    description: "Analyze sentiment across sources",
    icon: SmilePlus,
  },
  {
    value: "clustering",
    label: "Clustering",
    description: "Group similar entities",
    icon: Network,
  },
  {
    value: "sql",
    label: "Custom SQL",
    description: "Write and run SQL queries",
    icon: Database,
  },
];

export function AnalysisModes({
  mode,
  onChange,
}: {
  mode: AnalysisMode;
  onChange: (m: AnalysisMode) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the active pill into view when mode changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector("[data-active=true]");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [mode]);

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <button
            key={m.value}
            type="button"
            data-active={isActive}
            onClick={() => onChange(m.value)}
            title={m.description}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              isActive
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/** Map from new AnalysisMode to a contextual placeholder */
export function getPlaceholderForMode(mode: AnalysisMode): string {
  switch (mode) {
    case "cohort":
      return "Describe the cohort you want to analyze...";
    case "funnel":
      return "Describe the conversion funnel to build...";
    case "sentiment":
      return "What sources or topics should I analyze sentiment for?";
    case "clustering":
      return "What entities or data should I cluster?";
    case "sql":
      return "Write your SQL query or describe what you need...";
    default:
      return "Ask me...";
  }
}
