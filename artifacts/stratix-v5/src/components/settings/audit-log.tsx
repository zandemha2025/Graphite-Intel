import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  LogIn,
  Share2,
  Rocket,
  Trash2,
  Edit,
  Plus,
  Eye,
  ChevronDown,
  Loader2,
  Clock,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---- Types ---- */

type AuditAction = "query" | "create" | "update" | "delete" | "login" | "export" | "share" | "deploy";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceTitle?: string;
  details?: string;
  aiModel?: string;
  timestamp: string;
  ip?: string;
}

/* ---- Action Config ---- */

const ACTION_CONFIG: Record<AuditAction, { icon: typeof Search; verb: string; color: string }> = {
  query:  { icon: Search,  verb: "queried",  color: "text-[var(--accent)]" },
  create: { icon: Plus,    verb: "created",  color: "text-[var(--success)]" },
  update: { icon: Edit,    verb: "updated",  color: "text-[#D4A03C]" },
  delete: { icon: Trash2,  verb: "deleted",  color: "text-[var(--error)]" },
  login:  { icon: LogIn,   verb: "signed in", color: "text-[var(--text-secondary)]" },
  export: { icon: Download, verb: "exported", color: "text-[#5B7F3B]" },
  share:  { icon: Share2,  verb: "shared",   color: "text-[var(--accent)]" },
  deploy: { icon: Rocket,  verb: "deployed", color: "text-[#9B59B6]" },
};

const ALL_ACTIONS: AuditAction[] = ["query", "create", "update", "delete", "login", "export", "share", "deploy"];

/* ---- Helpers ---- */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return diffMins + "m ago";
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + "h ago";
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return diffDays + "d ago";

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFullTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ---- Mock data for demo ---- */

function generateMockEntries(): AuditEntry[] {
  const entries: AuditEntry[] = [
    {
      id: "1", userId: "u1", userName: "Nazeem Ahmed", action: "query",
      resource: "conversation", resourceTitle: "Competitive analysis for Q2",
      details: "Queried: competitive analysis for Q2 positioning strategy",
      aiModel: "claude-3.5-sonnet", timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "2", userId: "u1", userName: "Nazeem Ahmed", action: "create",
      resource: "notebook", resourceId: "nb-42", resourceTitle: "Market Entry Framework",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "3", userId: "u2", userName: "Sarah Chen", action: "update",
      resource: "board", resourceId: "bd-7", resourceTitle: "Q2 Campaign Dashboard",
      details: "Updated 3 cards and repositioned the KPI section",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "4", userId: "u1", userName: "Nazeem Ahmed", action: "deploy",
      resource: "workflow", resourceId: "wf-12", resourceTitle: "Weekly Intelligence Digest",
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: "5", userId: "u3", userName: "James Park", action: "login",
      resource: "session", timestamp: new Date(Date.now() - 28800000).toISOString(),
      ip: "192.168.1.42",
    },
    {
      id: "6", userId: "u2", userName: "Sarah Chen", action: "share",
      resource: "notebook", resourceId: "nb-38", resourceTitle: "Competitor SWOT Analysis",
      details: "Shared with 3 team members",
      timestamp: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: "7", userId: "u1", userName: "Nazeem Ahmed", action: "export",
      resource: "board", resourceId: "bd-5", resourceTitle: "Executive Summary Board",
      details: "Exported as PDF",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "8", userId: "u3", userName: "James Park", action: "delete",
      resource: "conversation", resourceId: "cv-99", resourceTitle: "Draft brainstorm session",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "9", userId: "u2", userName: "Sarah Chen", action: "query",
      resource: "conversation", resourceTitle: "Brand perception analysis",
      details: "Queried: How is our brand perceived vs. Competitor X in enterprise segment?",
      aiModel: "claude-3.5-sonnet", timestamp: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: "10", userId: "u1", userName: "Nazeem Ahmed", action: "create",
      resource: "workflow", resourceId: "wf-15", resourceTitle: "Social Listening Pipeline",
      timestamp: new Date(Date.now() - 345600000).toISOString(),
    },
  ];
  return entries;
}

