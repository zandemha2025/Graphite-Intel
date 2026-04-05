import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  FileText,
  BarChart3,
  Share2,
  MessageSquare,
  Plus,
  Clock,
  Trash2,
  Download,
  Zap,
  BookOpen,
  Workflow,
  LayoutDashboard,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: number;
  resourceTitle: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_TYPES = ["created", "updated", "deleted", "shared", "exported", "generated"] as const;
const RESOURCE_TYPES = ["report", "workflow", "document", "playbook", "board", "conversation"] as const;

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="h-3.5 w-3.5" />,
  updated: <FileText className="h-3.5 w-3.5" />,
  deleted: <Trash2 className="h-3.5 w-3.5" />,
  shared: <Share2 className="h-3.5 w-3.5" />,
  exported: <Download className="h-3.5 w-3.5" />,
  generated: <Zap className="h-3.5 w-3.5" />,
  commented: <MessageSquare className="h-3.5 w-3.5" />,
};

const actionColors: Record<string, string> = {
  created: "#16a34a",
  updated: "var(--workspace-fg)",
  deleted: "#dc2626",
  shared: "#2563eb",
  exported: "#7c3aed",
  generated: "#d97706",
};

const resourceIcons: Record<string, React.ReactNode> = {
  report: <BarChart3 className="h-3.5 w-3.5" />,
  workflow: <Workflow className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  playbook: <BookOpen className="h-3.5 w-3.5" />,
  board: <LayoutDashboard className="h-3.5 w-3.5" />,
  conversation: <MessageSquare className="h-3.5 w-3.5" />,
};

