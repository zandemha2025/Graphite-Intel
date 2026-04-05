import { useState } from "react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  useGetReport,
  getGetReportQueryKey,
} from "@workspace/api-client-react";
import { Download, ChevronLeft, FileDown, FileText, File, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type ExportFormat = 'pdf' | 'docx' | 'md';

export function ReportView() {
  const [, params] = useRoute("/reports/:id");
  const reportId = parseInt(params?.id || "0", 10);
  const { toast } = useToast();

  const { data: report, isLoading } = useGetReport(reportId, {
    query: {
      enabled: !!reportId,
      queryKey: getGetReportQueryKey(reportId)
    }
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/download`, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : 'report.md';
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExport = async (fmt: ExportFormat) => {
    setExportingFormat(fmt);
    try {
      const response = await fetch(`/api/reports/${reportId}/export?format=${fmt}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: `Report exported as ${fmt.toUpperCase()}` });
    } catch (err) {
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Failed to export report',
        variant: 'destructive',
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const isComplete = report?.status === "complete";

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-20" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="h-12 w-2/3" style={{ background: "var(--workspace-muted-bg)" }} />
        <div className="h-64" style={{ background: "var(--workspace-muted-bg)" }} />
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-20 text-sm" style={{ color: "var(--workspace-muted)" }}>Report not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <Link
        href="/reports"
        className="inline-flex items-center text-xs mb-8 font-medium transition-colors"
        style={{ color: "var(--workspace-muted)" }}
      >
        <ChevronLeft className="w-3 h-3 mr-1" /> Report Library
      </Link>

      {/* Report header */}
      <div className="mb-1" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
        <div className="px-8 py-8 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-medium inline-block px-2 py-0.5" style={{ color: "var(--workspace-muted)", border: "1px solid var(--workspace-border)" }}>
                {report.reportType.replace(/_/g, ' ')}
              </div>
              <h1 className="font-sans text-2xl font-semibold tracking-tight leading-tight" style={{ color: "var(--workspace-fg)" }}>
                {report.title}
              </h1>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {isComplete && (
                <>
                  <button
                    onClick={handleDownload}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-medium mt-1 transition-colors disabled:opacity-40"
                    style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                    data-testid="btn-download-report"
                    disabled={isDownloading || !!exportingFormat}
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-medium mt-1 transition-colors disabled:opacity-40"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: exportingFormat === 'pdf' ? "var(--workspace-fg)" : "var(--workspace-muted)",
                      background: "#FFFFFF",
                    }}
                    data-testid="btn-export-pdf"
                    title="Export as PDF"
                    disabled={!!exportingFormat || isDownloading}
                  >
                    {exportingFormat === 'pdf' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-medium mt-1 transition-colors disabled:opacity-40"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: exportingFormat === 'docx' ? "var(--workspace-fg)" : "var(--workspace-muted)",
                      background: "#FFFFFF",
                    }}
                    data-testid="btn-export-docx"
                    title="Export as DOCX"
                    disabled={!!exportingFormat || isDownloading}
                  >
                    {exportingFormat === 'docx' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    DOCX
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-medium mt-1 transition-colors disabled:opacity-40"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: exportingFormat === 'md' ? "var(--workspace-fg)" : "var(--workspace-muted)",
                      background: "#FFFFFF",
                    }}
                    data-testid="btn-export-md"
                    title="Export as Markdown"
                    disabled={!!exportingFormat || isDownloading}
                  >
                    {exportingFormat === 'md' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <File className="w-3.5 h-3.5" />
                    )}
                    MD
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <div className="px-5 py-3.5 border-r" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Target</p>
            <p className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>{report.company}</p>
          </div>
          <div className="px-5 py-3.5 border-r" style={{ borderColor: "var(--workspace-border)" }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Generated</p>
            <p className="text-sm" style={{ color: "var(--workspace-fg)" }}>{format(new Date(report.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[11px] font-medium mb-1" style={{ color: "var(--workspace-muted)" }}>Status</p>
            <p className="text-sm capitalize" style={{ color: "var(--workspace-fg)" }}>{report.status}</p>
          </div>
        </div>

        {report.summary && (
          <div className="px-8 py-5 border-b border-l-2" style={{ borderColor: "var(--workspace-border)", borderLeftColor: "var(--workspace-fg)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--workspace-muted)" }}>Executive Summary</p>
            <p className="text-sm leading-relaxed font-light" style={{ color: "var(--workspace-fg)" }}>
              {report.summary}
            </p>
          </div>
        )}
      </div>

      {/* Report content — white reading surface */}
      <div className="px-8 pt-10" style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", borderTop: "none" }}>
        {report.content ? (
          <div className="prose prose-sm max-w-[70ch] mx-auto py-6"
            style={{
              "--tw-prose-body": "var(--workspace-fg)",
              "--tw-prose-headings": "var(--workspace-fg)",
              "--tw-prose-lead": "var(--workspace-muted)",
              "--tw-prose-links": "var(--workspace-fg)",
              "--tw-prose-bold": "var(--workspace-fg)",
              "--tw-prose-counters": "var(--workspace-muted)",
              "--tw-prose-bullets": "var(--workspace-muted)",
              "--tw-prose-hr": "var(--workspace-border)",
              "--tw-prose-quotes": "var(--workspace-fg)",
              "--tw-prose-quote-borders": "var(--workspace-border)",
              "--tw-prose-captions": "var(--workspace-muted)",
              "--tw-prose-code": "var(--workspace-fg)",
              "--tw-prose-pre-code": "var(--workspace-fg)",
              "--tw-prose-pre-bg": "var(--workspace-muted-bg)",
              "--tw-prose-th-borders": "var(--workspace-border)",
              "--tw-prose-td-borders": "var(--workspace-border)",
            } as React.CSSProperties}
          >
            <ReactMarkdown>{report.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm italic py-8" style={{ color: "var(--workspace-muted)" }}>Content generation failed or is incomplete.</p>
        )}
      </div>
    </div>
  );
}
