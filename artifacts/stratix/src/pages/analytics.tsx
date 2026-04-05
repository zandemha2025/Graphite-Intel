import { useQuery } from "@tanstack/react-query";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import type { AuthUserWithOrg } from "@/lib/types";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Zap,
  MessageSquareText,
  Activity,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryData {
  totalReports: number;
  totalWorkflows: number;
  totalDocuments: number;
  totalConversations: number;
  totalUsers: number;
  costThisMonth: number;
}

interface UsageByUser {
  userId: string;
  userName: string;
  reportsCount: number;
  conversationsCount: number;
  workflowsCount: number;
  documentsCount: number;
}

interface UsageByFeature {
  feature: string;
  data: Array<{ timestamp: string; count: number }>;
}

interface CostTrackingResponse {
  totalTokens: number;
  totalCost: number;
  costByFeature: Array<{ feature: string; cost: number; tokens: number }>;
  costTrend: Array<{ date: string; cost: number }>;
}

interface UsageOverTimePoint {
  date: string;
  count: number;
}

interface RecentEvent {
  id: number;
  eventType: string;
  feature: string | null;
  resourceType: string | null;
  resourceId: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  dollarsCost: number | null;
  timestamp: string;
  userId: string | null;
  userName: string | null;
}

// ---------------------------------------------------------------------------
// API fetchers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatCurrency = (val: number | string | null | undefined) => {
  const num = Number(val) || 0;
  return `$${num.toFixed(2)}`;
};

