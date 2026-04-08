import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Play, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

/* ── Types ── */

type QuestionField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

type Template = {
  key: string;
  name: string;
  description: string;
  icon?: string;
  questions?: QuestionField[];
};

type WorkflowResult = {
  id: number;
  status: string;
  output?: string;
  title?: string;
  createdAt?: string;
};

/* ── Status Badge ── */

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#D5E8D8] text-[#3C8B4E]">
        <CheckCircle className="h-3 w-3" /> Complete
      </span>
    );
  }
  if (s === "generating" || s === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#D5DDE8] text-[#3C5E8B]">
        <Clock className="h-3 w-3" /> Generating
      </span>
    );
  }
  if (s === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#E8D5D5] text-[var(--error)]">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--surface-secondary)] text-[var(--text-muted)]">
      {status}
    </span>
  );
}

/* ── Main ── */

export function WorkflowRun() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/connect/workflows/:templateKey");
  const templateKey = params?.templateKey || "";

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch template
  useEffect(() => {
    if (!templateKey) return;
    fetch("/api/workflows/templates", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: Template[] = Array.isArray(data) ? data : data?.templates || [];
        const found = list.find((t) => t.key === templateKey) || null;
        setTemplate(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [templateKey]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollForResult = useCallback((id: number) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setResult(data);
        const s = (data.status || "").toLowerCase();
        if (s === "complete" || s === "completed" || s === "failed") {
          setPolling(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !template) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateKey: template.key, inputs: formValues }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        const s = (data.status || "").toLowerCase();
        if (s === "generating" || s === "running") {
          pollForResult(data.id);
        }
      }
    } catch {
      // handled below
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setLocation("/connect")}
          className="flex items-center gap-1.5 text-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Connect
        </button>
        <div className="text-center py-16">
          <p className="text-body text-[var(--text-muted)]">Workflow template not found.</p>
        </div>
      </div>
    );
  }

  const questions = template.questions || [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => setLocation("/connect")}
        className="flex items-center gap-1.5 text-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Connect
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">
          {template.name}
        </h1>
        {template.description && (
          <p className="mt-2 text-body text-[var(--text-secondary)] leading-relaxed">
            {template.description}
          </p>
        )}
      </div>

      {/* Form or Results */}
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {questions.length > 0 ? (
            questions.map((q) => (
              <div key={q.key}>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
                  {q.label}
                  {q.required && <span className="text-[var(--error)] ml-0.5">*</span>}
                </label>
                <textarea
                  value={formValues[q.key] || ""}
                  onChange={(e) => handleFieldChange(q.key, e.target.value)}
                  placeholder={q.placeholder || ""}
                  required={q.required}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                />
              </div>
            ))
          ) : (
            <p className="text-body-sm text-[var(--text-muted)] py-4">
              This workflow has no input fields. Click below to run it.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Run Workflow
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <div>
              <p className="text-body-sm font-medium text-[var(--text-primary)]">
                {result.title || template.name}
              </p>
              {result.createdAt && (
                <p className="text-caption text-[var(--text-muted)] mt-0.5">
                  {new Date(result.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <StatusBadge status={result.status} />
          </div>

          {/* Polling indicator */}
          {polling && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-body-sm text-[var(--accent)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating results... checking every few seconds.
            </div>
          )}

          {/* Output */}
          {result.output && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="prose-warm">
                <ReactMarkdown>{result.output}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Run again */}
          <button
            onClick={() => {
              setResult(null);
              setFormValues({});
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-[var(--accent)]" /> Run Again
          </button>
        </div>
      )}
    </div>
  );
}
