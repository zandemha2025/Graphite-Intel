import { useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Download,
  FileText,
  Copy,
  Share2,
  Loader2,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";

/* ---------- Types ---------- */

interface ReportDetail {
  id: string;
  title: string;
  type: string;
  status: "ready" | "generating" | "failed";
  depth?: string;
  content?: string;
  createdAt: string;
  sources?: { name: string; url?: string }[];
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Export helpers ---------- */

async function downloadExport(reportId: string, format: "pdf" | "docx") {
  try {
    const res = await fetch(`/api/reports/${reportId}/export?format=${format}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportId}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()} downloaded`);
  } catch {
    toast.error(`Failed to export as ${format.toUpperCase()}`);
  }
}

/* ---------- Main Component ---------- */

export default function ReportViewPage() {
  const [, params] = useRoute("/reports/:id");
  const [, navigate] = useLocation();
  const reportId = params?.id ?? "";
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery<ReportDetail>({
    queryKey: ["report", reportId],
    queryFn: () =>
      api<{ report: ReportDetail }>(`/reports/${reportId}`).then(
        (r) => r.report,
      ),
    enabled: !!reportId,
  });

  // Poll while generating
  useEffect(() => {
    if (report?.status === "generating") {
      pollRef.current = setInterval(() => {
        refetch();
      }, 5000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [report?.status, refetch]);

  const handleCopyMarkdown = useCallback(() => {
    if (report?.content) {
      navigator.clipboard.writeText(report.content);
      toast.success("Markdown copied to clipboard");
    }
  }, [report?.content]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/reports/${reportId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }, [reportId]);

  /* ---------- Loading state ---------- */

  if (isLoading) {
    return (
      <Page title="Report" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  /* ---------- Error state ---------- */

  if (error || !report) {
    return (
      <Page title="Report" subtitle="Not found">
        <Card className="flex flex-col items-center justify-center py-16">
          <XCircle className="mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-[#111827]">
            Report not found
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            This report may have been deleted or does not exist.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/boards")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Boards
          </Button>
        </Card>
      </Page>
    );
  }

  /* ---------- Status badge ---------- */

  function getStatusBadge() {
    if (!report) return null;
    switch (report.status) {
      case "ready":
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        );
      case "generating":
        return (
          <Badge variant="info">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Generating
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
    }
  }

  /* ---------- Render ---------- */

  return (
    <Page
      title={report.title}
      subtitle={report.type}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/boards")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {report.status === "ready" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadExport(reportId, "pdf")}
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadExport(reportId, "docx")}
              >
                <FileText className="h-4 w-4" />
                DOCX
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyMarkdown}
              >
                <Copy className="h-4 w-4" />
                Copy MD
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Meta info */}
      <div className="mb-6 flex items-center gap-3">
        {getStatusBadge()}
        {report.depth && (
          <Badge variant="default" className="capitalize">
            {report.depth}
          </Badge>
        )}
        <span className="text-xs text-[#9CA3AF]">
          Created{" "}
          {new Date(report.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Generating state */}
      {report.status === "generating" && (
        <Card className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#4F46E5]" />
          <p className="text-sm font-medium text-[#111827]">
            Report is being generated...
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            This page will update automatically when the report is ready.
          </p>
        </Card>
      )}

      {/* Failed state */}
      {report.status === "failed" && (
        <Card className="flex flex-col items-center justify-center py-16">
          <XCircle className="mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-[#111827]">
            Report generation failed
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Something went wrong during generation. Please try again.
          </p>
        </Card>
      )}

      {/* Report content */}
      {report.status === "ready" && report.content && (
        <div className="space-y-6">
          <Card className="p-6 lg:p-8">
            <article className="prose prose-sm max-w-none prose-headings:text-[#111827] prose-h1:text-xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-6 prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-5 prose-h3:text-base prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4 prose-p:text-[#374151] prose-p:leading-relaxed prose-li:text-[#374151] prose-strong:text-[#111827] prose-a:text-[#4F46E5] prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:text-[#111827] prose-th:bg-[#F9FAFB] prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-[#E5E7EB] prose-blockquote:border-l-[#4F46E5] prose-blockquote:text-[#6B7280] prose-code:text-[#4F46E5] prose-code:bg-[#F3F4F6] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown>{report.content}</ReactMarkdown>
            </article>
          </Card>

          {/* Sources */}
          {report.sources && report.sources.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-[#111827]">
                Sources ({report.sources.length})
              </h3>
              <div className="space-y-2">
                {report.sources.map((source, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4F46E5] hover:underline truncate"
                      >
                        {source.name}
                      </a>
                    ) : (
                      <span className="text-[#6B7280] truncate">
                        {source.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Ready but no content */}
      {report.status === "ready" && !report.content && (
        <Card className="flex flex-col items-center justify-center py-16">
          <BookOpen className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            No content available
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            This report has no content to display.
          </p>
        </Card>
      )}
    </Page>
  );
}