/* ---- Audit Entry Row ---- */

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[entry.action];
  const Icon = config.icon;

  const description =
    entry.action === "login"
      ? config.verb
      : `${config.verb} ${entry.resource}${entry.resourceTitle ? ': "' + entry.resourceTitle + '"' : ""}`;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-3 h-5 w-5 rounded-full border-2 border-[var(--surface)] bg-[var(--background)] flex items-center justify-center`}>
        <Icon className={`h-2.5 w-2.5 ${config.color}`} />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 rounded-[var(--radius-md)] hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-7 w-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-semibold text-[var(--accent)]">
              {getInitials(entry.userName)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-body-sm text-[var(--text-primary)]">
              <span className="font-medium">{entry.userName}</span>{" "}
              <span className="text-[var(--text-secondary)]">{description}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="h-3 w-3 text-[var(--text-muted)]" />
              <span className="text-caption text-[var(--text-muted)]">{formatTimestamp(entry.timestamp)}</span>
            </div>
          </div>

          {/* Expand indicator */}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 mt-1 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 ml-10 p-3 rounded-[var(--radius-md)] bg-[var(--background)] border border-[var(--border)] text-caption space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] w-20">Time</span>
              <span className="text-[var(--text-primary)]">{formatFullTimestamp(entry.timestamp)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] w-20">Action</span>
              <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${config.color} bg-current/10`}>
                {entry.action}
              </span>
            </div>
            {entry.resource && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] w-20">Resource</span>
                <span className="text-[var(--text-primary)]">{entry.resource}{entry.resourceId ? ` (${entry.resourceId})` : ""}</span>
              </div>
            )}
            {entry.details && (
              <div className="flex items-start gap-2">
                <span className="text-[var(--text-muted)] w-20 shrink-0">Details</span>
                <span className="text-[var(--text-primary)]">{entry.details}</span>
              </div>
            )}
            {entry.aiModel && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] w-20">AI Model</span>
                <span className="text-[var(--text-primary)] font-mono text-[11px]">{entry.aiModel}</span>
              </div>
            )}
            {entry.ip && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] w-20">IP Address</span>
                <span className="text-[var(--text-primary)] font-mono text-[11px]">{entry.ip}</span>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

/* ---- Main Audit Log ---- */

export function AuditLog() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEntries = useCallback(async (offset = 0) => {
    try {
      const res = await fetch(`/api/audit/log?limit=50&offset=${offset}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const items: AuditEntry[] = Array.isArray(data) ? data : data.entries || [];
        if (offset === 0) {
          setEntries(items);
        } else {
          setEntries((prev) => [...prev, ...items]);
        }
        setHasMore(items.length >= 50);
        return;
      }
    } catch {
      // API not available, use mock data
    }
    // Fallback to mock data
    if (offset === 0) {
      setEntries(generateMockEntries());
      setHasMore(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchEntries(0);
      setLoading(false);
    })();
  }, [fetchEntries]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchEntries(entries.length);
    setLoadingMore(false);
  };

  const handleExport = () => {
    const headers = ["Timestamp", "User", "Action", "Resource", "Title", "Details", "AI Model", "IP"];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.userName,
      e.action,
      e.resource,
      e.resourceTitle || "",
      e.details || "",
      e.aiModel || "",
      e.ip || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => '"' + (c || "").replace(/"/g, '""') + '"').join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Audit log exported" });
  };

  // Get unique users for the filter
  const uniqueUsers = Array.from(new Map(entries.map((e) => [e.userId, { id: e.userId, name: e.userName }])).values());

  // Apply filters
  const filtered = entries.filter((e) => {
    if (actionFilter && e.action !== actionFilter) return false;
    if (userFilter && e.userId !== userFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (e.resourceTitle || "").toLowerCase().includes(s) ||
        (e.details || "").toLowerCase().includes(s) ||
        e.userName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Activity Log</h3>
          <p className="text-caption text-[var(--text-muted)]">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />

          {/* User dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-caption font-medium border transition-colors ${
                userFilter
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              {userFilter ? uniqueUsers.find((u) => u.id === userFilter)?.name : "All users"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showUserDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 w-48 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setUserFilter(null); setShowUserDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    All users
                  </button>
                  {uniqueUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setUserFilter(u.id); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action pills */}
          {ALL_ACTIONS.map((action) => {
            const active = actionFilter === action;
            return (
              <button
                key={action}
                onClick={() => setActionFilter(active ? null : action)}
                className={`px-2.5 py-1.5 rounded-full text-caption font-medium border transition-colors capitalize ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                {action}
              </button>
            );
          })}

          {/* Clear filters */}
          {(actionFilter || userFilter || search) && (
            <button
              onClick={() => { setActionFilter(null); setUserFilter(null); setSearch(""); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-caption font-medium text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[var(--border)]" />

        <div className="space-y-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Eye className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-body-sm text-[var(--text-secondary)]">No activity found</p>
              <p className="text-caption text-[var(--text-muted)] mt-1">
                {search || actionFilter || userFilter
                  ? "Try adjusting your filters."
                  : "Activity will appear here as your team uses the platform."}
              </p>
            </div>
          ) : (
            filtered.map((entry) => <AuditEntryRow key={entry.id} entry={entry} />)
          )}
        </div>
      </div>

      {/* Load More */}
      {hasMore && filtered.length > 0 && (
        <div className="text-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-1.5 mx-auto px-5 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-40"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
