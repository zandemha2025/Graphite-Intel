import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Share2,
  FileText,
  BarChart3,
  FolderOpen,
  Workflow,
  Clock,
  Eye,
  Edit3,
  MessageSquare,
  BookOpen,
  LayoutDashboard,
  ArrowUpDown,
  Users,
} from "lucide-react";

interface SharedResource {
  id: number;
  resourceType: string;
  resourceId: number;
  sharedByUserId: string;
  sharedWithUserId: string | null;
  sharedWithEmail: string | null;
  permission: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  resourceTitle?: string;
}

type ViewMode = "shared-with-me" | "shared-by-me";
type SortField = "date" | "type";
type SortDir = "asc" | "desc";

const RESOURCE_TYPES = ["report", "workflow", "document", "playbook", "board", "conversation", "vault_project"] as const;

const resourceIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  report: <BarChart3 className="h-4 w-4" />,
  vault_project: <FolderOpen className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
  playbook: <BookOpen className="h-4 w-4" />,
  board: <LayoutDashboard className="h-4 w-4" />,
  conversation: <MessageSquare className="h-4 w-4" />,
};

const permissionIcons: Record<string, React.ReactNode> = {
  read: <Eye className="h-3 w-3" />,
  view: <Eye className="h-3 w-3" />,
  edit: <Edit3 className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
};

const resourceRoutes: Record<string, (id: number) => string> = {
  document: () => `/knowledge`,
  report: (id) => `/reports/${id}`,
  vault_project: (id) => `/vault/${id}`,
  workflow: (id) => `/workflows/${id}`,
  playbook: () => `/playbooks`,
  board: (id) => `/boards/${id}`,
  conversation: () => `/chat`,
};

