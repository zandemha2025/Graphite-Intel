import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { ChevronLeft, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  updatedAt: string;
}

export function WorkflowView() {
  const [, params] = useRoute("/workflows/:id");
  const runId = parseInt(params?.id || "0", 10);

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;

    Promise.all([
      fetch(`/api/workflows/${runId}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/workflows/templates", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([runData, templateData]) => {
        setRun(runData);
        setTemplates(Array.isArray(templateData) ? templateData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-white/6" />
        <div className="h-12 w-2/3 bg-white/4" />
        <div className="h-64 bg-white/3" />
      </div>
    );
  }

  if (!run || (run as { error?: string }).error) {
    return <div className="text-center py-20 text-[#E8E4DC]/35 text-sm">Workflow run not found.</div>;
  }

  const template = templates.find((t) => t.key === run.templateKey);

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <Link
        href="/workflows"
        className="inline-flex items-center text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 mb-8 transition-colors uppercase tracking-widest"
      >
        <ChevronLeft className="w-3 h-3 mr-1" /> Workflow Agents
      </Link>

      <div className="border border-white/10 mb-1">
        <div className="px-8 py-8 border-b border-white/8">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-[#E8E4DC]/30 mt-1 shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 border border-white/12 px-2 py-0.5 inline-block mb-3">
                {run.templateKey.replace(/_/g, " ")}
              </div>
              <h1 className="font-serif text-4xl font-light text-[#E8E4DC] leading-tight">
                {template?.name || run.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Executed</p>
            <p className="text-sm text-[#E8E4DC]/75">{format(new Date(run.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Status</p>
            <p className="text-sm text-[#E8E4DC]/75 capitalize">{run.status}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Template</p>
            <p className="text-sm text-[#E8E4DC]/75">{template?.name || run.templateKey}</p>
          </div>
        </div>

        {Object.keys(run.inputs).length > 0 && (
          <div className="px-8 py-5 border-b border-white/8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-3">Inputs Provided</p>
            <div className="space-y-3">
              {template?.questions.map((q) => {
                const val = run.inputs[q.key];
                if (!val) return null;
                return (
                  <div key={q.key}>
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#E8E4DC]/30 mb-1">{q.label}</p>
                    <p className="text-xs text-[#E8E4DC]/60 leading-relaxed line-clamp-3">{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-8 pt-10">
        {run.output ? (
          <div className="prose prose-invert max-w-none
            prose-headings:font-serif prose-headings:font-light prose-headings:text-[#E8E4DC]/90 prose-headings:tracking-tight
            prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:border-b prose-h1:border-white/8 prose-h1:pb-4
            prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8
            prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-[#E8E4DC]/75
            prose-p:text-[#E8E4DC]/60 prose-p:leading-relaxed prose-p:text-sm
            prose-strong:text-[#E8E4DC]/80 prose-strong:font-medium
            prose-li:text-[#E8E4DC]/60 prose-li:text-sm prose-li:leading-relaxed
            prose-ul:space-y-1 prose-ol:space-y-1
            prose-blockquote:border-l-[#E8E4DC]/20 prose-blockquote:text-[#E8E4DC]/45
            prose-code:text-[#E8E4DC]/70 prose-code:bg-white/5 prose-code:px-1
          ">
            <ReactMarkdown>{run.output}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-[#E8E4DC]/30 italic">
            {run.status === "generating"
              ? "Workflow is still generating..."
              : "Output not available."}
          </p>
        )}
      </div>
    </div>
  );
}