const resourceRoutes: Record<string, (id: number) => string> = {
  report: (id) => `/reports/${id}`,
  workflow: (id) => `/workflows/${id}`,
  document: () => `/knowledge`,
  playbook: (id) => `/playbooks`,
  board: (id) => `/boards/${id}`,
  conversation: (id) => `/chat`,
};

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [, setLocation] = useLocation();
  const limit = 30;

  // Filter state
  const [actionFilter, setActionFilter] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivity = useCallback(
    async (newOffset = 0, append = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("limit", limit.toString());
        params.append("offset", newOffset.toString());
        if (actionFilter) params.append("action", actionFilter);
        if (resourceTypeFilter) params.append("resourceType", resourceTypeFilter);
        if (userFilter) params.append("userId", userFilter);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const res = await fetch(`/api/activity?${params.toString()}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setItems(append ? (prev) => [...prev, ...data.items] : data.items);
          setTotal(data.total);
          setOffset(newOffset);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    },
    [actionFilter, resourceTypeFilter, userFilter, startDate, endDate],
  );

  // Re-fetch when filters change
  useEffect(() => {
    setItems([]);
    setOffset(0);
    fetchActivity(0);
  }, [fetchActivity]);

  const handleLoadMore = () => {
    fetchActivity(offset + limit, true);
  };

  const navigateToResource = (type: string, id: number) => {
    const routeFn = resourceRoutes[type];
    if (routeFn) {
      setLocation(routeFn(id));
    }
  };

  const hasActiveFilters = actionFilter || resourceTypeFilter || userFilter || startDate || endDate;

  const clearFilters = () => {
    setActionFilter("");
    setResourceTypeFilter("");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-5xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>
              Activity
            </h1>
            <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
              Recent activity across your workspace
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest transition-colors"
            style={{
              border: "1px solid var(--workspace-border)",
              color: hasActiveFilters ? "var(--workspace-fg)" : "var(--workspace-muted)",
              background: "#FFFFFF",
            }}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--workspace-fg)" }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="space-y-3 p-5" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Action Type Filter */}
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] block mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Action
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type Filter */}
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] block mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Resource Type
              </label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              >
                <option value="">All Types</option>
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] block mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                User
              </label>
              <input
                type="text"
                placeholder="Filter by user"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] block mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label
                className="text-[10px] uppercase tracking-[0.2em] block mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-2">
              <button
                onClick={clearFilters}
                className="text-[10px] uppercase tracking-widest transition-colors"
                style={{ color: "var(--workspace-muted)" }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State (initial) */}
      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
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
      ) : items.length === 0 ? (
        /* Empty State */
        <div
          className="py-16 text-center border-dashed"
          style={{ border: "1px dashed var(--workspace-border)" }}
        >
          <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--workspace-muted-bg)", border: "1px solid var(--workspace-border)" }}>
            <Activity className="h-6 w-6" style={{ color: "var(--workspace-muted)" }} />
          </div>
          <h3
            className="font-serif text-xl font-light mb-2"
            style={{ color: "var(--workspace-fg)" }}
          >
            {hasActiveFilters ? "No matching activity" : "No activity yet"}
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--workspace-muted)" }}>
            {hasActiveFilters
              ? "Try adjusting your filters to see more results."
              : "Activity will show up here as your team creates reports, runs workflows, uploads documents, and collaborates across Stratix."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-xs uppercase tracking-widest transition-colors"
              style={{ color: "var(--workspace-fg)", borderBottom: "1px solid var(--workspace-border)" }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        /* Activity Timeline */
        <div>
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            <div
              className="px-5 py-3"
              style={{
                background: "var(--workspace-muted-bg)",
                borderBottom: "1px solid var(--workspace-border)",
              }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "var(--workspace-muted)" }}
              >
                {total} {total === 1 ? "Event" : "Events"}
              </span>
            </div>

            {items.map((item, i) => (
              <div
                key={item.id}
                className="flex items-start gap-4 px-5 py-4 transition-colors"
                style={{
                  borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                  background: "#FFFFFF",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--workspace-muted-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
                }}
              >
                {/* Action icon with color accent */}
                <div
                  className="mt-0.5 shrink-0 w-7 h-7 flex items-center justify-center"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: actionColors[item.action] ?? "var(--workspace-muted)",
                  }}
                >
                  {actionIcons[item.action] ?? <Activity className="h-3.5 w-3.5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--workspace-fg)" }}>
                    <span className="font-medium">{item.userId}</span>{" "}
                    <span
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 mx-1"
                      style={{
                        border: "1px solid var(--workspace-border)",
                        color: actionColors[item.action] ?? "var(--workspace-muted)",
                      }}
                    >
                      {item.action}
                    </span>{" "}
                    {item.resourceTitle ? (
                      <button
                        onClick={() => navigateToResource(item.resourceType, item.resourceId)}
                        className="font-medium transition-colors"
                        style={{
                          color: "var(--workspace-fg)",
                          borderBottom: "1px solid var(--workspace-border)",
                        }}
                      >
                        {item.resourceTitle}
                      </button>
                    ) : (
                      <span style={{ color: "var(--workspace-muted)" }}>
                        {item.resourceType.replace(/_/g, " ")} #{item.resourceId}
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5">
                    {/* Resource type badge */}
                    <span
                      className="flex items-center gap-1 text-[10px] uppercase tracking-wide"
                      style={{ color: "var(--workspace-muted)" }}
                    >
                      {resourceIcons[item.resourceType] ?? <FileText className="h-3 w-3" />}
                      {item.resourceType.replace(/_/g, " ")}
                    </span>

                    {/* Timestamp */}
                    <span
                      className="flex items-center gap-1 text-[10px]"
                      style={{ color: "var(--workspace-muted)" }}
                    >
                      <Clock className="h-3 w-3" />
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {items.length < total && (
            <div className="mt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-4 py-2 text-xs uppercase tracking-widest transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-muted)",
                  background: "#FFFFFF",
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 border-t animate-spin"
                      style={{
                        border: "1px solid var(--workspace-border)",
                        borderTopColor: "var(--workspace-fg)",
                        borderRadius: 0,
                      }}
                    />
                    Loading...
                  </span>
                ) : (
                  `Load More (${items.length} of ${total})`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
