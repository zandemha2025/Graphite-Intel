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
        <Loader2 className="h-6 w-6 text-[#E8E4DC]/30 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[#E8E4DC]/40">Template not found.</p>
        <Link href="/workflows" className="text-xs text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 mt-4 inline-block uppercase tracking-widest">
          Back to Workflows
        </Link>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div className="border border-white/10">
          <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#E8E4DC]/60 animate-spin" />
                <h2 className="font-serif text-xl font-light text-[#E8E4DC]">{template.name}</h2>
              </div>
              <p className="text-xs text-[#E8E4DC]/35 mt-1 ml-7">Agent is executing the workflow...</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 border border-white/12 px-2 py-1 animate-pulse">
              Processing
            </span>
          </div>

          <div
            ref={streamingRef}
            className="p-8 min-h-[500px] max-h-[600px] overflow-y-auto font-mono text-sm leading-relaxed text-[#E8E4DC]/50 bg-[#0A0908]"
          >
            <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/25">
              Executing {template.name} workflow...
            </div>
            <div className="whitespace-pre-wrap text-[#E8E4DC]/65">{streamingContent}</div>
            <span className="inline-block w-1.5 h-4 bg-[#E8E4DC]/40 ml-0.5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500 pb-20">
        <div className="border border-white/10 mb-1">
          <div className="px-8 py-6 border-b border-white/8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 border border-white/12 px-2 py-0.5 inline-block mb-3">
                  Workflow Complete
                </div>
                <h1 className="font-serif text-3xl font-light text-[#E8E4DC] leading-tight">
                  {template.name}
                </h1>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {completedRunId && (
                  <Link
                    href={`/workflows/${completedRunId}`}
                    className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 hover:border-white/30 transition-colors"
                  >
                    View Full Run
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link
                  href="/workflows"
                  className="flex items-center gap-2 border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 transition-colors"
                >
                  Back to Workflows
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 pt-10">
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
          className="inline-flex items-center text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 mb-6 transition-colors uppercase tracking-widest"
        >
          <ChevronLeft className="w-3 h-3 mr-1" /> Workflow Agents
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-4 w-4 text-[#E8E4DC]/40" />
          <h1 className="font-serif text-3xl font-light text-[#E8E4DC]">{template.name}</h1>
        </div>
        <p className="text-sm text-[#E8E4DC]/40">{template.description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {template.questions.map((question) => (
          <div key={question.key} className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">
              {question.label}{" "}
              {!question.required && (
                <span className="normal-case tracking-normal text-[#E8E4DC]/25">(optional)</span>
              )}
            </label>
            {question.placeholder.length > 80 ? (
              <textarea
                value={inputs[question.key] || ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [question.key]: e.target.value }))}
                placeholder={question.placeholder}
                rows={question.key === "deck_content" ? 8 : 4}
                required={question.required}
                className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
                data-testid={`input-${question.key}`}
              />
            ) : (
              <input
                type="text"
                value={inputs[question.key] || ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [question.key]: e.target.value }))}
                placeholder={question.placeholder}
                required={question.required}
                className="w-full bg-transparent border-b border-white/20 py-3 text-[#E8E4DC] text-base font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/50 transition-colors"
                data-testid={`input-${question.key}`}
              />
            )}
          </div>
        ))}

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-[#E8E4DC] text-[#0D0C0B] py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors flex items-center justify-center gap-2"
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
