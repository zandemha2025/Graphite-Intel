import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Zap,
  MessageSquareText,
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
} from "recharts";

// Types
interface SummaryData {
  totalReports: number;
  totalWorkflows: number;
  totalDocuments: number;
  totalConversations: number;
  totalTokens: number;
  totalCost: number;
}

interface UsageByUser {
  userId: string;
  totalActions: number;
  totalTokens: number;
  totalCost: number;
}

interface UsageByFeature {
  feature: string;
  totalActions: number;
  totalTokens: number;
  totalCost: number;
}

interface CostTracking {
  date: string;
  totalTokens: number;
  totalCost: number;
}

interface SummaryCard {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className: string; style?: React.CSSProperties }>;
  format?: (val: number) => string;
}

// Utility functions
const formatCurrency = (val: number) => {
  return `$${val.toFixed(2)}`;
};

const formatNumber = (val: number) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
};

const formatTokens = (val: number) => {
  return `${(val / 1000).toFixed(1)}K`;
};

// Summary Card Component
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

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards skeleton */}
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

      {/* Charts skeleton */}
      <div
        className="h-80 animate-pulse"
        style={{
          background: "var(--workspace-muted-bg)",
          border: "1px solid var(--workspace-border)",
        }}
      />
      <div
        className="h-80 animate-pulse"
        style={{
          background: "var(--workspace-muted-bg)",
          border: "1px solid var(--workspace-border)",
        }}
      />
      <div
        className="h-96 animate-pulse"
        style={{
          background: "var(--workspace-muted-bg)",
          border: "1px solid var(--workspace-border)",
        }}
      />
    </div>
  );
}

// Custom Tooltip for Charts
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
}) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 text-xs rounded"
        style={{
          background: "var(--workspace-fg)",
          color: "#FFFFFF",
          border: "1px solid var(--workspace-border)",
        }}
      >
        {payload.map((entry, index) => (
          <div key={index}>
            <span style={{ color: (entry as { color?: string }).color || "#FFFFFF" }}>
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function Analytics() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [usageByUser, setUsageByUser] = useState<UsageByUser[]>([]);
  const [usageByFeature, setUsageByFeature] = useState<UsageByFeature[]>([]);
  const [costTracking, setCostTracking] = useState<CostTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [summaryRes, userRes, featureRes, costRes] = await Promise.all([
          fetch("/api/analytics/summary"),
          fetch("/api/analytics/usage-by-user"),
          fetch("/api/analytics/usage-by-feature"),
          fetch("/api/analytics/cost-tracking"),
        ]);

        if (!summaryRes.ok || !userRes.ok || !featureRes.ok || !costRes.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const summaryData: SummaryData = await summaryRes.json();
        const userData: UsageByUser[] = await userRes.json();
        const featureData: UsageByFeature[] = await featureRes.json();
        const costData: CostTracking[] = await costRes.json();

        setSummary(summaryData);
        setUsageByUser(userData.sort((a, b) => b.totalActions - a.totalActions));
        setUsageByFeature(featureData);
        setCostTracking(costData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <h1 className="font-serif text-5xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>
            Analytics
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Organization-wide usage and cost insights
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <h1 className="font-serif text-5xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>
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

      {/* Summary Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Reports"
            value={summary.totalReports}
            icon={FileText}
          />
          <SummaryCard
            label="Total Workflows"
            value={summary.totalWorkflows}
            icon={Zap}
          />
          <SummaryCard
            label="Total Documents"
            value={summary.totalDocuments}
            icon={BarChart3}
          />
          <SummaryCard
            label="Total Conversations"
            value={summary.totalConversations}
            icon={MessageSquareText}
          />
          <SummaryCard
            label="Total Tokens Used"
            value={formatTokens(summary.totalTokens)}
            icon={TrendingUp}
          />
          <SummaryCard
            label="Total Cost"
            value={formatCurrency(summary.totalCost)}
            icon={DollarSign}
          />
        </div>
      )}

      {/* Cost Over Time Chart */}
      {costTracking.length > 0 && (
        <div
          className="px-5 py-4"
          style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
        >
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--workspace-muted)" }}>
              Cost Over Time
            </p>
            <h3 className="text-sm font-medium mt-1" style={{ color: "var(--workspace-fg)" }}>
              Daily token usage and costs
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costTracking}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E3DF"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="left"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="line"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalTokens"
                stroke="#1A1917"
                name="Tokens"
                dot={false}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalCost"
                stroke="#6B6763"
                name="Cost ($)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Usage by Feature Chart */}
      {usageByFeature.length > 0 && (
        <div
          className="px-5 py-4"
          style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
        >
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--workspace-muted)" }}>
              Usage by Feature
            </p>
            <h3 className="text-sm font-medium mt-1" style={{ color: "var(--workspace-fg)" }}>
              Actions and costs per feature
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageByFeature}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E3DF"
                vertical={false}
              />
              <XAxis
                dataKey="feature"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="left"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6B6763"
                style={{ fontSize: "12px" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar
                yAxisId="left"
                dataKey="totalActions"
                fill="#1A1917"
                name="Actions"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="totalCost"
                fill="#E5E3DF"
                name="Cost ($)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Usage by User Table */}
      {usageByUser.length > 0 && (
        <div
          style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--workspace-muted)" }}>
              Usage by User
            </p>
            <h3 className="text-sm font-medium mt-1" style={{ color: "var(--workspace-fg)" }}>
              Top users by actions and costs
            </h3>
          </div>
          <div>
            {/* Table Header */}
            <div
              className="grid grid-cols-4 gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.1em]"
              style={{
                color: "var(--workspace-muted)",
                borderBottom: "1px solid var(--workspace-border)",
              }}
            >
              <div>User ID</div>
              <div className="text-right">Actions</div>
              <div className="text-right">Tokens</div>
              <div className="text-right">Cost</div>
            </div>

            {/* Table Rows */}
            {usageByUser.map((user, i) => (
              <div
                key={user.userId}
                className="grid grid-cols-4 gap-4 px-5 py-3 transition-colors"
                style={{
                  borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                  background: "#FFFFFF",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--workspace-muted-bg)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#FFFFFF")
                }
              >
                <div className="text-xs" style={{ color: "var(--workspace-fg)" }}>
                  {user.userId}
                </div>
                <div
                  className="text-xs text-right"
                  style={{ color: "var(--workspace-fg)" }}
                >
                  {formatNumber(user.totalActions)}
                </div>
                <div
                  className="text-xs text-right"
                  style={{ color: "var(--workspace-muted)" }}
                >
                  {formatTokens(user.totalTokens)}
                </div>
                <div
                  className="text-xs text-right font-medium"
                  style={{ color: "var(--workspace-fg)" }}
                >
                  {formatCurrency(user.totalCost)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!summary && !error && (
        <div
          className="py-16 text-center border-dashed"
          style={{ border: "1px dashed var(--workspace-border)" }}
        >
          <BarChart3 className="h-8 w-8 mx-auto mb-4" style={{ color: "var(--workspace-muted)" }} />
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
    </div>
  );
}
