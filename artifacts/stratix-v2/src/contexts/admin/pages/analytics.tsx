import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalQueries: number;
  totalReports: number;
  totalWorkflows: number;
}

interface UsagePoint {
  date: string;
  sessions: number;
  queries: number;
}

interface FeatureUsage {
  feature: string;
  count: number;
}

interface CostEntry {
  month: string;
  cost: number;
}

interface RecentEvent {
  id: number;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "owner" && user?.role !== "admin") {
    return (
      <Page title="Analytics" subtitle="Platform usage and metrics">
        <Card className="flex items-center justify-center h-48">
          <p className="text-sm text-[#9CA3AF]">You need admin access to view analytics.</p>
        </Card>
      </Page>
    );
  }
  return <>{children}</>;
}

export default function AnalyticsPage() {
  return (
    <AdminGuard>
      <AnalyticsContent />
    </AdminGuard>
  );
}

function AnalyticsContent() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["analytics", "summary"],
    queryFn: () => api<AnalyticsSummary>("/analytics/summary"),
  });

  const { data: usage } = useQuery<UsagePoint[]>({
    queryKey: ["analytics", "usage"],
    queryFn: () => api<UsagePoint[]>("/analytics/usage"),
  });

  const { data: features } = useQuery<FeatureUsage[]>({
    queryKey: ["analytics", "features"],
    queryFn: () => api<FeatureUsage[]>("/analytics/features"),
  });

  const { data: costs } = useQuery<CostEntry[]>({
    queryKey: ["analytics", "costs"],
    queryFn: () => api<CostEntry[]>("/analytics/costs"),
  });

  const { data: activity } = useQuery<RecentEvent[]>({
    queryKey: ["analytics", "recent"],
    queryFn: () => api<RecentEvent[]>("/analytics/recent"),
  });

  if (summaryLoading) {
    return (
      <Page title="Analytics" subtitle="Platform usage and metrics">
        <PageSkeleton />
      </Page>
    );
  }

  const cards = summary
    ? [
        { label: "Total Users", value: summary.totalUsers },
        { label: "Active Users", value: summary.activeUsers },
        { label: "Sessions", value: summary.totalSessions },
        { label: "Queries", value: summary.totalQueries },
        { label: "Reports", value: summary.totalReports },
        { label: "Workflows", value: summary.totalWorkflows },
      ]
    : [];

  return (
    <Page title="Analytics" subtitle="Platform usage and metrics">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-[#9CA3AF] mb-1">{c.label}</p>
            <p className="text-xl font-semibold text-[#0A0A0A]">{c.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      {/* Usage over time */}
      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Usage Over Time</h2>
        {usage?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={usage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E3" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid #E5E5E3",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="sessions" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.08} />
              <Area type="monotone" dataKey="queries" stroke="#6366F1" fill="#6366F1" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-[#9CA3AF]">No usage data yet</div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Feature breakdown */}
        <Card>
          <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Feature Breakdown</h2>
          {features?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={features} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E3" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: "#404040" }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #E5E5E3",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#0A0A0A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-[#9CA3AF]">No feature data</div>
          )}
        </Card>

        {/* Cost tracking */}
        <Card>
          <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Cost Tracking</h2>
          {costs?.length ? (
            <div className="space-y-2">
              {costs.map((c) => (
                <div key={c.month} className="flex items-center justify-between text-sm">
                  <span className="text-[#404040]">{c.month}</span>
                  <span className="font-medium text-[#0A0A0A]">
                    ${c.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-[#9CA3AF]">No cost data</div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Recent Activity</h2>
        {activity?.length ? (
          <div className="rounded-lg border border-[#E5E5E3] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                  <th className="text-left px-4 py-2 font-medium text-[#404040]">User</th>
                  <th className="text-left px-4 py-2 font-medium text-[#404040]">Action</th>
                  <th className="text-left px-4 py-2 font-medium text-[#404040]">Resource</th>
                  <th className="text-left px-4 py-2 font-medium text-[#404040]">Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((e) => (
                  <tr key={e.id} className="border-b border-[#E5E5E3] last:border-0">
                    <td className="px-4 py-2.5 text-[#0A0A0A]">{e.user}</td>
                    <td className="px-4 py-2.5">
                      <Badge>{e.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[#404040]">{e.resource}</td>
                    <td className="px-4 py-2.5 text-[#9CA3AF]">{e.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <TableSkeleton rows={3} />
        )}
      </Card>
    </Page>
  );
}
