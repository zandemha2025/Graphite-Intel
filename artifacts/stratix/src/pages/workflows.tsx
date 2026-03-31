import { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Zap,
  Clock,
  ChevronRight,
  Search,
  FileText,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  BarChart2,
} from "lucide-react";

interface WorkflowTemplate {
  key: string;
  name: string;
  description: string;
  questions: { key: string; label: string; placeholder: string; required: boolean }[];
}

interface WorkflowRun {
  id: number;
  templateKey: string;
  title: string;
  inputs: Record<string, string>;
  status: string;
  output: string | null;
  createdAt: string;
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  board_deck_audit: FileText,
  competitor_deep_dive: Search,
  market_entry_analysis: TrendingUp,
  ma_target_evaluation: DollarSign,
  series_b_narrative: BarChart2,
  quarterly_strategy_brief: Target,
};

const STATUS_COLORS: Record<string, string> = {
  complete: "#16a34a",
  generating: "#ca8a04",
  failed: "#dc2626",
  pending: "var(--workspace-muted)",
};

export function Workflows() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    fetch("/api/workflows/templates", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoadingTemplates(false);
      })
      .catch(() => setLoadingTemplates(false));

    fetch("/api/workflows", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        setLoadingRuns(false);
      })
      .catch(() => setLoadingRuns(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-5 w-5" style={{ color: "var(--workspace-muted)" }} />
          <h1 className="font-serif text-4xl font-light" style={{ color: "var(--workspace-fg)" }}>Workflow Agents</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--workspace-muted)" }}>
          Pre-built AI agents that execute structured strategic work and deliver comprehensive deliverables.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-[10px] uppercase tracking-[0.25em] mb-5" style={{ color: "var(--workspace-muted)" }}>
          Agent Templates
        </h2>

        {loadingTemplates ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse h-32" style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.key] || Zap;
              return (
                <Link
                  key={template.key}
                  href={`/workflows/new/${template.key}`}
                  className="group flex flex-col gap-3 p-5 transition-colors"
                  style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
                  data-testid={`template-card-${template.key}`}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                      <span className="font-serif text-base font-light leading-tight" style={{ color: "var(--workspace-fg)" }}>
                        {template.name}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 transition-colors" style={{ color: "var(--workspace-muted)" }} />
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--workspace-muted)" }}>
                    {template.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <Users className="h-3 w-3" style={{ color: "var(--workspace-muted)", opacity: 0.5 }} />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                      {template.questions.length} intake questions
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[10px] uppercase tracking-[0.25em] mb-5" style={{ color: "var(--workspace-muted)" }}>
          Recent Runs
        </h2>

        {loadingRuns ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse h-14" style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-10 text-center" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
            <Clock className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--workspace-muted)", opacity: 0.3 }} />
            <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>No workflow runs yet. Launch a template above to get started.</p>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            {runs.map((run, i) => {
              const Icon = TEMPLATE_ICONS[run.templateKey] || Zap;
              const templateName =
                templates.find((t) => t.key === run.templateKey)?.name || run.title;
              return (
                <Link
                  key={run.id}
                  href={`/workflows/${run.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors group"
                  style={{
                    borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                    background: "#FFFFFF",
                  }}
                  data-testid={`run-row-${run.id}`}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--workspace-muted-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>{templateName}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--workspace-muted)" }}>
                      {Object.values(run.inputs).filter(Boolean)[0]?.toString().substring(0, 50) || ""}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider shrink-0 ${run.status === 'generating' ? 'animate-pulse' : ''}`} style={{ color: STATUS_COLORS[run.status] || "var(--workspace-muted)" }}>
                    {run.status}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--workspace-muted)" }}>
                    {format(new Date(run.createdAt), "MMM d, yyyy")}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
