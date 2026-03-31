import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { Loader2, ChevronLeft, Zap, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface WorkflowQuestion {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface WorkflowTemplate {
  key: string;
  name: string;
  description: string;
  questions: WorkflowQuestion[];
}

type Phase = "intake" | "running" | "complete";

export function WorkflowRunner() {
  const [, params] = useRoute("/workflows/new/:templateKey");
  const templateKey = params?.templateKey || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("intake");
  const [streamingContent, setStreamingContent] = useState("");
  const [completedRunId, setCompletedRunId] = useState<number | null>(null);
  const streamingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/workflows/templates", { credentials: "include" })
      .then((r) => r.json())
      .then((data: WorkflowTemplate[]) => {
        const found = data.find((t) => t.key === templateKey);
        setTemplate(found || null);
        setLoadingTemplate(false);
      })
      .catch(() => setLoadingTemplate(false));
  }, [templateKey]);

  useEffect(() => {
    if (phase === "running" && streamingRef.current) {
      streamingRef.current.scrollTop = streamingRef.current.scrollHeight;
    }
  }, [streamingContent, phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    const missing = template.questions.filter((q) => q.required && !inputs[q.key]?.trim());
    if (missing.length > 0) {
      toast({ title: "Required fields missing", description: `Please fill in: ${missing.map((m) => m.label).join(", ")}`, variant: "destructive" });
      return;
    }

    setPhase("running");
    setStreamingContent("");

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, inputs }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to start workflow");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let runId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "run_created") {
            runId = data.id;
          } else if (event === "content") {
            setStreamingContent((prev) => prev + data.delta);
          } else if (event === "complete") {
            setCompletedRunId(runId);
            setPhase("complete");
            return;
          } else if (event === "error") {
            throw new Error(data.error || "Workflow execution failed");
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({ title: "Workflow failed", description: message, variant: "destructive" });
      setPhase("intake");
    }
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--workspace-muted)" }} />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Template not found.</p>
        <Link href="/workflows" className="text-xs mt-4 inline-block uppercase tracking-widest" style={{ color: "var(--workspace-fg)" }}>
          Back to Workflows
        </Link>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--workspace-border)" }}>
            <div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--workspace-muted)" }} />
                <h2 className="font-serif text-xl font-light" style={{ color: "var(--workspace-fg)" }}>{template.name}</h2>
              </div>
              <p className="text-xs mt-1 ml-7" style={{ color: "var(--workspace-muted)" }}>Agent is executing the workflow...</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 animate-pulse" style={{ color: "var(--workspace-muted)", border: "1px solid var(--workspace-border)" }}>
              Processing
            </span>
          </div>

          <div
            ref={streamingRef}
            className="p-8 min-h-[500px] max-h-[600px] overflow-y-auto font-mono text-sm leading-relaxed"
            style={{ background: "var(--workspace-muted-bg)" }}
          >
            <div className="mb-4 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>
              Executing {template.name} workflow...
            </div>
            <div className="whitespace-pre-wrap" style={{ color: "var(--workspace-fg)" }}>{streamingContent}</div>
            <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: "var(--workspace-muted)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-20">
        <div className="mb-1" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <div className="px-8 py-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] inline-block px-2 py-0.5 mb-3" style={{ color: "var(--workspace-muted)", border: "1px solid var(--workspace-border)" }}>
                  Workflow Complete
                </div>
                <h1 className="font-serif text-3xl font-light leading-tight" style={{ color: "var(--workspace-fg)" }}>
                  {template.name}
                </h1>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {completedRunId && (
                  <Link
                    href={`/workflows/${completedRunId}`}
                    className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
                    style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                  >
                    View Full Run
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link
                  href="/workflows"
                  className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
                  style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                >
                  Back to Workflows
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pt-10 pb-10" style={{ border: "1px solid var(--workspace-border)", borderTop: "none", background: "#FFFFFF" }}>
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
            <ReactMarkdown>{streamingContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <Link
          href="/workflows"
          className="inline-flex items-center text-xs mb-6 uppercase tracking-widest transition-colors"
          style={{ color: "var(--workspace-muted)" }}
        >
          <ChevronLeft className="w-3 h-3 mr-1" /> Workflow Agents
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
          <h1 className="font-serif text-3xl font-light" style={{ color: "var(--workspace-fg)" }}>{template.name}</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>{template.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {template.questions.map((question) => (
          <div key={question.key} className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>
              {question.label}{" "}
              {!question.required && (
                <span className="normal-case tracking-normal opacity-60">(optional)</span>
              )}
            </label>
            {question.placeholder.length > 80 ? (
              <textarea
                value={inputs[question.key] || ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [question.key]: e.target.value }))}
                placeholder={question.placeholder}
                rows={question.key === "deck_content" ? 8 : 4}
                required={question.required}
                className="w-full p-3 text-sm focus:outline-none transition-colors resize-none"
                style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                data-testid={`input-${question.key}`}
              />
            ) : (
              <input
                type="text"
                value={inputs[question.key] || ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [question.key]: e.target.value }))}
                placeholder={question.placeholder}
                required={question.required}
                className="w-full py-3 text-base font-serif focus:outline-none transition-colors"
                style={{ background: "transparent", borderBottom: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                data-testid={`input-${question.key}`}
              />
            )}
          </div>
        ))}

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 text-xs uppercase tracking-widest font-medium transition-colors flex items-center justify-center gap-2"
            style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            data-testid="btn-launch-workflow"
          >
            <Zap className="w-3.5 h-3.5" />
            Launch Workflow Agent
          </button>
        </div>
      </form>
    </div>
  );
}
