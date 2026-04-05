import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  FileText,
  Search,
  BarChart3,
  Shield,
  Globe,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TemplateQuestion {
  key: string;
  label: string;
  type: string;
}

interface Template {
  key: string;
  name: string;
  description: string;
  questions: TemplateQuestion[];
}

interface WorkflowRun {
  id: string;
  templateKey: string;
  templateName: string;
  status: string;
  createdAt: string;
}

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  "competitor-analysis": BarChart3,
  "market-research": Search,
  "content-brief": FileText,
  "risk-assessment": Shield,
  "trend-report": Globe,
  "swot-analysis": BarChart3,
};

function getTemplateIcon(key: string): LucideIcon {
  return TEMPLATE_ICONS[key] ?? FileText;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success",
  running: "warning",
  failed: "error",
};

export default function WorkflowsPage() {
  const [, navigate] = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tpl, wr] = await Promise.all([
          api<Template[]>("/workflows/templates"),
          api<WorkflowRun[]>("/workflows"),
        ]);
        setTemplates(tpl);
        setRuns(wr);
      } catch {
        // fail silently, show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleTemplateClick(key: string) {
    navigate(`/workflows/new/${key}`);
  }

  if (loading) {
    return (
      <Page title="Workflow Agents" subtitle="Automated intelligence workflows">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Workflow Agents"
      subtitle="Automated intelligence workflows"
      actions={
        <Button variant="secondary" onClick={() => navigate("/workflow-builder")}>
          <Wrench className="w-4 h-4" />
          Builder
        </Button>
      }
    >
      {/* Template grid */}
      <section>
        <h2 className="text-sm font-medium text-[#404040] mb-3">Templates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const Icon = getTemplateIcon(tpl.key);
            return (
              <Card
                key={tpl.key}
                hoverable
                clickable
                onClick={() => handleTemplateClick(tpl.key)}
                className="flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F3F3F1] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#404040]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#0A0A0A] leading-tight">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F3F3F1]">
                  <span className="text-xs text-[#9CA3AF]">
                    {tpl.questions.length} intake question{tpl.questions.length !== 1 ? "s" : ""}
                  </span>
                  <Play className="w-3.5 h-3.5 text-[#9CA3AF]" />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent runs */}
      <section className="mt-10">
        <h2 className="text-sm font-medium text-[#404040] mb-3">Recent Runs</h2>

        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#E5E5E3] rounded-xl">
            <Clock className="w-5 h-5 text-[#9CA3AF] mb-2" />
            <p className="text-sm text-[#9CA3AF]">No workflow runs yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Pick a template above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const StatusIcon =
                run.status === "completed"
                  ? CheckCircle2
                  : run.status === "failed"
                    ? XCircle
                    : Loader2;
              return (
                <Card
                  key={run.id}
                  hoverable
                  clickable
                  onClick={() => navigate(`/workflows/${run.id}`)}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={`w-4 h-4 ${
                        run.status === "completed"
                          ? "text-[#065F46]"
                          : run.status === "failed"
                            ? "text-[#991B1B]"
                            : "text-[#92400E] animate-spin"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">
                        {run.templateName}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {new Date(run.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[run.status] ?? "default"}>
                    {run.status}
                  </Badge>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </Page>
  );
}
