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
import { PageHeader } from "@/components/ui/page-header";
import { DataCard } from "@/components/ui/data-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

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

const RUN_STATUS_MAP: Record<string, "complete" | "running" | "failed" | "pending"> = {
  complete: "complete",
  generating: "running",
  failed: "failed",
  pending: "pending",
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
      <PageHeader
        title="Workflow Agents"
        subtitle="Pre-built AI agents that execute structured strategic work and deliver comprehensive deliverables."
      />

      <div className="mt-8 mb-12">
        <h2 className="text-xs font-medium mb-5 text-[#9CA3AF]">Agent Templates</h2>

        {loadingTemplates ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map((template) => {
              const Icon = TEMPLATE_ICONS[template.key] || Zap;
              return (
                <Link key={template.key} href={`/workflows/new/${template.key}`} data-testid={`template-card-${template.key}`}>
                  <DataCard hover className="h-full">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                        <span className="text-sm font-medium text-[#111827] leading-tight">
                          {template.name}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#9CA3AF]" />
                    </div>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed mt-3">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <Users className="h-3 w-3 text-[#9CA3AF] opacity-50" />
                      <span className="text-xs font-medium text-[#9CA3AF] opacity-60">
                        {template.questions.length} intake questions
                      </span>
                    </div>
                  </DataCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-medium mb-5 text-[#9CA3AF]">Recent Runs</h2>

        {loadingRuns ? (
          <TableSkeleton rows={3} />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No workflow runs yet"
            description="Select a template above to launch your first AI workflow agent."
          />
        ) : (
          <div className="border border-[#E5E5E3] rounded-xl overflow-hidden">
            {runs.map((run, i) => {
              const Icon = TEMPLATE_ICONS[run.templateKey] || Zap;
              const templateName =
                templates.find((t) => t.key === run.templateKey)?.name || run.title;
              return (
                <Link
                  key={run.id}
                  href={`/workflows/${run.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 bg-white hover:bg-[#FAFAF9] transition-colors group"
                  style={{ borderTop: i > 0 ? "1px solid #E5E5E3" : undefined }}
                  data-testid={`run-row-${run.id}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#111827]">{templateName}</span>
                    <span className="text-xs ml-2 text-[#9CA3AF]">
                      {Object.values(run.inputs).filter(Boolean)[0]?.toString().substring(0, 50) || ""}
                    </span>
                  </div>
                  <StatusBadge status={RUN_STATUS_MAP[run.status] ?? "pending"} />
                  <span className="text-[10px] shrink-0 text-[#9CA3AF]">
                    {format(new Date(run.createdAt), "MMM d, yyyy")}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
