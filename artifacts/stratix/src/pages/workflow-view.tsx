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
        <div className="h-4 w-20" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="h-12 w-2/3" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="h-64" style={{ background: "var(--workspace-muted-bg)" }} />
      </div>
    );
  }

  if (!run || (run as { error?: string }).error) {
    return <div className="text-center py-20 text-sm" style={{ color: "var(--workspace-muted)" }}>Workflow run not found.</div>;
  }

  const template = templates.find((t) => t.key === run.templateKey);

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <Link
        href="/workflows"
        className="inline-flex items-center text-xs mb-8 font-medium transition-colors"
        style={{ color: "var(--workspace-muted)" }}
      >
        <ChevronLeft className="w-3 h-3 mr-1" /> Workflow Agents
      </Link>

      <div className="mb-1" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
        <div className="px-8 py-8 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 mt-1 shrink-0" style={{ color: "var(--workspace-muted)" }} />
            <div>
              <div className="text-xs font-medium inline-block px-2 py-0.5 mb-3" style={{ color: "var(--workspace-muted)", border: "1px solid var(--workspace-border)" }}>
                {run.templateKey.replace(/_/g, " ")}
              </div>
              <h1 className="font-sans text-2xl font-semibold tracking-tight leading-tight" style={{ color: "var(--workspace-fg)" }}>
                {template?.name || run.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <div className="px-5 py-3.5 border-r" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Executed</p>
            <p className="text-sm" style={{ color: "var(--workspace-fg)" }}>{format(new Date(run.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="px-5 py-3.5 border-r" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Status</p>
            <p className="text-sm capitalize" style={{ color: "var(--workspace-fg)" }}>{run.status}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Template</p>
            <p className="text-sm" style={{ color: "var(--workspace-fg)" }}>{template?.name || run.templateKey}</p>
          </div>
        </div>

        {Object.keys(run.inputs).length > 0 && (
          <div className="px-8 py-5 border-b" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--workspace-muted)" }}>Inputs Provided</p>
            <div className="space-y-3">
              {template?.questions.map((q) => {
                const val = run.inputs[q.key];
                if (!val) return null;
                return (
                  <div key={q.key}>
                    <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>{q.label}</p>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--workspace-fg)" }}>{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-8 pt-10 pb-10" style={{ border: "1px solid var(--workspace-border)", borderTop: "none", background: "#FFFFFF" }}>
        {run.output ? (
          <div className="prose prose-sm max-w-[70ch]"
            style={{
              "--tw-prose-body": "var(--workspace-fg)",
              "--tw-prose-headings": "var(--workspace-fg)",
              "--tw-prose-lead": "var(--workspace-muted)",
              "--tw-prose-links": "var(--workspace-fg)",
              "--tw-prose-bold": "var(--workspace-fg)",
              "--tw-prose-counters": "var(--workspace-muted)",
              "--tw-prose-bullets": "var(--workspace-muted)",
              "--tw-prose-hr": "var(--workspace-border)",
              "--tw-prose-quotes": "var(--workspace-fg)",
              "--tw-prose-quote-borders": "var(--workspace-border)",
              "--tw-prose-captions": "var(--workspace-muted)",
              "--tw-prose-code": "var(--workspace-fg)",
              "--tw-prose-pre-code": "var(--workspace-fg)",
              "--tw-prose-pre-bg": "var(--workspace-muted-bg)",
              "--tw-prose-th-borders": "var(--workspace-border)",
              "--tw-prose-td-borders": "var(--workspace-border)",
            } as React.CSSProperties}
          >
            <ReactMarkdown>{run.output}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: "var(--workspace-muted)" }}>
            {run.status === "generating"
              ? "Workflow is still generating..."
              : "Output not available."}
          </p>
        )}
      </div>
    </div>
  );
}
