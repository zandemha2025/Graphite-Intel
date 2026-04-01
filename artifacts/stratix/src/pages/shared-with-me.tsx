import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Share2, FileText, BarChart3, FolderOpen, Workflow, Clock, Eye, Edit3, MessageSquare } from "lucide-react";

interface SharedResource {
  id: number;
  resourceType: string;
  resourceId: number;
  sharedByUserId: string;
  permission: string;
  createdAt: string;
  resourceTitle?: string;
}

const resourceIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  report: <BarChart3 className="h-4 w-4" />,
  vault_project: <FolderOpen className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
};

const permissionIcons: Record<string, React.ReactNode> = {
  read: <Eye className="h-3 w-3" />,
  edit: <Edit3 className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
};

export function SharedWithMe() {
  const [shares, setShares] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const fetchShares = async () => {
      try {
        const res = await fetch("/api/sharing/shared-with-me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setShares(data);
        }
      } catch {}
      setLoading(false);
    };
    fetchShares();
  }, []);

  const navigateToResource = (type: string, id: number) => {
    const routes: Record<string, string> = {
      document: `/knowledge`,
      report: `/reports/${id}`,
      vault_project: `/vault/${id}`,
      workflow: `/workflows/${id}`,
    };
    setLocation(routes[type] ?? "/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>Shared With Me</h1>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Resources shared with you by team members</p>
      </div>

      {shares.length === 0 ? (
        <div className="p-8 text-center border border-dashed" style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}>
          <Share2 className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--workspace-fg)" }}>Nothing shared with you yet</p>
          <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>When team members share resources with you, they'll appear here</p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--workspace-border)" }}>
          <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>{shares.length} Shared Resources</span>
          </div>
          {shares.map((share, i) => (
            <div
              key={share.id}
              className="px-5 py-4 cursor-pointer transition-colors"
              style={{ background: "#FFFFFF", borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined }}
              onClick={() => navigateToResource(share.resourceType, share.resourceId)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--workspace-muted-bg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; }}
            >
              <div className="flex items-center gap-3">
                <div style={{ color: "var(--workspace-muted)" }}>{resourceIcons[share.resourceType] ?? <FileText className="h-4 w-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>
                      {share.resourceType.replace("_", " ")} #{share.resourceId}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
                      {permissionIcons[share.permission]}
                      {share.permission}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                    <span>From: {share.sharedByUserId}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(share.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
