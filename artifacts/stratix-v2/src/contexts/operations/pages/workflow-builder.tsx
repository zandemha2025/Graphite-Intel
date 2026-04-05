import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api, apiPost, apiDelete } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published";
  steps: unknown[];
  trigger: { type: string };
  createdAt: string;
}

interface WorkflowExecution {
  id: string;
  definitionId: string;
  definitionName: string;
  status: string;
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  schedule: "Schedule",
  data_change: "Data Change",
};

export default function WorkflowBuilderPage() {
  const [, navigate] = useLocation();
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [defs, execs] = await Promise.all([
        api<WorkflowDefinition[]>("/workflow-definitions"),
        api<WorkflowExecution[]>("/workflow-executions"),
      ]);
      setDefinitions(defs);
      setExecutions(execs);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    try {
      const def = await apiPost<WorkflowDefinition>("/workflow-definitions", {
        name: "Untitled Workflow",
        description: "",
        steps: [],
        trigger: { type: "manual" },
      });
      navigate(`/workflow-builder/${def.id}`);
    } catch {
      // creation failed
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/workflow-definitions/${id}`);
      setDefinitions((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // delete failed
    }
  }

  async function handleTogglePublish(def: WorkflowDefinition) {
    try {
      if (def.status === "draft") {
        await apiPost(`/workflow-definitions/${def.id}/publish`, {});
        setDefinitions((prev) =>
          prev.map((d) =>
            d.id === def.id ? { ...d, status: "published" } : d,
          ),
        );
      } else {
        // unpublish by updating status
        const updated = await api<WorkflowDefinition>(
          `/workflow-definitions/${def.id}`,
          { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "draft" }) } as RequestInit,
        );
        setDefinitions((prev) =>
          prev.map((d) => (d.id === def.id ? { ...d, status: updated.status ?? "draft" } : d)),
        );
      }
    } catch {
      // toggle failed
    }
  }

  async function handleTrigger(id: string) {
    try {
      await apiPost(`/workflow-definitions/${id}/trigger`, {});
      await load();
    } catch {
      // trigger failed
    }
  }

  if (loading) {
    return (
      <Page title="Workflow Builder" subtitle="Build and manage custom workflows">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Workflow Builder"
      subtitle="Build and manage custom workflows"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/workflows")}>
            <ArrowLeft className="w-4 h-4" />
            Workflows
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            New Workflow
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions">Definitions</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions">
          {definitions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#E5E5E3] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">No workflow definitions yet</p>
              <Button variant="ghost" className="mt-2" onClick={handleCreate}>
                <Plus className="w-4 h-4" />
                Create your first
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {definitions.map((def) => (
                <Card key={def.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[#0A0A0A] truncate">
                        {def.name}
                      </h3>
                      {def.description && (
                        <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">
                          {def.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={def.status === "published" ? "success" : "default"}>
                      {def.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <span>{def.steps.length} step{def.steps.length !== 1 ? "s" : ""}</span>
                    <span className="text-[#E5E5E3]">|</span>
                    <Badge variant="info">
                      {TRIGGER_LABELS[def.trigger?.type] ?? def.trigger?.type ?? "manual"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#F3F3F1]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/workflow-builder/${def.id}`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(def)}
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      {def.status === "draft" ? "Publish" : "Unpublish"}
                    </Button>
                    {def.status === "published" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTrigger(def.id)}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Run
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(def.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#DC2626]" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions">
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#E5E5E3] rounded-xl">
              <p className="text-sm text-[#9CA3AF]">No workflow executions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => {
                const StatusIcon =
                  exec.status === "completed"
                    ? CheckCircle2
                    : exec.status === "failed"
                      ? XCircle
                      : Loader2;
                const statusColor =
                  exec.status === "completed"
                    ? "text-[#065F46]"
                    : exec.status === "failed"
                      ? "text-[#991B1B]"
                      : "text-[#92400E] animate-spin";
                return (
                  <Card
                    key={exec.id}
                    hoverable
                    clickable
                    onClick={() => navigate(`/workflow-executions/${exec.id}`)}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">
                          {exec.definitionName}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {new Date(exec.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        exec.status === "completed"
                          ? "success"
                          : exec.status === "failed"
                            ? "error"
                            : "warning"
                      }
                    >
                      {exec.status}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Page>
  );
}
