import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { FileText, Plus, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPost } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdReport {
  id: number;
  name: string;
  reportType: string;
  status: string;
  dateRange: { from: string; to: string };
  generatedContent: {
    summary?: string;
    insights?: string[];
    recommendations?: string[];
  } | null;
  completedAt: string | null;
  createdAt: string;
}

interface MetricsOverview {
  totalSpend: number;
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;
  avgROAS: number;
}

const REPORT_TYPES = [
  { value: "performance", label: "Performance Report", desc: "Overall campaign performance metrics and trends" },
  { value: "comparison", label: "Campaign Comparison", desc: "Side-by-side comparison of selected campaigns" },
  { value: "trend", label: "Trend Analysis", desc: "Performance trends over time with forecasting" },
  { value: "roi", label: "ROI Report", desc: "Return on investment analysis across campaigns" },
  { value: "creative_analysis", label: "Creative Analysis", desc: "Which creatives perform best and why" },
];

/* ------------------------------------------------------------------ */
/*  Metric card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({ label, value, format }: { label: string; value: number; format?: "currency" | "percent" | "number" }) {
  let display: string;
  if (format === "currency") display = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  else if (format === "percent") display = `${(value * 100).toFixed(2)}%`;
  else display = value.toLocaleString();

  return (
    <Card className="flex flex-col">
      <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-[#0A0A0A]">{display}</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Report detail view                                                 */
/* ------------------------------------------------------------------ */

function ReportDetail({ reportId, onBack }: { reportId: number; onBack: () => void }) {
  const { data: report, isLoading } = useQuery<AdReport>({
    queryKey: ["ad-report", reportId],
    queryFn: () => api<AdReport>(`/ads/reports/${reportId}`),
    refetchInterval: (query) => {
      const r = query.state.data;
      return r && r.status !== "ready" && r.status !== "failed" ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#9CA3AF]">Report not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#404040] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Reports
      </button>

      <div>
        <h2 className="text-xl font-semibold text-[#0A0A0A]">{report.name}</h2>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {report.dateRange.from} to {report.dateRange.to}
        </p>
      </div>

      {report.status === "generating" && (
        <Card className="bg-[#FFFBEB] border-yellow-200">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <p className="text-sm text-[#92400E]">Report is being generated. This page will update automatically.</p>
          </div>
        </Card>
      )}

      {report.status === "failed" && (
        <Card className="bg-[#FEF2F2] border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-[#991B1B]">Report generation failed. Please try again.</p>
          </div>
        </Card>
      )}

      {report.generatedContent && (
        <div className="space-y-5">
          {report.generatedContent.summary && (
            <Card>
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Executive Summary</h3>
              <p className="text-sm text-[#404040] leading-relaxed whitespace-pre-wrap">
                {report.generatedContent.summary}
              </p>
            </Card>
          )}

          {report.generatedContent.insights && report.generatedContent.insights.length > 0 && (
            <Card>
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Key Insights</h3>
              <div className="space-y-3">
                {report.generatedContent.insights.map((insight, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-sm font-medium text-[#0A0A0A] shrink-0">{i + 1}.</span>
                    <p className="text-sm text-[#404040]">{insight}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {report.generatedContent.recommendations && report.generatedContent.recommendations.length > 0 && (
            <Card className="bg-[#F6F5F4]">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">Recommendations</h3>
              <div className="space-y-3">
                {report.generatedContent.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#065F46] shrink-0 mt-0.5" />
                    <p className="text-sm text-[#404040]">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AdsReportsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [reportType, setReportType] = useState("performance");
  const [reportName, setReportName] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: reports, isLoading } = useQuery<AdReport[]>({
    queryKey: ["ad-reports"],
    queryFn: () => api<AdReport[]>("/ads/reports"),
  });

  const { data: metrics } = useQuery<MetricsOverview>({
    queryKey: ["ads-metrics-overview"],
    queryFn: () => api<MetricsOverview>("/ads/metrics/overview?days=30"),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiPost<AdReport>("/ads/reports", {
        name: reportName || `${REPORT_TYPES.find((r) => r.value === reportType)?.label ?? reportType} Report`,
        reportType,
        dateRange: { from: dateFrom, to: dateTo },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ad-reports"] });
      setShowCreate(false);
      setReportName("");
      toast.success("Report generation started");
      setSelectedReportId((data as AdReport).id);
    },
    onError: () => toast.error("Failed to create report"),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="success">Ready</Badge>;
      case "generating":
        return <Badge variant="warning">Generating</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (selectedReportId) {
    return (
      <Page title="Ad Reports" subtitle="AI-powered advertising performance reports">
        <ReportDetail reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />
      </Page>
    );
  }

  return (
    <Page
      title="Ad Reports"
      subtitle="AI-powered advertising performance reports"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setLocation("/ads")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Ads Dashboard
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metrics overview */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Total Spend (30d)" value={metrics.totalSpend} format="currency" />
            <MetricCard label="Total Revenue (30d)" value={metrics.totalRevenue} format="currency" />
            <MetricCard label="Avg CTR" value={metrics.avgCTR} format="percent" />
            <MetricCard label="Avg ROAS" value={metrics.avgROAS} format="number" />
          </div>
        )}

        {/* Reports list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#F3F3F1] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[#E5E5E3] rounded-xl">
            <FileText className="h-10 w-10 text-[#9CA3AF] mb-3" />
            <p className="text-sm text-[#404040] font-medium">No reports generated yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1 mb-4">
              Generate AI-powered reports to analyze your ad performance.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Report
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <Card
                key={report.id}
                className={`flex items-center justify-between cursor-pointer hover:border-[#C8C8C6] transition-colors ${
                  report.status !== "ready" ? "opacity-70" : ""
                }`}
                onClick={() => {
                  if (report.status === "ready") setSelectedReportId(report.id);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">{report.name}</p>
                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mt-0.5">
                      <span>{report.dateRange.from} to {report.dateRange.to}</span>
                      <span>&middot;</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {statusBadge(report.status)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Report Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Select a report type and date range. The report will be generated using AI analysis.
          </DialogDescription>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1.5">Report Name (optional)</label>
              <Input
                placeholder="Auto-generated from type"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] mb-2">Report Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    onClick={() => setReportType(rt.value)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      reportType === rt.value
                        ? "border-[#0A0A0A] bg-[#F6F5F4]"
                        : "border-[#E5E5E3] hover:bg-[#F6F5F4]"
                    }`}
                  >
                    <p className="text-sm font-medium text-[#0A0A0A]">{rt.label}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{rt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#404040] mb-1.5">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#404040] mb-1.5">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={() => createMut.mutate()} loading={createMut.isPending}>
                Generate Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