export function SharedWithMe() {
  const [shares, setShares] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // View mode: shared-with-me vs shared-by-me
  const [viewMode, setViewMode] = useState<ViewMode>("shared-with-me");

  // Filter and sort state
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const fetchShares = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint =
          viewMode === "shared-with-me"
            ? "/api/sharing/shared-with-me"
            : "/api/sharing/shared-by-me";
        const res = await fetch(endpoint, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load shared resources");
        const data = await res.json();
        setShares(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setShares([]);
      }
      setLoading(false);
    };
    fetchShares();
  }, [viewMode]);

  const navigateToResource = (type: string, id: number) => {
    const routeFn = resourceRoutes[type];
    if (routeFn) {
      setLocation(routeFn(id));
    } else {
      setLocation("/dashboard");
    }
  };

  // Apply filters and sorting
  const filteredShares = shares
    .filter((s) => !resourceTypeFilter || s.resourceType === resourceTypeFilter)
    .sort((a, b) => {
      if (sortField === "date") {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "desc" ? -diff : diff;
      }
      if (sortField === "type") {
        const cmp = a.resourceType.localeCompare(b.resourceType);
        return sortDir === "desc" ? -cmp : cmp;
      }
      return 0;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2" style={{ color: "var(--workspace-fg)" }}>
            Shared Items
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Resources shared with you and by you
          </p>
        </div>
      </div>

      {/* View Mode Toggle + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Tab toggle */}
        <div className="flex" style={{ border: "1px solid var(--workspace-border)" }}>
          <button
            onClick={() => setViewMode("shared-with-me")}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              background: viewMode === "shared-with-me" ? "var(--workspace-fg)" : "#FFFFFF",
              color: viewMode === "shared-with-me" ? "#FFFFFF" : "var(--workspace-muted)",
            }}
          >
            Shared With Me
          </button>
          <button
            onClick={() => setViewMode("shared-by-me")}
            className="px-4 py-2 text-xs font-medium transition-colors"
            style={{
              background: viewMode === "shared-by-me" ? "var(--workspace-fg)" : "#FFFFFF",
              color: viewMode === "shared-by-me" ? "#FFFFFF" : "var(--workspace-muted)",
              borderLeft: "1px solid var(--workspace-border)",
            }}
          >
            Shared By Me
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Resource Type Filter */}
          <select
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs focus:outline-none transition-colors"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--workspace-border)",
              color: "var(--workspace-fg)",
            }}
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ").charAt(0).toUpperCase() + type.replace(/_/g, " ").slice(1)}
              </option>
            ))}
          </select>

          {/* Sort toggle */}
          <button
            onClick={() => toggleSort("date")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              border: "1px solid var(--workspace-border)",
              color: sortField === "date" ? "var(--workspace-fg)" : "var(--workspace-muted)",
              background: "#FFFFFF",
            }}
          >
            <ArrowUpDown className="h-3 w-3" />
            Date {sortField === "date" ? (sortDir === "desc" ? "New" : "Old") : ""}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse"
              style={{
                border: "1px solid var(--workspace-border)",
                background: "var(--workspace-muted-bg)",
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="py-8 px-4 text-center border-dashed"
          style={{ border: "1px dashed var(--workspace-border)" }}
        >
          <Share2 className="h-6 w-6 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredShares.length === 0 && (
        <div
          className="py-16 text-center border-dashed"
          style={{ border: "1px dashed var(--workspace-border)" }}
        >
          <Share2 className="h-6 w-6 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
          <h3
            className="font-sans text-xl font-light mb-2"
            style={{ color: "var(--workspace-muted)" }}
          >
            {viewMode === "shared-with-me"
              ? "Nothing shared with you yet"
              : "You haven't shared anything yet"}
          </h3>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            {viewMode === "shared-with-me"
              ? "When team members share resources with you, they'll appear here."
              : "Share reports, workflows, or documents with your team to see them here."}
          </p>
        </div>
      )}

      {/* Shares List */}
      {!loading && !error && filteredShares.length > 0 && (
        <div style={{ border: "1px solid var(--workspace-border)" }}>
          <div
            className="px-5 py-3"
            style={{
              background: "var(--workspace-muted-bg)",
              borderBottom: "1px solid var(--workspace-border)",
            }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: "var(--workspace-muted)" }}
            >
              {filteredShares.length} Shared{" "}
              {filteredShares.length === 1 ? "Resource" : "Resources"}
            </span>
          </div>

          {filteredShares.map((share, i) => (
            <div
              key={share.id}
              className="px-5 py-4 cursor-pointer transition-colors"
              style={{
                background: "#FFFFFF",
                borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
              }}
              onClick={() => navigateToResource(share.resourceType, share.resourceId)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--workspace-muted-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
              }}
            >
              <div className="flex items-center gap-4">
                {/* Resource type icon */}
                <div
                  className="shrink-0 w-9 h-9 flex items-center justify-center"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: "var(--workspace-muted)",
                  }}
                >
                  {resourceIcons[share.resourceType] ?? <FileText className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--workspace-fg)" }}
                    >
                      {share.resourceTitle ??
                        `${share.resourceType.replace(/_/g, " ")} #${share.resourceId}`}
                    </span>
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 shrink-0"
                      style={{
                        border: "1px solid var(--workspace-border)",
                        color: "var(--workspace-muted)",
                      }}
                    >
                      {share.resourceType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-4 text-[10px] flex-wrap"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    {/* Shared by / shared with */}
                    {viewMode === "shared-with-me" ? (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        From: {share.sharedByUserId}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        To: {share.sharedWithUserId ?? share.sharedWithEmail ?? "Unknown"}
                      </span>
                    )}

                    {/* Permission badge */}
                    <span className="flex items-center gap-1">
                      {permissionIcons[share.permission] ?? <Eye className="h-3 w-3" />}
                      {share.permission}
                    </span>

                    {/* Date */}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                    </span>

                    {/* Expiry */}
                    {share.expiresAt && (
                      <span style={{ color: "#d97706" }}>
                        Expires{" "}
                        {formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}
                      </span>
                    )}
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
