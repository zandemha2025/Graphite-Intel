import { useRoute } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  useGetReport,
  getGetReportQueryKey,
  useDownloadReport
} from "@workspace/api-client-react";
import { Download, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export function ReportView() {
  const [, params] = useRoute("/reports/:id");
  const reportId = parseInt(params?.id || "0", 10);

  const { data: report, isLoading } = useGetReport(reportId, {
    query: {
      enabled: !!reportId,
      queryKey: getGetReportQueryKey(reportId)
    }
  });

  const downloadReport = useDownloadReport();

  const handleDownload = () => {
    downloadReport.mutate(
      { id: reportId },
      {
        onSuccess: (data) => {
          const blob = new Blob([data.content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${data.company.replace(/\s+/g, '_')}_${data.reportType}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-4 w-20 bg-white/6" />
        <div className="h-12 w-2/3 bg-white/4" />
        <div className="h-64 bg-white/3" />
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-20 text-[#E8E4DC]/35 text-sm">Report not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <Link
        href="/reports"
        className="inline-flex items-center text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 mb-8 transition-colors uppercase tracking-widest"
      >
        <ChevronLeft className="w-3 h-3 mr-1" /> Report Library
      </Link>

      {/* Report header */}
      <div className="border border-white/10 mb-1">
        <div className="px-8 py-8 border-b border-white/8">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 border border-white/12 px-2 py-0.5 inline-block">
                {report.reportType.replace(/_/g, ' ')}
              </div>
              <h1 className="font-serif text-4xl font-light text-[#E8E4DC] leading-tight">
                {report.title}
              </h1>
            </div>
            <button
              onClick={handleDownload}
              className="shrink-0 flex items-center gap-2 border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 hover:border-white/30 transition-colors mt-1"
              data-testid="btn-download-report"
              disabled={downloadReport.isPending}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-white/8 border-b border-white/8">
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Target</p>
            <p className="text-sm text-[#E8E4DC]/75 font-medium">{report.company}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Generated</p>
            <p className="text-sm text-[#E8E4DC]/75">{format(new Date(report.createdAt), "MMM d, yyyy")}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/30 mb-1">Status</p>
            <p className="text-sm text-[#E8E4DC]/75 capitalize">{report.status}</p>
          </div>
        </div>

        {report.summary && (
          <div className="px-8 py-5 border-b border-white/8 border-l-2 border-l-[#E8E4DC]/25">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-2">Executive Summary</p>
            <p className="text-sm text-[#E8E4DC]/65 leading-relaxed font-light">
              {report.summary}
            </p>
          </div>
        )}
      </div>

      {/* Report content — full width editorial */}
      <div className="px-8 pt-10">
        {report.content ? (
          <div className="prose prose-invert max-w-none
            prose-headings:font-serif prose-headings:font-light prose-headings:text-[#E8E4DC]/90 prose-headings:tracking-tight
            prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:border-b prose-h1:border-white/8 prose-h1:pb-4
            prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8
            prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-[#E8E4DC]/75
            prose-p:text-[#E8E4DC]/60 prose-p:leading-relaxed prose-p:text-sm
            prose-strong:text-[#E8E4DC]/80 prose-strong:font-medium
            prose-li:text-[#E8E4DC]/60 prose-li:text-sm prose-li:leading-relaxed
            prose-ul:space-y-1 prose-ol:space-y-1
            prose-blockquote:border-l-[#E8E4DC]/20 prose-blockquote:text-[#E8E4DC]/45
            prose-code:text-[#E8E4DC]/70 prose-code:bg-white/5 prose-code:px-1
          ">
            <ReactMarkdown>{report.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-[#E8E4DC]/30 italic">Content generation failed or is incomplete.</p>
        )}
      </div>
    </div>
  );
}
