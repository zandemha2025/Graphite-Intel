import { Link } from "wouter";
import { format } from "date-fns";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetRecentReports,
  getGetRecentReportsQueryKey,
  useGetReportTypeStats,
  getGetReportTypeStatsQueryKey,
} from "@workspace/api-client-react";
import { 
  FileText, 
  MessageSquareText, 
  BarChart3, 
  TrendingUp,
  Plus,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: recentReports, isLoading: loadingReports } = useGetRecentReports({
    query: { queryKey: getGetRecentReportsQueryKey() }
  });

  const { data: typeStats, isLoading: loadingStats } = useGetReportTypeStats({
    query: { queryKey: getGetReportTypeStatsQueryKey() }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Your high-level strategic overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="border-brand text-brand hover:bg-brand hover:text-brand-foreground">
            <Link href="/chat" data-testid="btn-new-chat">
              <MessageSquareText className="mr-2 h-4 w-4" />
              Consult Advisor
            </Link>
          </Button>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/reports/new" data-testid="btn-new-report">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Reports</p>
                <p className="text-3xl font-bold font-serif" data-testid="stat-total-reports">
                  {loadingSummary ? "-" : summary?.totalReports || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Advisory Sessions</p>
                <p className="text-3xl font-bold font-serif" data-testid="stat-total-conversations">
                  {loadingSummary ? "-" : summary?.totalConversations || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <MessageSquareText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Generated This Month</p>
                <p className="text-3xl font-bold font-serif text-brand" data-testid="stat-monthly-reports">
                  {loadingSummary ? "-" : summary?.reportsThisMonth || 0}
                </p>
              </div>
              <div className="h-10 w-10 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Primary Focus</p>
                <p className="text-lg font-bold font-serif uppercase tracking-tight truncate" data-testid="stat-focus">
                  {loadingSummary 
                    ? "-" 
                    : summary?.mostUsedReportType 
                      ? summary.mostUsedReportType.replace(/_/g, ' ') 
                      : "N/A"}
                </p>
              </div>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Reports */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-serif">Recent Intelligence</CardTitle>
              <CardDescription>Latest reports generated across your organization.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-brand">
              <Link href="/reports">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingReports ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : recentReports?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>No reports generated yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports?.map((report) => (
                  <Link 
                    key={report.id} 
                    href={`/reports/${report.id}`}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors group"
                    data-testid={`link-recent-report-${report.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/5 text-primary flex items-center justify-center rounded">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground group-hover:text-brand transition-colors">
                          {report.company} — {report.reportType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        report.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        report.status === 'generating' ? 'bg-brand/10 text-brand' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Distribution */}
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-serif">Intelligence Distribution</CardTitle>
            <CardDescription>Breakdown by report type.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : typeStats?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {typeStats?.map((stat) => {
                  const maxCount = Math.max(...typeStats.map(s => s.count));
                  const percentage = (stat.count / maxCount) * 100;
                  
                  return (
                    <div key={stat.reportType} className="space-y-1.5" data-testid={`stat-row-${stat.reportType}`}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground capitalize text-xs">
                          {stat.reportType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-muted-foreground text-xs">{stat.count}</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
