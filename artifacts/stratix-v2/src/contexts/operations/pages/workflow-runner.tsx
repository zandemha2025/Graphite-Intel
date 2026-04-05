import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { api } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";

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

type Phase = "form" | "streaming" | "done" | "error";

export default function WorkflowRunnerPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/workflows/new/:key");
  const templateKey = params?.key ?? "";

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("form");
  const [output, setOutput] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const templates = await api<Template[]>("/workflows/templates");
        const found = templates.find((t) => t.key === templateKey);
        if (found) {
          setTemplate(found);
          const defaults: Record<string, string> = {};
          for (const q of found.questions) {
            defaults[q.key] = "";
          }
          setInputs(defaults);
        }
      } catch {
        // template load failed
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [templateKey]);

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;

    setPhase("streaming");
    setOutput("");
    setErrorMsg("");
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, inputs }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "run_created" && parsed.id) {
              setRunId(parsed.id);
            } else if (parsed.type === "content" && parsed.delta) {
              setOutput((prev) => prev + parsed.delta);
            } else if (parsed.type === "complete") {
              setPhase("done");
            } else if (parsed.type === "error") {
              setErrorMsg(parsed.message ?? "Workflow failed");
              setPhase("error");
            }
          } catch {
            // skip non-JSON
          }
        }
      }

      // stream ended without explicit complete event
      if (phase === "streaming") setPhase("done");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg((err as Error).message || "Workflow execution failed");
        setPhase("error");
      }
    }
  }

  if (loading) {
    return (
      <Page title="Run Workflow">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </Page>
    );
  }

  if (!template) {
    return (
      <Page title="Template Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[#9CA3AF]">
            Could not find template "{templateKey}"
          </p>
          <Button variant="secondary" onClick={() => navigate("/workflows")}>
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={template.name}
      subtitle={template.description}
      actions={
        <Button variant="ghost" onClick={() => navigate("/workflows")}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      }
    >
      {phase === "form" && (
        <Card className="max-w-2xl">
          <h2 className="text-sm font-medium text-[#404040] mb-4">
            Intake Questions
          </h2>
          <form onSubmit={handleLaunch} className="space-y-4">
            {template.questions.map((q) => (
              <div key={q.key}>
                <label className="block text-sm text-[#404040] mb-1.5">
                  {q.label}
                </label>
                {q.type === "textarea" ? (
                  <textarea
                    value={inputs[q.key] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    rows={3}
                    className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                    placeholder={`Enter ${q.label.toLowerCase()}`}
                  />
                ) : (
                  <Input
                    value={inputs[q.key] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    placeholder={`Enter ${q.label.toLowerCase()}`}
                  />
                )}
              </div>
            ))}
            <div className="pt-2">
              <Button type="submit" size="lg">
                Launch Workflow
              </Button>
            </div>
          </form>
        </Card>
      )}

      {(phase === "streaming" || phase === "done" || phase === "error") && (
        <div className="max-w-3xl space-y-4">
          {phase === "streaming" && (
            <div className="flex items-center gap-2 text-sm text-[#404040]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Running workflow...
            </div>
          )}

          {phase === "error" && (
            <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <Card>
            <pre className="whitespace-pre-wrap text-sm text-[#0A0A0A] leading-relaxed font-sans">
              {output || "Waiting for output..."}
            </pre>
          </Card>

          {phase === "done" && runId && (
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate(`/workflows/${runId}`)}>
                <ExternalLink className="w-4 h-4" />
                View Full Result
              </Button>
              <Button variant="secondary" onClick={() => navigate("/workflows")}>
                Back to Workflows
              </Button>
            </div>
          )}

          {phase === "done" && !runId && (
            <Button variant="secondary" onClick={() => navigate("/workflows")}>
              Back to Workflows
            </Button>
          )}
        </div>
      )}
    </Page>
  );
}
