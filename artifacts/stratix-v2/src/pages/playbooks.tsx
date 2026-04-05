import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api, apiPost, apiDelete } from "@/lib/api";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ListChecks,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";

interface Playbook {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: unknown[];
  version?: number;
  isTemplate?: boolean;
  status?: string;
  tags?: string[];
}

const CATEGORY_VARIANT: Record<string, "default" | "success" | "warning" | "info" | "error"> = {
  compliance: "warning",
  security: "error",
  onboarding: "success",
  audit: "info",
};

export default function PlaybooksPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"mine" | "templates">("mine");
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [templates, setTemplates] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Playbook[]>("/playbooks"),
      api<Playbook[]>("/playbooks?isTemplate=true"),
    ]).then(([mine, tmpl]) => {
      setPlaybooks(mine);
      setTemplates(tmpl);
    }).finally(() => setLoading(false));
  }, []);

  async function handleNew() {
    setCreating(true);
    try {
      const pb = await apiPost<Playbook>("/playbooks", { name: "Untitled Playbook" });
      navigate(`/playbooks/${pb.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateFromTemplate(templateId: string) {
    setCreating(true);
    try {
      const pb = await apiPost<Playbook>("/playbooks", { name: "From Template", fromTemplateId: templateId });
      navigate(`/playbooks/${pb.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this playbook? This action cannot be undone.")) return;
    setDeleting(id);
    try {
      await apiDelete(`/playbooks/${id}`);
      setPlaybooks((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const items = tab === "mine" ? playbooks : templates;

  return (
    <Page
      title="Playbooks"
      subtitle="Structured step-by-step procedures for repeatable processes"
      actions={
        <Button onClick={handleNew} loading={creating}>
          <Plus className="h-4 w-4" />
          New Playbook
        </Button>
      }
    >
      <div className="flex gap-1 border-b border-[#E5E5E3] mb-6">
        {(["mine", "templates"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-[#0A0A0A] text-[#0A0A0A]"
                : "border-transparent text-[#9CA3AF] hover:text-[#404040]"
            }`}
          >
            {t === "mine" ? "My Playbooks" : "Templates"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9CA3AF]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-[#9CA3AF]">
          <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {tab === "mine"
              ? "No playbooks yet. Create one to get started."
              : "No templates available."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((pb) => (
            <Card
              key={pb.id}
              hoverable
              clickable
              onClick={() => tab === "mine" ? navigate(`/playbooks/${pb.id}`) : undefined}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-[#0A0A0A] line-clamp-1">{pb.name}</h3>
                {pb.category && (
                  <Badge variant={CATEGORY_VARIANT[pb.category] ?? "default"}>
                    {pb.category}
                  </Badge>
                )}
              </div>
              {pb.description && (
                <p className="text-xs text-[#9CA3AF] line-clamp-2">{pb.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
                <span>{pb.steps?.length ?? 0} steps</span>
                {pb.version != null && <span>v{pb.version}</span>}
                {pb.status && (
                  <Badge variant={pb.status === "active" ? "success" : "default"} className="text-[10px]">
                    {pb.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#F3F3F1]">
                {tab === "templates" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCreateFromTemplate(pb.id)}
                    disabled={creating}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Use Template
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); navigate(`/playbooks/${pb.id}`); }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleDelete(pb.id); }}
                      loading={deleting === pb.id}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
