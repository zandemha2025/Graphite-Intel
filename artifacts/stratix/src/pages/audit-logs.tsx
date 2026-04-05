import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Database,
  ChevronDown
} from "lucide-react";

type AuditLog = {
  id: number;
  timestamp: string;
  userId: string;
  userName?: string;
  action: string;
  resourceType: "report" | "workflow" | "document" | "conversation" | "team" | "integration";
  resourceName: string;
  resourceId?: string;
  status: "success" | "error";
  errorMessage?: string;
  metadata?: Record<string, any>;
};

type FetchResponse = {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};

const RESOURCE_TYPES = ["report", "workflow", "document", "conversation", "team", "integration"];

function useFetchAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = async (
    limit: number,
    offset: number,
    userId?: string,
    resourceType?: string,
    action?: string,
    startDate?: string,
    endDate?: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (userId) params.append("userId", userId);
      if (resourceType) params.append("resourceType", resourceType);
      if (action) params.append("action", action);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/audit/logs?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to load audit logs");

      const data: FetchResponse = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setTotal(data?.pagination?.total ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  return { logs, total, loading, error, fetch: fetch_ };
}

export function AuditLogs() {
  const { logs, total, loading, error, fetch: fetchLogs } = useFetchAuditLogs();
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filter state
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userIdFilter, setUserIdFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch on mount and when filters change
  useEffect(() => {
    setOffset(0);
  }, [resourceFilter, actionFilter, userIdFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs(
      limit,
      offset,
      userIdFilter || undefined,
      resourceFilter || undefined,
      actionFilter || undefined,
      startDate || undefined,
      endDate || undefined
    );
  }, [limit, offset, userIdFilter, resourceFilter, actionFilter, startDate, endDate, fetchLogs]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePrevious = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNext = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div>
          <h1 className="font-serif text-5xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>
            Audit Log
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Track all system activities, changes, and user actions.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Resource Type Filter */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--workspace-muted)" }}>
            Resource Type
          </label>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
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

        {/* Action Filter */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--workspace-muted)" }}>
            Action
          </label>
          <input
            type="text"
            placeholder="e.g., create, update"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--workspace-border)",
              color: "var(--workspace-fg)",
            }}
          />
        </div>

        {/* User ID Filter */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--workspace-muted)" }}>
            User ID
          </label>
          <input
            type="text"
            placeholder="Filter by user"
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--workspace-border)",
              color: "var(--workspace-fg)",
            }}
          />
        </div>

        {/* Start Date Filter */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--workspace-muted)" }}>
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

        {/* End Date Filter */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--workspace-muted)" }}>
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

      {/* Loading State */}
      {loading && (
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
      )}

      {/* Error State */}
      {error && (
        <div className="py-8 px-4 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
          <Shield className="h-6 w-6 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            {error}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && logs.length === 0 && (
        <div className="py-16 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
          <Shield className="h-6 w-6 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
          <h3 className="font-serif text-xl font-light mb-2" style={{ color: "var(--workspace-muted)" }}>
            No audit logs found
          </h3>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Try adjusting your filters or date range.
          </p>
        </div>
      )}

      {/* Logs Table */}
      {!loading && !error && logs.length > 0 && (
        <>
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            {logs.map((log, i) => (
              <div key={log.id}>
                {/* Main Row */}
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full text-left px-5 py-4 transition-colors"
                  style={{
                    borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                    background: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    if (expandedId !== log.id) {
                      e.currentTarget.style.background = "var(--workspace-muted-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (expandedId !== log.id) {
                      e.currentTarget.style.background = "#FFFFFF";
                    }
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                    {/* Timestamp */}
                    <div className="flex items-start gap-2 min-w-0">
                      <Clock className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--workspace-muted)" }} />
                      <div className="min-w-0">
                        <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>
                          {format(new Date(log.timestamp), "MMM d, yyyy")}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                          {format(new Date(log.timestamp), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>

                    {/* User */}
                    <div className="flex items-start gap-2 min-w-0">
                      <User className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--workspace-muted)" }} />
                      <div className="min-w-0">
                        <p className="text-xs truncate" style={{ color: "var(--workspace-fg)" }}>
                          {log.userName || log.userId}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                          User
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>
                        {log.action}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                        Action
                      </p>
                    </div>

                    {/* Resource Type */}
                    <div>
                      <p className="text-xs capitalize" style={{ color: "var(--workspace-fg)" }}>
                        {log.resourceType}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                        Type
                      </p>
                    </div>

                    {/* Resource Name */}
                    <div>
                      <p className="text-xs truncate" style={{ color: "var(--workspace-fg)" }}>
                        {log.resourceName}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                        Resource
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 inline-block"
                          style={{
                            border: "1px solid var(--workspace-border)",
                            color: log.status === "success" ? "var(--workspace-muted)" : "#dc2626",
                          }}
                        >
                          {log.status}
                        </span>
                      </div>
                      <ChevronDown
                        className="h-4 w-4 transition-transform"
                        style={{
                          color: "var(--workspace-muted)",
                          transform: expandedId === log.id ? "rotate(180deg)" : "rotate(0)",
                        }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Row */}
                {expandedId === log.id && (
                  <div
                    className="px-5 py-4 border-t"
                    style={{
                      borderColor: "var(--workspace-border)",
                      background: "var(--workspace-muted-bg)",
                    }}
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--workspace-muted)" }}>
                          Details
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {log.resourceId && (
                            <div>
                              <p className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                                Resource ID
                              </p>
                              <p className="text-xs font-mono mt-1" style={{ color: "var(--workspace-fg)" }}>
                                {log.resourceId}
                              </p>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div>
                              <p className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                                Error
                              </p>
                              <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                                {log.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--workspace-muted)" }}>
                            Metadata
                          </p>
                          <div
                            className="p-3 text-[11px] font-mono overflow-x-auto"
                            style={{
                              background: "#FFFFFF",
                              border: "1px solid var(--workspace-border)",
                              color: "var(--workspace-fg)",
                            }}
                          >
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handlePrevious}
                disabled={offset === 0}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "#FFFFFF",
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="text-xs" style={{ color: "var(--workspace-muted)" }}>
                Page {currentPage} of {totalPages} ({total} total)
              </span>

              <button
                onClick={handleNext}
                disabled={offset + limit >= total}
                className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "#FFFFFF",
                }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
