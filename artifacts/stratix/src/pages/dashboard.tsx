import { Link } from "wouter";
import { format } from "date-fns";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRecentReports,
  getGetRecentReportsQueryKey,
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
} from "@workspace/api-client-react";
import {
  FileText,
  MessageSquareText,
  Plus,
  ArrowRight,
  Target,
  Globe,
  TrendingUp,
  BarChart2
} from "lucide-react";

const QUICK_LAUNCHES = [
  {
    label: "Competitive Scan",
    desc: "Map your competitive landscape",
    reportType: "competitive_analysis",
    icon: Target,
  },
  {
    label: "Board Prep",
    desc: "Structure your board meeting narrative",
    reportType: "growth_strategy",
    icon: BarChart2,
  },
  {
    label: "Market Entry Analysis",
    desc: "Evaluate new market opportunities",
    reportType: "market_intelligence",
    icon: Globe,
  },
  {
    label: "Acquisition Target Evaluation",
    desc: "Assess M&A targets with rigor",
    reportType: "full_business_audit",
    icon: TrendingUp,
  },
];

export function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: recentReports, isLoading: loadingReports } = useGetRecentReports({
    query: { queryKey: getGetRecentReportsQueryKey() }
  });

  const { data: profile } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Company context strip */}
      {profile && (
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--workspace-muted)" }}>
            <span className="text-[10px] uppercase tracking-[0.2em]">Context</span>
            <span className="font-medium" style={{ color: "var(--workspace-fg)" }}>{profile.companyName}</span>
            <span style={{ color: "var(--workspace-border)" }}>·</span>
            <span>{profile.industry}</span>
            <span style={{ color: "var(--workspace-border)" }}>·</span>
            <span>{profile.stage}</span>
            <span style={{ color: "var(--workspace-border)" }}>·</span>
            <span>{profile.revenueRange}</span>
          </div>
          <Link
            href="/profile"
            className="text-[10px] uppercase tracking-[0.2em] transition-colors"
            style={{ color: "var(--workspace-muted)" }}
          >
            Edit
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div>
          <h1 className="font-serif text-5xl font-light tracking-tight leading-none mb-2" style={{ color: "var(--workspace-fg)" }}>
            {profile ? `Good morning, ${profile.companyName}.` : "Intelligence Briefing"}
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            {profile
              ? `${profile.strategicPriorities ? profile.strategicPriorities.split(',')[0].trim() : "Your strategic priorities are active."}`
              : "Your high-level strategic overview."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
            data-testid="btn-new-chat"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            New Chat
          </Link>
          <Link
            href="/reports/new"
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
            style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            data-testid="btn-new-report"
          >
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Link>
        </div>
      </div>

      {/* Quick launch */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "var(--workspace-muted)" }}>Quick Launch</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LAUNCHES.map((item) => (
            <Link
              key={item.reportType}
              href={`/reports/new?type=${item.reportType}`}
              className="group px-4 py-4 transition-colors"
              style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}
              data-testid={`quick-launch-${item.reportType}`}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
            >
              <item.icon className="h-4 w-4 mb-3 transition-colors" style={{ color: "var(--workspace-muted)" }} />
              <p className="text-xs font-medium mb-1" style={{ color: "var(--workspace-fg)" }}>{item.label}</p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--workspace-muted)" }}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>Recent Intelligence</p>
            <Link
              href="/reports"
              className="text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center gap-1"
              style={{ color: "var(--workspace-muted)" }}
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingReports ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse" style={{ background: "var(--workspace-muted-bg)", border: "1px solid var(--workspace-border)" }} />
              ))}
            </div>
          ) : recentReports?.length === 0 ? (
            <div className="p-8 text-center border border-dashed" style={{ borderColor: "var(--workspace-border)" }}>
              <FileText className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
              <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>No reports generated yet.</p>
              <Link
                href="/reports/new"
                className="inline-block mt-4 text-xs uppercase tracking-widest pb-0.5 transition-colors"
                style={{ color: "var(--workspace-fg)", borderBottom: "1px solid var(--workspace-border)" }}
              >
                Commission First Report
              </Link>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--workspace-border)" }}>
              {recentReports?.map((report, i) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between px-4 py-3.5 transition-colors group"
                  style={{
                    borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                    background: "#FFFFFF",
                  }}
                  data-testid={`link-recent-report-${report.id}`}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--workspace-muted-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--workspace-fg)" }}>
                        {report.company}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--workspace-muted)" }}>
                        {report.reportType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                      {format(new Date(report.createdAt), "MMM d")}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 ${
                      report.status === 'generating' ? 'animate-pulse' : ''
                    }`} style={{
                      border: "1px solid var(--workspace-border)",
                      color: report.status === 'complete' ? "var(--workspace-muted)" : report.status === 'generating' ? "var(--workspace-fg)" : "#dc2626",
                    }}>
                      {report.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>Activity</p>
          <div className="space-y-2">
            <div className="px-4 py-4" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
              <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "var(--workspace-muted)" }}>Total Reports</p>
              <p className="font-serif text-4xl font-light" style={{ color: "var(--workspace-fg)" }} data-testid="stat-total-reports">
                {loadingSummary ? "—" : summary?.totalReports ?? 0}
              </p>
            </div>
            <div className="px-4 py-4" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
              <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "var(--workspace-muted)" }}>Conversations</p>
              <p className="font-serif text-4xl font-light" style={{ color: "var(--workspace-fg)" }} data-testid="stat-total-conversations">
                {loadingSummary ? "—" : summary?.totalConversations ?? 0}
              </p>
            </div>
            <div className="px-4 py-4" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
              <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "var(--workspace-muted)" }}>This Month</p>
              <p className="font-serif text-4xl font-light" style={{ color: "var(--workspace-fg)" }} data-testid="stat-monthly-reports">
                {loadingSummary ? "—" : summary?.reportsThisMonth ?? 0}
              </p>
            </div>
            {!profile && (
              <Link
                href="/profile"
                className="block px-4 py-4 border-dashed transition-colors"
                style={{ border: "1px dashed var(--workspace-border)", background: "#FFFFFF" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--workspace-muted)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
              >
                <p className="text-xs mb-1" style={{ color: "var(--workspace-fg)" }}>Set up your company profile</p>
                <p className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>Help the AI understand your business context for better insights.</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
