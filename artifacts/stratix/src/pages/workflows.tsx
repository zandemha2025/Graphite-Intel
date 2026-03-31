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

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  board_deck_audit: FileText,
  competitor_deep_dive: Search,
  market_entry_analysis: TrendingUp,
  ma_target_evaluation: DollarSign,
  series_b_narrative: BarChart2,
  quarterly_strategy_brief: Target,
};

const TEMPLATE_ACCENT_CLASSES: Record<string, string> = {
  board_deck_audit: "border-blue-500/20",
  competitor_deep_dive: "border-red-500/20",
  market_entry_analysis: "border-green-500/20",
  ma_target_evaluation: "border-yellow-500/20",
  series_b_narrative: "border-purple-500/20",
  quarterly_strategy_brief: "border-orange-500/20",
};

const STATUS_CLASSES: Record<string, string> = {
  complete: "text-green-400/70",
  generating: "text-yellow-400/70 animate-pulse",
  failed: "text-red-400/70",
  pending: "text-[#E8E4DC]/40",
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
      <div className="mb-10 border-b border-white/8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-5 w-5 text-[#E8E4DC]/40" />
          <h1 className="font-serif text-4xl font-light text-[#E8E4DC]">Workflow Agents</h1>
        </div>
        <p className="text-sm text-[#E8E4DC]/40 mt-1">
          Pre-built AI agents that execute structured strategic work and deliver comprehensive deliverables.
        </p>
      </div>

      <div className="mb-12">
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-5">
          Agent Templates
        </h2>

        {loadingTemplates ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-white/8 p-5 animate-pulse h-32 bg-white/2" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.key] || Zap;
              const accentClass = TEMPLATE_ACCENT_CLASSES[template.key] || "border-white/12";
              return (
                <Link
                  key={template.key}
                  href={`/workflows/new/${template.key}`}
                  className={`group border ${accentClass} bg-white/[0.02] hover:bg-white/[0.04] p-5 flex flex-col gap-3 transition-all hover:border-white/20 cursor-pointer`}
                  data-testid={`template-card-${template.key}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-[#E8E4DC]/40 shrink-0" />
                      <span className="font-serif text-base font-light text-[#E8E4DC]/90 leading-tight">
                        {template.name}
                      </span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-[#E8E4DC]/20 group-hover:text-[#E8E4DC]/50 transition-colors shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-[#E8E4DC]/45 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-auto">
                    <Users className="h-3 w-3 text-[#E8E4DC]/20" />
                    <span className="text-[10px] text-[#E8E4DC]/25 uppercase tracking-wider">
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
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-5">
          Recent Runs
        </h2>

        {loadingRuns ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-white/8 p-4 animate-pulse h-14 bg-white/2" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="border border-white/8 p-10 text-center">
            <Clock className="h-8 w-8 text-[#E8E4DC]/15 mx-auto mb-3" />
            <p className="text-sm text-[#E8E4DC]/30">No workflow runs yet. Launch a template above to get started.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {runs.map((run) => {
              const Icon = TEMPLATE_ICONS[run.templateKey] || Zap;
              const templateName =
                templates.find((t) => t.key === run.templateKey)?.name || run.title;
              return (
                <Link
                  key={run.id}
                  href={`/workflows/${run.id}`}
                  className="flex items-center gap-4 border border-white/8 hover:border-white/15 bg-white/[0.01] hover:bg-white/[0.03] px-4 py-3.5 transition-all group"
                  data-testid={`run-row-${run.id}`}
                >
                  <Icon className="h-3.5 w-3.5 text-[#E8E4DC]/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#E8E4DC]/80 font-medium">{templateName}</span>
                    <span className="text-[#E8E4DC]/30 text-xs ml-2">
                      {Object.values(run.inputs).filter(Boolean)[0]?.toString().substring(0, 50) || ""}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider shrink-0 ${STATUS_CLASSES[run.status] || "text-[#E8E4DC]/40"}`}>
                    {run.status}
                  </span>
                  <span className="text-[10px] text-[#E8E4DC]/25 shrink-0">
                    {format(new Date(run.createdAt), "MMM d, yyyy")}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#E8E4DC]/20 group-hover:text-[#E8E4DC]/50 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
