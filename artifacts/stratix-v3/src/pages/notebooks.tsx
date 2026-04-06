import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPost, apiDelete } from "@/lib/api";
import {
  Plus,
  BookOpen,
  FileText,
  Trash2,
  BarChart3,
  Briefcase,
  Target,
  Search,
  CalendarDays,
} from "lucide-react";

/* ---------- Types ---------- */

interface Notebook {
  id: string;
  title: string;
  cellCount: number;
  updatedAt: string;
  published: boolean;
}

interface NotebookTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
}

/* ---------- Templates ---------- */

const TEMPLATES: NotebookTemplate[] = [
  {
    id: "campaign-performance",
    name: "Campaign Performance Deep-Dive",
    description: "Analyze campaign ROI, attribution, and performance across all channels.",
    icon: BarChart3,
  },
  {
    id: "channel-attribution",
    name: "Channel Attribution Analysis",
    description: "Understand which channels drive pipeline and revenue with multi-touch attribution.",
    icon: Target,
  },
  {
    id: "board-deck",
    name: "Board Deck: Growth Metrics",
    description: "Compile ARR, CAC, LTV, and other key metrics for board-ready presentations.",
    icon: Briefcase,
  },
  {
    id: "market-entry",
    name: "Market Entry Playbook",
    description: "Evaluate new market opportunities with TAM, competitive landscape, and GTM strategy.",
    icon: Search,
  },
  {
    id: "customer-segmentation",
    name: "Customer Segmentation Report",
    description: "Segment your customer base by behavior, value, and churn risk for targeted campaigns.",
    icon: CalendarDays,
  },
  {
    id: "competitive-positioning",
    name: "Competitive Positioning Analysis",
    description: "Map your positioning vs competitors on messaging, pricing, and feature differentiation.",
    icon: Target,
  },
  {
    id: "blank",
    name: "Blank Notebook",
    description: "Start from scratch with an empty notebook.",
    icon: FileText,
  },
];

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Template Selector Dialog ---------- */

function TemplateSelector({
  open,
  onClose,
  onSelect,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-[#111827]">
          Choose a template
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Select a starting point for your notebook.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                disabled={loading}
                onClick={() => onSelect(tpl.id)}
                className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 text-left transition-colors hover:border-[#4F46E5]/30 hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
                  <Icon className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {tpl.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    {tpl.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Delete Confirmation ---------- */

function DeleteConfirm({
  open,
  notebookTitle,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  notebookTitle: string;
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
          Delete notebook
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          Are you sure you want to delete{" "}
          <span className="font-medium text-[#111827]">{notebookTitle}</span>?
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

/* ---------- Main Page ---------- */

export default function NotebooksPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null);

  const { data: notebooks, isLoading } = useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: () =>
      api<{ notebooks: Notebook[] }>("/notebooks").then((r) => r.notebooks),
  });

  const createMutation = useMutation({
    mutationFn: (templateId: string) =>
      apiPost<{ notebook: Notebook }>("/notebooks", {
        template: templateId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setTemplateOpen(false);
      navigate(`/notebooks/${data.notebook.id}`);
      toast.success("Notebook created");
    },
    onError: () => {
      toast.error("Failed to create notebook");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/notebooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setDeleteTarget(null);
      toast.success("Notebook deleted");
    },
    onError: () => {
      toast.error("Failed to delete notebook");
    },
  });

  /* Loading */
  if (isLoading) {
    return (
      <Page
        title="Notebooks"
        subtitle="Deep, structured analysis workspaces"
        actions={
          <Button size="sm" disabled>
            <Plus className="h-4 w-4" />
            New Notebook
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </Page>
    );
  }

  /* Empty state */
  if (!notebooks || notebooks.length === 0) {
    return (
      <Page
        title="Notebooks"
        subtitle="Deep, structured analysis workspaces"
        actions={
          <Button size="sm" onClick={() => setTemplateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Notebook
          </Button>
        }
      >
        <div className="space-y-8">
          <Card className="flex flex-col items-center justify-center py-16">
            <BookOpen className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">
              Create your first notebook
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Where Explore is for quick questions, Notebooks are for building
              comprehensive research documents.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setTemplateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Notebook
            </Button>
          </Card>

          {/* Template grid in empty state */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#111827]">
              Start from a template
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => createMutation.mutate(tpl.id)}
                    disabled={createMutation.isPending}
                    className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 text-left transition-colors hover:border-[#4F46E5]/30 hover:bg-[#F9FAFB] disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
                      <Icon className="h-4 w-4 text-[#4F46E5]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111827]">
                        {tpl.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#6B7280]">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <TemplateSelector
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
          onSelect={(id) => createMutation.mutate(id)}
          loading={createMutation.isPending}
        />
      </Page>
    );
  }

  /* Populated state */
  return (
    <Page
      title="Notebooks"
      subtitle="Deep, structured analysis workspaces"
      actions={
        <Button size="sm" onClick={() => setTemplateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Notebook
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notebooks.map((nb) => (
          <Card
            key={nb.id}
            className="group cursor-pointer transition-colors hover:border-[#4F46E5]/30"
            onClick={() => navigate(`/notebooks/${nb.id}`)}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#111827] truncate">
                {nb.title}
              </p>
              <div className="flex items-center gap-1.5">
                {nb.published && (
                  <Badge variant="success">Published</Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(nb);
                  }}
                  className="hidden rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-red-500 group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                {nb.cellCount} cell{nb.cellCount !== 1 ? "s" : ""}
              </span>
              <span>
                Updated {format(new Date(nb.updatedAt), "MMM d, yyyy")}
              </span>
            </div>
          </Card>
        ))}

        {/* New notebook dashed card */}
        <button
          onClick={() => setTemplateOpen(true)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-[#6B7280] transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm font-medium">New Notebook</span>
        </button>
      </div>

      <TemplateSelector
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={(id) => createMutation.mutate(id)}
        loading={createMutation.isPending}
      />

      <DeleteConfirm
        open={deleteTarget !== null}
        notebookTitle={deleteTarget?.title ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        loading={deleteMutation.isPending}
      />
    </Page>
  );
}
