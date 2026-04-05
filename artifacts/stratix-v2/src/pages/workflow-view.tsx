import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { api } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface WorkflowRun {
  id: string;
  templateKey: string;
  templateName: string;
  status: string;
  output: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "default"> = {
  completed: "success",
  running: "warning",
  failed: "error",
};

export default function WorkflowViewPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/workflows/:id");
  const runId = params?.id ?? "";

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<WorkflowRun>(`/workflows/${runId}`);
        setRun(data);
      } catch {
        // load failed
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId]);

  if (loading) {
    return (
      <Page title="Workflow Run">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </Page>
    );
  }

  if (!run) {
    return (
      <Page title="Run Not Found">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[#9CA3AF]">Could not load workflow run</p>
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
      title={run.templateName}
      subtitle={`Run ${run.id}`}
      actions={
        <Button variant="ghost" onClick={() => navigate("/workflows")}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      }
    >
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[run.status] ?? "default"}>
            {run.status}
          </Badge>
          <span className="text-xs text-[#9CA3AF]">
            {new Date(run.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <Card>
          <div className="prose prose-sm max-w-none text-[#0A0A0A]">
            <ReactMarkdown>{run.output}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </Page>
  );
}