const formatNumber = (val: number | string | null | undefined) => {
  const num = Number(val) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatTokens = (val: number | string | null | undefined) => {
  const num = Number(val) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatShortDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
};

const formatEventType = (type: string) => {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="px-5 py-4"
      style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "var(--workspace-muted)" }}
          >
            {label}
          </p>
          <p
            className="font-serif text-3xl font-light"
            style={{ color: "var(--workspace-fg)" }}
          >
            {value}
          </p>
        </div>
        <Icon
          className="h-5 w-5 mt-1"
          style={{ color: "var(--workspace-muted)" }}
        />
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="px-5 py-4"
      style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
    >
      <div className="mb-6">
        <p
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: "var(--workspace-muted)" }}
        >
          {title}
        </p>
        <h3
          className="text-sm font-medium mt-1"
          style={{ color: "var(--workspace-fg)" }}
        >
          {subtitle}
        </h3>
      </div>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse"
            style={{
              background: "var(--workspace-muted-bg)",
              border: "1px solid var(--workspace-border)",
            }}
          />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-80 animate-pulse"
          style={{
            background: "var(--workspace-muted-bg)",
            border: "1px solid var(--workspace-border)",
          }}
        />
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 text-xs"
        style={{
          background: "var(--workspace-fg)",
          color: "#FFFFFF",
          border: "1px solid var(--workspace-border)",
        }}
      >
        <p className="mb-1 font-medium">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span>
              {entry.name}: {typeof entry.value === "number" && entry.name.toLowerCase().includes("cost")
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function Analytics() {
  const { data: auth } = useGetCurrentAuthUser();
  const currentUser = auth?.user as AuthUserWithOrg | undefined;

  if (currentUser && currentUser.orgRole !== "admin" && currentUser.orgRole !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Admin access required</p>
      </div>
    );
  }

  const {
    data: summary,
    isLoading: loadingSummary,
    error: summaryError,
  } = useQuery<SummaryData>({
    queryKey: ["analytics", "summary"],
    queryFn: () => fetchJson("/api/analytics/summary"),
  });

  const {
    data: usageOverTime,
    isLoading: loadingUsage,
  } = useQuery<UsageOverTimePoint[]>({
    queryKey: ["analytics", "usage-over-time"],
    queryFn: () => fetchJson("/api/analytics/usage-over-time"),
  });

  const {
    data: usageByFeature,
  } = useQuery<UsageByFeature[]>({
    queryKey: ["analytics", "usage-by-feature"],
    queryFn: () => fetchJson("/api/analytics/usage-by-feature"),
  });

  const {
    data: costData,
  } = useQuery<CostTrackingResponse>({
    queryKey: ["analytics", "cost-tracking"],
    queryFn: () => fetchJson("/api/analytics/cost-tracking"),
  });

  const {
    data: usageByUser,
  } = useQuery<UsageByUser[]>({
    queryKey: ["analytics", "usage-by-user"],
    queryFn: () => fetchJson("/api/analytics/usage-by-user"),
  });

  const {
    data: recentActivity,
  } = useQuery<RecentEvent[]>({
    queryKey: ["analytics", "recent-activity"],
    queryFn: () => fetchJson("/api/analytics/recent-activity"),
  });

  const isLoading = loadingSummary || loadingUsage;
  const error = summaryError
    ? summaryError instanceof Error ? summaryError.message : "Failed to load analytics"
    : null;

  // Derive feature breakdown totals for the bar chart
  const featureBreakdown = (usageByFeature ?? []).map((f) => ({
    feature: formatEventType(f.feature ?? "unknown"),
    count: (f.data ?? []).reduce((sum, d) => sum + d.count, 0),
  })).sort((a, b) => b.count - a.count);

  // Sort users by total activity
  const sortedUsers = [...(usageByUser ?? [])].sort((a, b) => {
    const aTotal = Number(a.reportsCount ?? 0) + Number(a.conversationsCount ?? 0) +
      Number(a.workflowsCount ?? 0) + Number(a.documentsCount ?? 0);
    const bTotal = Number(b.reportsCount ?? 0) + Number(b.conversationsCount ?? 0) +
      Number(b.workflowsCount ?? 0) + Number(b.documentsCount ?? 0);
    return bTotal - aTotal;
  });

  // Cost trend with formatted dates
  const costTrend = (costData?.costTrend ?? []).map((d) => ({
    ...d,
    date: formatShortDate(d.date),
    cost: Number(d.cost) || 0,
  }));

  // Usage over time with formatted dates
  const usageTimeline = (usageOverTime ?? []).map((d) => ({
    ...d,
    date: formatShortDate(d.date),
    count: Number(d.count) || 0,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div
        className="flex flex-col gap-2 pb-6 border-b"
        style={{ borderColor: "var(--workspace-border)" }}
      >
        <h1
          className="font-serif text-5xl font-light mb-2"
          style={{ color: "var(--workspace-fg)" }}
        >
          Analytics
        </h1>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
          Organization-wide usage and cost insights
        </p>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-sm"
          style={{
            border: "1px solid #fee2e2",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SummaryCard
                label="Reports Generated"
                value={formatNumber(summary.totalReports)}
                icon={FileText}
              />
              <SummaryCard
                label="Workflows Run"
                value={formatNumber(summary.totalWorkflows)}
                icon={Zap}
              />
              <SummaryCard
                label="Documents Indexed"
                value={formatNumber(summary.totalDocuments)}
                icon={BarChart3}
              />
              <SummaryCard
                label="Conversations"
                value={formatNumber(summary.totalConversations)}
                icon={MessageSquareText}
              />
              <SummaryCard
                label="Total Token Spend"
                value={formatTokens(costData?.totalTokens)}
                icon={TrendingUp}
              />
              <SummaryCard
                label="Cost This Month"
                value={formatCurrency(summary.costThisMonth)}
                icon={DollarSign}
              />
            </div>
          )}

          {/* Usage Over Time - Area Chart */}
          {usageTimeline.length > 0 && (
            <ChartCard
              title="Usage Over Time"
              subtitle="Daily activity across all features (last 30 days)"
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={usageTimeline}>
                  <defs>
                    <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A1917" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#1A1917" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DF" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    interval="preserveStartEnd"
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#1A1917"
                    strokeWidth={2}
                    fill="url(#usageGradient)"
                    name="Events"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Feature Breakdown - Bar Chart */}
          {featureBreakdown.length > 0 && (
            <ChartCard
              title="Feature Breakdown"
              subtitle="Which features are used most"
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DF" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    width={120}
                    tickMargin={8}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="#1A1917"
                    name="Total Events"
                    radius={[0, 2, 2, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Cost Over Time - Line Chart */}
          {costTrend.length > 0 && (
            <ChartCard
              title="Cost Tracking"
              subtitle={`Daily spend over the last 30 days (${formatCurrency(costData?.totalCost)} total)`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DF" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    interval="preserveStartEnd"
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#6B6763"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} iconType="line" />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#6B6763"
                    name="Cost ($)"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Cost by Feature breakdown */}
          {costData?.costByFeature && costData.costByFeature.length > 0 && (
            <ChartCard
              title="Cost by Feature"
              subtitle="Token spend and dollar cost per feature"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-[0.1em]"
                      style={{
                        color: "var(--workspace-muted)",
                        borderBottom: "1px solid var(--workspace-border)",
                      }}
                    >
                      <th className="text-left px-4 py-3 font-normal">Feature</th>
                      <th className="text-right px-4 py-3 font-normal">Tokens</th>
                      <th className="text-right px-4 py-3 font-normal">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData.costByFeature.map((item, i) => (
                      <tr
                        key={item.feature}
                        className="transition-colors"
                        style={{
                          borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--workspace-muted-bg)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                      >
                        <td
                          className="text-xs px-4 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatEventType(item.feature)}
                        </td>
                        <td
                          className="text-xs text-right px-4 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatTokens(item.tokens)}
                        </td>
                        <td
                          className="text-xs text-right px-4 py-3 font-medium"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatCurrency(item.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {/* Usage by User Table */}
          {sortedUsers.length > 0 && (
            <div
              style={{
                border: "1px solid var(--workspace-border)",
                background: "#FFFFFF",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "var(--workspace-border)" }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "var(--workspace-muted)" }}
                >
                  Usage by User
                </p>
                <h3
                  className="text-sm font-medium mt-1"
                  style={{ color: "var(--workspace-fg)" }}
                >
                  Top users by activity
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-[0.1em]"
                      style={{
                        color: "var(--workspace-muted)",
                        borderBottom: "1px solid var(--workspace-border)",
                      }}
                    >
                      <th className="text-left px-5 py-3 font-normal">User</th>
                      <th className="text-right px-5 py-3 font-normal">Reports</th>
                      <th className="text-right px-5 py-3 font-normal">Conversations</th>
                      <th className="text-right px-5 py-3 font-normal">Workflows</th>
                      <th className="text-right px-5 py-3 font-normal">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user, i) => (
                      <tr
                        key={user.userId ?? `user-${i}`}
                        className="transition-colors"
                        style={{
                          borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--workspace-muted-bg)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                      >
                        <td
                          className="text-xs px-5 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {user.userName || user.userId || "Unknown"}
                        </td>
                        <td
                          className="text-xs text-right px-5 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatNumber(user.reportsCount)}
                        </td>
                        <td
                          className="text-xs text-right px-5 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatNumber(user.conversationsCount)}
                        </td>
                        <td
                          className="text-xs text-right px-5 py-3"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatNumber(user.workflowsCount)}
                        </td>
                        <td
                          className="text-xs text-right px-5 py-3 font-medium"
                          style={{ color: "var(--workspace-fg)" }}
                        >
                          {formatNumber(user.documentsCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activity Table */}
          {recentActivity && recentActivity.length > 0 && (
            <div
              style={{
                border: "1px solid var(--workspace-border)",
                background: "#FFFFFF",
              }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "var(--workspace-border)" }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "var(--workspace-muted)" }}
                >
                  Recent Activity
                </p>
                <h3
                  className="text-sm font-medium mt-1"
                  style={{ color: "var(--workspace-fg)" }}
                >
                  Last 50 events across the organization
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-[0.1em]"
                      style={{
                        color: "var(--workspace-muted)",
                        borderBottom: "1px solid var(--workspace-border)",
                      }}
                    >
                      <th className="text-left px-5 py-3 font-normal">Event</th>
                      <th className="text-left px-5 py-3 font-normal">Feature</th>
                      <th className="text-left px-5 py-3 font-normal">User</th>
                      <th className="text-right px-5 py-3 font-normal">Tokens</th>
                      <th className="text-right px-5 py-3 font-normal">Cost</th>
                      <th className="text-right px-5 py-3 font-normal">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((event, i) => {
                      const totalTokens =
                        (event.tokensInput ?? 0) + (event.tokensOutput ?? 0);
                      let timeLabel: string;
                      try {
                        timeLabel = format(parseISO(event.timestamp), "MMM d, h:mm a");
                      } catch {
                        timeLabel = event.timestamp;
                      }

                      return (
                        <tr
                          key={event.id}
                          className="transition-colors"
                          style={{
                            borderTop:
                              i > 0
                                ? "1px solid var(--workspace-border)"
                                : undefined,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--workspace-muted-bg)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "#FFFFFF")
                          }
                        >
                          <td
                            className="text-xs px-5 py-3"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            <div className="flex items-center gap-2">
                              <Activity
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: "var(--workspace-muted)" }}
                              />
                              {formatEventType(event.eventType)}
                            </div>
                          </td>
                          <td
                            className="text-xs px-5 py-3"
                            style={{ color: "var(--workspace-muted)" }}
                          >
                            {event.feature
                              ? formatEventType(event.feature)
                              : "\u2014"}
                          </td>
                          <td
                            className="text-xs px-5 py-3"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {event.userName || event.userId || "\u2014"}
                          </td>
                          <td
                            className="text-xs text-right px-5 py-3 tabular-nums"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {totalTokens > 0 ? formatTokens(totalTokens) : "\u2014"}
                          </td>
                          <td
                            className="text-xs text-right px-5 py-3 tabular-nums"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {event.dollarsCost != null && event.dollarsCost > 0
                              ? formatCurrency(event.dollarsCost)
                              : "\u2014"}
                          </td>
                          <td
                            className="text-xs text-right px-5 py-3 whitespace-nowrap"
                            style={{ color: "var(--workspace-muted)" }}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {timeLabel}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!summary && !error && (
            <div
              className="py-16 text-center border-dashed"
              style={{ border: "1px dashed var(--workspace-border)" }}
            >
              <BarChart3
                className="h-8 w-8 mx-auto mb-4"
                style={{ color: "var(--workspace-muted)" }}
              />
              <h3
                className="font-serif text-lg font-light mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                No analytics data available
              </h3>
              <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
                Analytics will appear here once your organization has activity.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
