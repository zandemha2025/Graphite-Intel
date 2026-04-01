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
} from "lucide-react";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>Playbooks</h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Structured review workflows for documents and compliance</p>
        </div>
        <button
          onClick={() => setLocation("/playbooks/new")}
          className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest"
          style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
        >
          <Plus className="h-3 w-3" />
          New Playbook
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: "1px solid var(--workspace-border)" }}>
        {(["mine", "templates"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs uppercase tracking-widest transition-colors"
            style={{
              color: activeTab === tab ? "var(--workspace-fg)" : "var(--workspace-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--workspace-fg)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab === "mine" ? `My Playbooks (${playbooks.filter((p) => !p.isTemplate).length})` : `Templates (${templates.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "mine" && (
        <div>
          {playbooks.filter((p) => !p.isTemplate).length === 0 ? (
            <div className="p-8 text-center border border-dashed" style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}>
              <BookOpen className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
              <p className="text-sm mb-1" style={{ color: "var(--workspace-fg)" }}>No playbooks yet</p>
              <p className="text-xs mb-4" style={{ color: "var(--workspace-muted)" }}>Create a playbook from scratch or use a template</p>
              <button
                onClick={() => setActiveTab("templates")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest mx-auto"
                style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
              >
                <ClipboardList className="h-3 w-3" />
                Browse Templates
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {playbooks.filter((p) => !p.isTemplate).map((pb) => (
                <div
                  key={pb.id}
                  className="px-5 py-4 border cursor-pointer transition-colors"
                  style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}
                  onClick={() => setLocation(`/playbooks/${pb.id}`)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-fg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-border)"; }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>{pb.name}</h3>
                        {pb.category && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
                            {categoryLabels[pb.category] ?? pb.category}
                          </span>
                        )}
                        {!pb.isPublished && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-muted)" }}>Draft</span>
                        )}
                      </div>
                      {pb.description && <p className="text-xs mb-2" style={{ color: "var(--workspace-muted)" }}>{pb.description}</p>}
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{pb.steps?.length ?? 0} steps</span>
                        <span>v{pb.version}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(pb.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 mt-1" style={{ color: "var(--workspace-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid gap-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="px-5 py-4 border"
              style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>{tpl.name}</h3>
                    {tpl.category && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
                        {categoryLabels[tpl.category] ?? tpl.category}
                      </span>
                    )}
                  </div>
                  {tpl.description && <p className="text-xs mb-2" style={{ color: "var(--workspace-muted)" }}>{tpl.description}</p>}
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                    <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{tpl.steps?.length ?? 0} steps</span>
                    {tpl.tags?.map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1"><Tag className="h-3 w-3" />{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCreateFromTemplate(tpl.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest"
                    style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                  >
                    <Plus className="h-3 w-3" />
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
