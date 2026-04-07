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
import { Input } from "@/components/ui/input";
import { api, apiPost, apiDelete } from "@/lib/api";
import {
  Plus,
  BookMarked,
  Trash2,
  Clock,
  CheckCircle2,
  FileText,
  Copy,
  Globe,
  Rocket,
  Swords,
  Target,
  Palette,
  PenTool,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

/* ---------- Types ---------- */

interface PlaybookStep {
  title: string;
  description: string;
  type: string;
}

interface Playbook {
  id: string;
  title: string;
  description?: string;
  steps: PlaybookStep[];
  status: "draft" | "active" | "archived";
  isTemplate: boolean;
  lastRunAt?: string;
  updatedAt: string;
  createdAt: string;
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
  { id: "my-playbooks", label: "My Playbooks" },
  { id: "templates", label: "Templates" },
];

/* ---------- Create Dialog ---------- */

function CreatePlaybookDialog({
  open,
  onClose,
  onCreate,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-[#111827]">
          New Playbook
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Create a new strategic playbook with step-by-step procedures.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="Title"
            placeholder="e.g., Competitive Intelligence Analysis"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#111827]">
              Description
            </label>
            <textarea
              placeholder="Describe the purpose and scope of this playbook..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onCreate(title, description)}
            loading={loading}
            disabled={!title.trim()}
          >
            Create Playbook
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Delete Confirmation ---------- */

function DeleteConfirm({
  open,
  playbookTitle,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  playbookTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-[#111827]">
          Delete playbook
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Are you sure you want to delete{" "}
          <span className="font-medium text-[#111827]">{playbookTitle}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Status Badge ---------- */

function StatusBadge({ status }: { status: Playbook["status"] }) {
  switch (status) {
    case "active":
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="default">
          <FileText className="mr-1 h-3 w-3" />
          Draft
        </Badge>
      );
    case "archived":
      return (
        <Badge variant="warning">
          <Clock className="mr-1 h-3 w-3" />
          Archived
        </Badge>
      );
  }
}

/* ---------- My Playbooks Tab ---------- */

function MyPlaybooksTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Playbook | null>(null);

  const { data: playbooks, isLoading } = useQuery<Playbook[]>({
    queryKey: ["playbooks"],
    queryFn: () =>
      api<Playbook[]>("/playbooks"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string }) =>
      apiPost<Playbook>("/playbooks", { name: (payload as any).title || (payload as any).name, description: (payload as any).description }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      setCreateOpen(false);
      navigate(`/playbooks/${data.id}`);
      toast.success("Playbook created");
    },
    onError: () => {
      toast.error("Failed to create playbook");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/playbooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      setDeleteTarget(null);
      toast.success("Playbook deleted");
    },
    onError: () => {
      toast.error("Failed to delete playbook");
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!playbooks || playbooks.length === 0) {
    return (
      <>
        <div className="text-center py-16">
          <p className="text-[15px] text-[#6B7280] mb-4">No playbooks yet</p>
          <button
            className="text-[13px] text-[#4F46E5] hover:underline"
            onClick={() => setCreateOpen(true)}
          >
            + Create your first playbook
          </button>
        </div>

        <CreatePlaybookDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={(title, description) =>
            createMutation.mutate({ title, description })
          }
          loading={createMutation.isPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {playbooks.map((pb) => (
          <Card
            key={pb.id}
            className="group cursor-pointer transition-colors hover:border-[#4F46E5]/30"
            onClick={() => navigate(`/playbooks/${pb.id}`)}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#111827] truncate">
                {pb.title}
              </p>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={pb.status} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(pb);
                  }}
                  className="hidden rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-red-500 group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {pb.description && (
              <p className="mb-2 text-xs text-[#6B7280] line-clamp-2">
                {pb.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                {pb.steps.length} step{pb.steps.length !== 1 ? "s" : ""}
              </span>
              <span>
                {pb.lastRunAt
                  ? `Last run ${format(new Date(pb.lastRunAt), "MMM d")}`
                  : `Updated ${format(new Date(pb.updatedAt), "MMM d")}`}
              </span>
            </div>
          </Card>
        ))}

        {/* New playbook dashed card */}
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-[#6B7280] transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New Playbook</span>
        </button>
      </div>

      <CreatePlaybookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(title, description) =>
          createMutation.mutate({ title, description })
        }
        loading={createMutation.isPending}
      />

      <DeleteConfirm
        open={deleteTarget !== null}
        playbookTitle={deleteTarget?.title ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

/* ---------- Client-Side Playbook Templates ---------- */

const CLIENT_TEMPLATES = [
  {
    name: "New Market Entry",
    description: "Step-by-step process for evaluating and entering a new market",
    icon: Globe,
    steps: [
      "Define target market criteria",
      "Conduct TAM/SAM/SOM analysis",
      "Map competitive landscape",
      "Assess regulatory requirements",
      "Build GTM plan",
      "Define success metrics",
    ],
  },
  {
    name: "Product Launch",
    description: "Complete product launch checklist from positioning to post-launch",
    icon: Rocket,
    steps: [
      "Define positioning & messaging",
      "Create launch timeline",
      "Prepare sales enablement",
      "Set up tracking & analytics",
      "Execute launch campaigns",
      "Conduct 30-day retrospective",
    ],
  },
  {
    name: "Competitor Response",
    description: "How to respond when a competitor makes a major move",
    icon: Swords,
    steps: [
      "Assess competitor move impact",
      "Gather customer sentiment",
      "Identify differentiation opportunities",
      "Develop response messaging",
      "Brief sales team",
      "Monitor market reaction",
    ],
  },
  {
    name: "ABM Campaign",
    description: "Account-based marketing campaign from target selection to close",
    icon: Target,
    steps: [
      "Select target accounts",
      "Research account priorities",
      "Create personalized content",
      "Execute multi-channel outreach",
      "Track engagement signals",
      "Coordinate with sales",
      "Measure pipeline impact",
    ],
  },
  {
    name: "Brand Repositioning",
    description: "Rebrand or reposition your product in the market",
    icon: Palette,
    steps: [
      "Audit current brand perception",
      "Define new positioning",
      "Develop messaging framework",
      "Update all touchpoints",
      "Internal rollout",
      "External launch",
      "Measure perception shift",
    ],
  },
  {
    name: "Content Marketing Engine",
    description: "Build a repeatable content marketing machine",
    icon: PenTool,
    steps: [
      "Audit existing content",
      "Define content pillars",
      "Create editorial calendar",
      "Establish production workflow",
      "Set distribution channels",
      "Build measurement framework",
    ],
  },
  {
    name: "Customer Expansion",
    description: "Systematic approach to expanding revenue from existing customers",
    icon: TrendingUp,
    steps: [
      "Segment customer base",
      "Identify expansion signals",
      "Create upsell playbooks",
      "Train CS/sales on triggers",
      "Execute campaigns",
      "Track expansion ARR",
    ],
  },
  {
    name: "Crisis Communication",
    description: "Handle PR crises, outages, or negative press",
    icon: ShieldAlert,
    steps: [
      "Assess situation severity",
      "Activate response team",
      "Draft initial statement",
      "Notify key stakeholders",
      "Monitor social/media",
      "Issue follow-up communications",
      "Conduct post-mortem",
    ],
  },
];

/* ---------- Templates Tab ---------- */

function TemplatesTab() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<Playbook[]>({
    queryKey: ["playbook-templates"],
    queryFn: () =>
      api<Playbook[]>("/playbooks?isTemplate=true"),
  });

  const useTemplateMutation = useMutation({
    mutationFn: (payload: { name: string; description: string; steps: string[] }) =>
      apiPost<Playbook>("/playbooks", {
        name: payload.name,
        description: payload.description,
        steps: payload.steps.map((s) => ({ title: s, description: "", type: "action" })),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      navigate(`/playbooks/${data.id}`);
      toast.success("Playbook created from template");
    },
    onError: () => {
      toast.error("Failed to create from template");
    },
  });

  const useServerTemplateMutation = useMutation({
    mutationFn: (template: Playbook) =>
      apiPost<{ playbook: Playbook }>("/playbooks", {
        name: template.title,
        description: template.description,
        steps: template.steps,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      navigate(`/playbooks/${data.id}`);
      toast.success("Playbook created from template");
    },
    onError: () => {
      toast.error("Failed to create from template");
    },
  });

  const isPending = useTemplateMutation.isPending || useServerTemplateMutation.isPending;

  return (
    <div className="space-y-8">
      {/* Client-side templates always shown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CLIENT_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <Card key={tpl.name}>
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#4F46E5]" />
                  <p className="text-sm font-medium text-[#111827]">
                    {tpl.name}
                  </p>
                </div>
                <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">
                  {tpl.description}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">
                  {tpl.steps.length} step{tpl.steps.length !== 1 ? "s" : ""}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    useTemplateMutation.mutate({
                      name: tpl.name,
                      description: tpl.description,
                      steps: tpl.steps,
                    })
                  }
                  loading={isPending}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Use Template
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Server-side templates if available */}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#111827]">
            Organization Templates
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-sm font-medium text-[#111827]">
                      {tpl.title}
                    </p>
                  </div>
                  {tpl.description && (
                    <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF]">
                    {tpl.steps.length} step{tpl.steps.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => useServerTemplateMutation.mutate(tpl)}
                    loading={isPending}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function PlaybooksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description: string }) =>
      apiPost<Playbook>("/playbooks", { name: (payload as any).title || (payload as any).name, description: (payload as any).description }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["playbooks"] });
      setCreateOpen(false);
      navigate(`/playbooks/${data.id}`);
      toast.success("Playbook created");
    },
    onError: () => {
      toast.error("Failed to create playbook");
    },
  });

  return (
    <Page
      title="Playbooks"
      subtitle="Standard operating procedures for strategic intelligence"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Playbook
        </Button>
      }
    >
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "my-playbooks") return <MyPlaybooksTab />;
          return <TemplatesTab />;
        }}
      </Tabs>

      <CreatePlaybookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(title, description) =>
          createMutation.mutate({ title, description })
        }
        loading={createMutation.isPending}
      />
    </Page>
  );
}
