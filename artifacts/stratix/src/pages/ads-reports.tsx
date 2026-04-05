/**
 * Ad Reports — Generate and view AI-powered ad performance reports.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

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

const reportTypes = [
  { value: "performance", label: "Performance Report", desc: "Overall campaign performance metrics and trends" },
  { value: "comparison", label: "Campaign Comparison", desc: "Side-by-side comparison of selected campaigns" },
  { value: "trend", label: "Trend Analysis", desc: "Performance trends over time with forecasting" },
  { value: "roi", label: "ROI Report", desc: "Return on investment analysis across campaigns" },
  { value: "creative_analysis", label: "Creative Analysis", desc: "Which creatives perform best and why" },
];

export function AdsReports() {
  const [, setLocation] = useLocation();
  const [reports, setReports] = useState<AdReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdReport | null>(null);

  const [reportType, setReportType] = useState("performance");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/ads/reports", { credentials: "include" });
      if (res.ok) setReports(await res.json());
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setCreating(true);
    try {
      const res = await fetch("/api/ads/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          dateRange: { from: dateFrom, to: dateTo },
        }),
      });
      if (res.ok) {
        setShowForm(false);
        // Poll for completion
        setTimeout(loadReports, 5000);
        setTimeout(loadReports, 15000);
        loadReports();
      }
    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setCreating(false);
    }
  }

  async function viewReport(report: AdReport) {
    if (report.status !== "ready") return;
    try {
      const res = await fetch(`/api/ads/reports/${report.id}`, { credentials: "include" });
      if (res.ok) setSelectedReport(await res.json());
    } catch (err) {
      console.error("Failed to load report detail", err);
    }
  }

  if (selectedReport) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedReport(null)}
          className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/60"
        >
          &larr; Back to Reports
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DC]">{selectedReport.name}</h1>
          <div className="text-sm text-[#E8E4DC]/40 mt-1">
            {selectedReport.dateRange.from} to {selectedReport.dateRange.to}
          </div>
        </div>

        {selectedReport.generatedContent && (
          <div className="space-y-6">
            {selectedReport.generatedContent.summary && (
              <div className="p-6 border border-[#E8E4DC]/10">
                <h2 className="text-xs font-medium text-[#E8E4DC]/40 mb-3">Executive Summary</h2>
                <p className="text-sm text-[#E8E4DC]/70 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.generatedContent.summary}
                </p>
              </div>
            )}

            {selectedReport.generatedContent.insights && selectedReport.generatedContent.insights.length > 0 && (
              <div className="p-6 border border-[#E8E4DC]/10">
                <h2 className="text-xs font-medium text-[#E8E4DC]/40 mb-3">Key Insights</h2>
                <div className="space-y-3">
                  {selectedReport.generatedContent.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[#C9A55A] text-sm font-medium shrink-0">{i + 1}.</span>
                      <p className="text-sm text-[#E8E4DC]/70">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedReport.generatedContent.recommendations && selectedReport.generatedContent.recommendations.length > 0 && (
              <div className="p-6 border border-[#C9A55A]/20 bg-[#C9A55A]/5">
                <h2 className="text-xs font-medium text-[#C9A55A] mb-3">Recommendations</h2>
                <div className="space-y-3">
                  {selectedReport.generatedContent.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-[#C9A55A] text-sm shrink-0">&rarr;</span>
                      <p className="text-sm text-[#E8E4DC]/70">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setLocation("/ads")}
            className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/60 mb-2 block"
          >
            &larr; Back to Ads
          </button>
          <h1 className="text-2xl font-semibold text-[#E8E4DC]">Ad Reports</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition"
        >
          New Report
        </button>
      </div>

      {/* Report Generator */}
      {showForm && (
        <div className="p-6 border border-[#C9A55A]/20 bg-[#C9A55A]/5 space-y-4">
          <h3 className="text-sm font-medium text-[#E8E4DC]">Generate Report</h3>

          <div>
            <label className="block text-xs text-[#E8E4DC]/50 mb-2">Report Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.value}
                  onClick={() => setReportType(rt.value)}
                  className={`p-3 border text-left transition ${
                    reportType === rt.value
                      ? "border-[#C9A55A]/60 bg-[#C9A55A]/10"
                      : "border-[#E8E4DC]/10 hover:border-[#E8E4DC]/30"
                  }`}
                >
                  <div className="text-xs font-medium text-[#E8E4DC]">{rt.label}</div>
                  <div className="text-xs text-[#E8E4DC]/30 mt-0.5">{rt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#E8E4DC]/50 mb-2">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#E8E4DC]/50 mb-2">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={creating}
            className="px-6 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-50"
          >
            {creating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      )}

      {/* Report List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border border-[#E8E4DC]/20 border-t-[#E8E4DC]/60 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
          <p className="text-[#E8E4DC]/40 text-sm">No reports generated yet.</p>
        </div>
      ) : (
        <div className="border border-[#E8E4DC]/10 divide-y divide-[#E8E4DC]/10">
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => viewReport(r)}
              className={`p-4 flex items-center justify-between transition ${
                r.status === "ready" ? "cursor-pointer hover:bg-[#E8E4DC]/5" : "opacity-60"
              }`}
            >
              <div>
                <div className="text-sm font-medium text-[#E8E4DC]">{r.name}</div>
                <div className="text-xs text-[#E8E4DC]/40 mt-0.5">
                  {r.dateRange.from} to {r.dateRange.to} &middot; {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 ${
                  r.status === "ready"
                    ? "bg-green-500/20 text-green-300"
                    : r.status === "generating"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : r.status === "failed"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
