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
        <div className="border border-white/10 px-5 py-3.5 flex items-center justify-between bg-white/3">
          <div className="flex items-center gap-4 text-xs text-[#E8E4DC]/55">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30">Context</span>
            <span className="font-medium text-[#E8E4DC]/80">{profile.companyName}</span>
            <span className="text-[#E8E4DC]/25">·</span>
            <span>{profile.industry}</span>
            <span className="text-[#E8E4DC]/25">·</span>
            <span>{profile.stage}</span>
            <span className="text-[#E8E4DC]/25">·</span>
            <span>{profile.revenueRange}</span>
          </div>
          <Link
            href="/profile"
            className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 hover:text-[#E8E4DC]/60 transition-colors"
          >
            Edit
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/8">
        <div>
          <h1 className="font-serif text-5xl font-light tracking-tight text-[#E8E4DC] leading-none mb-2">
            {profile ? `Good morning, ${profile.companyName}.` : "Intelligence Briefing"}
          </h1>
          <p className="text-sm text-[#E8E4DC]/40">
            {profile
              ? `${profile.strategicPriorities ? profile.strategicPriorities.split(',')[0].trim() : "Your strategic priorities are active."}`
              : "Your high-level strategic overview."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/chat"
            className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/70 hover:text-[#E8E4DC] hover:border-white/30 transition-colors"
            data-testid="btn-new-chat"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            New Engagement
          </Link>
          <Link
            href="/reports/new"
            className="flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors"
            data-testid="btn-new-report"
          >
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Link>
        </div>
      </div>

      {/* Quick launch workflows */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-4">Quick Launch</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LAUNCHES.map((item) => (
            <Link
              key={item.reportType}
              href={`/reports/new?type=${item.reportType}`}
              className="group border border-white/10 px-4 py-4 hover:border-white/25 hover:bg-white/3 transition-colors"
              data-testid={`quick-launch-${item.reportType}`}
            >
              <item.icon className="h-4 w-4 text-[#E8E4DC]/35 mb-3 group-hover:text-[#E8E4DC]/60 transition-colors" />
              <p className="text-xs font-medium text-[#E8E4DC]/80 mb-1">{item.label}</p>
              <p className="text-[10px] text-[#E8E4DC]/35 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Engagements / Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30">Recent Intelligence</p>
            <Link
              href="/reports"
              className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 hover:text-[#E8E4DC]/60 transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingReports ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white/3 animate-pulse border border-white/6" />
              ))}
            </div>
          ) : recentReports?.length === 0 ? (
            <div className="border border-white/8 border-dashed p-8 text-center">
              <FileText className="h-6 w-6 mx-auto mb-3 text-[#E8E4DC]/20" />
              <p className="text-sm text-[#E8E4DC]/35">No reports generated yet.</p>
              <Link
                href="/reports/new"
                className="inline-block mt-4 text-xs uppercase tracking-widest text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 border-b border-white/15 pb-0.5 transition-colors"
              >
                Commission First Report
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/6 border border-white/10">
              {recentReports?.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors group"
                  data-testid={`link-recent-report-${report.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-[#E8E4DC]/25 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#E8E4DC]/80 group-hover:text-[#E8E4DC] transition-colors truncate font-medium">
                        {report.company}
                      </p>
                      <p className="text-[10px] text-[#E8E4DC]/35 uppercase tracking-wide">
                        {report.reportType.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-[#E8E4DC]/30">
                      {format(new Date(report.createdAt), "MMM d")}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 border ${
                      report.status === 'complete'
                        ? 'border-white/15 text-[#E8E4DC]/45'
                        : report.status === 'generating'
                        ? 'border-white/20 text-[#E8E4DC]/60 animate-pulse'
                        : 'border-red-800/40 text-red-400/60'
                    }`}>
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
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/30">Activity</p>
          <div className="space-y-2">
            <div className="border border-white/10 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/35 mb-1">Total Reports</p>
              <p className="font-serif text-4xl font-light text-[#E8E4DC]" data-testid="stat-total-reports">
                {loadingSummary ? "—" : summary?.totalReports ?? 0}
              </p>
            </div>
            <div className="border border-white/10 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/35 mb-1">Engagements</p>
              <p className="font-serif text-4xl font-light text-[#E8E4DC]" data-testid="stat-total-conversations">
                {loadingSummary ? "—" : summary?.totalConversations ?? 0}
              </p>
            </div>
            <div className="border border-white/10 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/35 mb-1">This Month</p>
              <p className="font-serif text-4xl font-light text-[#E8E4DC]" data-testid="stat-monthly-reports">
                {loadingSummary ? "—" : summary?.reportsThisMonth ?? 0}
              </p>
            </div>
            {!profile && (
              <Link
                href="/profile"
                className="block border border-dashed border-white/12 px-4 py-4 hover:border-white/25 transition-colors"
              >
                <p className="text-xs text-[#E8E4DC]/40 mb-1">Set up your company profile</p>
                <p className="text-[10px] text-[#E8E4DC]/25">Help the AI understand your business context for better insights.</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
