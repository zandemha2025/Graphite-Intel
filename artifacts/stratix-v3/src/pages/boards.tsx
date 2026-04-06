import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPost } from "@/lib/api";
import {
  Plus,
  LayoutGrid,
  Play,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  FileText,
  Activity,
  Eye,
  Wrench,
} from "lucide-react";

/* ---------- Types ---------- */

interface Board {
  id: string;
  title: string;
  type: "live" | "report" | "monitor";
  updatedAt: string;
  cardCount?: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  intakeQuestions: { id: string; label: string }[];
}

interface WorkflowRun {
  id: string;
  templateId: string;
  templateName: string;
  status: "running" | "completed" | "failed" | "queued";
  createdAt: string;
  outputPreview?: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  stepCount: number;
  updatedAt: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Tabs config ---------- */

const tabs = [
  { id: "dashboards", label: "Dashboards" },
  { id: "automations", label: "Automations" },
];

/* ---------- Dashboards Tab ---------- */

function DashboardsTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ["boards"],
    queryFn: () =>
      api<{ boards: Board[] }>("/boards").then((r) => r.boards),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<{ board: Board }>("/boards", {
        title: "Untitled Board",
        type: "live",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/boards/${data.board.id}`);
      toast.success("Board created");
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  function getTypeBadge(type: Board["type"]) {
    switch (type) {
      case "live":
        return (
          <Badge variant="success">
            <Activity className="mr-1 h-3 w-3" />
            Live
          </Badge>
        );
      case "report":
        return (
          <Badge variant="info">
            <FileText className="mr-1 h-3 w-3" />
            Report
          </Badge>
        );
      case "monitor":
        return (
          <Badge variant="warning">
            <Eye className="mr-1 h-3 w-3" />
            Monitor
          </Badge>
        );
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <LayoutGrid className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">No boards yet</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Create a board to arrange insights into dashboards and reports.
        </p>
        <Button
          size="sm"
          className="mt-4"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Create Board
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <Card
          key={board.id}
          className="cursor-pointer transition-colors hover:border-[#4F46E5]/30"
          onClick={() => navigate(`/boards/${board.id}`)}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-[#111827] truncate">
              {board.title}
            </p>
            {getTypeBadge(board.type)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>
              Updated {format(new Date(board.updatedAt), "MMM d, yyyy")}
            </span>
            {board.cardCount !== undefined && (
              <span>{board.cardCount} cards</span>
            )}
          </div>
        </Card>
      ))}
      {/* Create new card */}
      <button
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-[#6B7280] transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">New Board</span>
      </button>
    </div>
  );
}

/* ---------- Automations Tab ---------- */

function AutomationsTab() {
  const [, navigate] = useLocation();

  const { data: templates, isLoading: templatesLoading } = useQuery<
    WorkflowTemplate[]
  >({
    queryKey: ["workflow-templates"],
    queryFn: () =>
      api<{ templates: WorkflowTemplate[] }>("/workflows/templates").then(
        (r) => r.templates,
      ),
  });

  const { data: runs, isLoading: runsLoading } = useQuery<WorkflowRun[]>({
    queryKey: ["workflow-runs"],
    queryFn: () =>
      api<{ workflows: WorkflowRun[] }>("/workflows").then(
        (r) => r.workflows,
      ),
  });

  const { data: definitions, isLoading: defsLoading } = useQuery<
    WorkflowDefinition[]
  >({
    queryKey: ["workflow-definitions"],
    queryFn: () =>
      api<{ definitions: WorkflowDefinition[] }>(
        "/workflow-definitions",
      ).then((r) => r.definitions),
  });

  function getRunStatusBadge(status: WorkflowRun["status"]) {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="info">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "queued":
        return (
          <Badge variant="default">
            <Clock className="mr-1 h-3 w-3" />
            Queued
          </Badge>
        );
    }
  }

  const isLoading = templatesLoading || runsLoading || defsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Workflow Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">
              Workflow Templates
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Pre-built intelligence workflows ready to run.
            </p>
          </div>
        </div>
        {templates && templates.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-sm font-medium text-[#111827]">
                      {tpl.name}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {tpl.description}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">
                    {tpl.intakeQuestions.length} intake question
                    {tpl.intakeQuestions.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/workflows/${tpl.id}/run`)
                    }
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10">
            <Zap className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">
              No templates available
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Workflow templates will appear here when configured.
            </p>
          </Card>
        )}
      </div>

      {/* Custom Workflow Definitions */}
      {definitions && definitions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#111827]">
                Custom Workflows
              </h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Your custom workflow definitions.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/workflows/builder")}
            >
              <Wrench className="h-3.5 w-3.5" />
              Builder
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {definitions.map((def) => (
              <Card key={def.id}>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#6B7280]" />
                  <p className="text-sm font-medium text-[#111827]">
                    {def.name}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {def.description}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#9CA3AF]">
                  <span>{def.stepCount} steps</span>
                  <span>
                    Updated{" "}
                    {format(new Date(def.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#111827]">Recent Runs</h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            History of workflow executions.
          </p>
        </div>
        {runs && runs.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Workflow
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                    Output
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB]"
                  >
                    <td className="px-4 py-3 font-medium text-[#111827]">
                      {run.templateName}
                    </td>
                    <td className="px-4 py-3">
                      {getRunStatusBadge(run.status)}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {format(new Date(run.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-[#6B7280]">
                      {run.outputPreview ?? "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10">
            <Clock className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">No runs yet</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Run a workflow template to see results here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function BoardsPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<{ board: Board }>("/boards", {
        title: "Untitled Board",
        type: "live",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/boards/${data.board.id}`);
      toast.success("Board created");
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  return (
    <Page
      title="Boards"
      subtitle="Live dashboards, report boards, and monitoring boards"
      actions={
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      }
    >
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "dashboards") return <DashboardsTab />;
          return <AutomationsTab />;
        }}
      </Tabs>
    </Page>
  );
}
