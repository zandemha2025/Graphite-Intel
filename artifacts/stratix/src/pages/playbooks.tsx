import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Plus,
  Sparkles,
  CheckSquare,
  ClipboardList,
  Play,
  Clock,
  Tag,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataCard } from "@/components/ui/data-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

interface PlaybookItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  steps: unknown[];
  isTemplate: boolean;
  isPublished: boolean;
  version: number;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

const categoryLabels: Record<string, string> = {
  due_diligence: "Due Diligence",
  compliance: "Compliance",
  audit: "Audit",
  review: "Review",
  custom: "Custom",
};

export function Playbooks() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [playbooks, setPlaybooks] = useState<PlaybookItem[]>([]);
  const [templates, setTemplates] = useState<PlaybookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "templates">("mine");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [mineRes, templatesRes] = await Promise.all([
          fetch("/api/playbooks", { credentials: "include" }),
          fetch("/api/playbooks?isTemplate=true", { credentials: "include" }),
        ]);
        if (mineRes.ok) setPlaybooks(await mineRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());
      } catch {}
      setLoading(false);
    };
    fetch_();
  }, []);

  const handleCreateFromTemplate = async (templateId: number) => {
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: "New Playbook",
          fromTemplateId: templateId,
        }),
      });
      if (res.ok) {
        const playbook = await res.json();
        toast({ title: "Playbook created from template" });
        setLocation(`/playbooks/${playbook.id}`);
      }
    } catch {
      toast({ title: "Failed to create playbook", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/playbooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setPlaybooks((prev) => prev.filter((p) => p.id !== id));
        toast({ title: "Playbook deleted" });
      } else {
        toast({ title: "Failed to delete playbook", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to delete playbook", variant: "destructive" });
    }
    setDeleteConfirmId(null);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const myPlaybooks = playbooks.filter((p) => !p.isTemplate);

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader
        title="Playbooks"
        subtitle="Structured review workflows for documents and compliance"
        actions={
          <button
            onClick={() => setLocation("/playbooks/new")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-md hover:bg-[#1f2937] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Playbook
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E5E5E3]">
        {(["mine", "templates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs font-medium transition-colors -mb-px"
            style={{
              color: activeTab === tab ? "#111827" : "#9CA3AF",
              borderBottom: activeTab === tab ? "2px solid #111827" : "2px solid transparent",
            }}
          >
            {tab === "mine" ? `My Playbooks (${myPlaybooks.length})` : `Templates (${templates.length})`}
          </button>
        ))}
      </div>

      {/* My Playbooks */}
      {activeTab === "mine" && (
        <div>
          {myPlaybooks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No playbooks yet"
              description="Build structured review workflows for due diligence, compliance, and audits. Start from a template or create your own."
              action={{ label: "Browse Templates", onClick: () => setActiveTab("templates") }}
              secondaryAction={{ label: "Create Blank", onClick: () => setLocation("/playbooks/new") }}
            />
          ) : (
            <div className="grid gap-3">
              {myPlaybooks.map((pb) => (
                <DataCard key={pb.id} hover onClick={() => setLocation(`/playbooks/${pb.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-[#111827]">{pb.name}</h3>
                        {pb.category && (
                          <span className="text-[11px] font-medium px-1.5 py-0.5 border border-[#E5E5E3] text-[#9CA3AF] rounded">
                            {categoryLabels[pb.category] ?? pb.category}
                          </span>
                        )}
                        <StatusBadge status={pb.isPublished ? "published" : "draft"} />
                      </div>
                      {pb.description && <p className="text-xs text-[#9CA3AF] mb-2">{pb.description}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
                        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{pb.steps?.length ?? 0} steps</span>
                        <span>v{pb.version}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(pb.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {deleteConfirmId === pb.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(pb.id)}
                            className="px-2 py-1 text-xs font-medium border border-red-400 text-red-500 bg-white rounded"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs font-medium border border-[#E5E5E3] text-[#9CA3AF] bg-white rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(pb.id); }}
                          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete playbook"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[#9CA3AF]" />
                        </button>
                      )}
                      <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                    </div>
                  </div>
                </DataCard>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid gap-3">
          {templates.map((tpl) => (
            <DataCard key={tpl.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-[#111827]">{tpl.name}</h3>
                    {tpl.category && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-[#E5E5E3] text-[#9CA3AF] rounded">
                        {categoryLabels[tpl.category] ?? tpl.category}
                      </span>
                    )}
                  </div>
                  {tpl.description && <p className="text-xs text-[#9CA3AF] mb-2">{tpl.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF]">
                    <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{tpl.steps?.length ?? 0} steps</span>
                    {tpl.tags?.map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1"><Tag className="h-3 w-3" />{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleCreateFromTemplate(tpl.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E5E5E3] text-[#6B7280] bg-white rounded-md hover:border-[#D1D0CE] transition-colors shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Use
                </button>
              </div>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
}
