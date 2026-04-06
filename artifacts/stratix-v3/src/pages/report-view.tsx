import { useEffect, useCallback, useRef, useState, useMemo } from "react";
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
  List,
  ChevronRight,
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

/* ---------- TOC helpers ---------- */

interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

function parseToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const m2 = line.match(/^##\s+(.+)/);
    if (m2) {
      const text = m2[1].replace(/[*_`]/g, "").trim();
      entries.push({ id: slugify(text), text, level: 2 });
      continue;
    }
    const m3 = line.match(/^###\s+(.+)/);
    if (m3) {
      const text = m3[1].replace(/[*_`]/g, "").trim();
      entries.push({ id: slugify(text), text, level: 3 });
    }
  }
  return entries;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function TableOfContents({
  entries,
  activeId,
  onSelect,
}: {
  entries: TocEntry[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="sticky top-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] hover:text-[#6B7280]"
      >
        <List className="h-3.5 w-3.5" />
        Contents
        <ChevronRight
          className={`h-3 w-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
      </button>
      {!collapsed && (
        <nav className="space-y-0.5">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className={`block w-full truncate rounded-md px-2 py-1 text-left text-xs transition-colors ${
                entry.level === 3 ? "pl-5" : ""
              } ${
                activeId === entry.id
                  ? "bg-[#EEF2FF] font-medium text-[#4F46E5]"
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
              }`}
            >
              {entry.text}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ---------- Markdown with heading IDs ---------- */

function MarkdownWithIds({ content }: { content: string }) {
  // Add id anchors to h2/h3 headings by preprocessing the markdown
  // We render via ReactMarkdown with custom components
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => {
          const text = extractText(children);
          return (
            <h1 id={slugify(text)} className="scroll-mt-6">
              {children}
            </h1>
          );
        },
        h2: ({ children }) => {
          const text = extractText(children);
          return (
            <h2 id={slugify(text)} className="scroll-mt-6">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const text = extractText(children);
          return (
            <h3 id={slugify(text)} className="scroll-mt-6">
              {children}
            </h3>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children: React.ReactNode } }).props.children);
  }
  return String(children ?? "");
}

/* ---------- Main Component ---------- */

export default function ReportViewPage() {
  const [, params] = useRoute("/reports/:id");
  const [, navigate] = useLocation();
  const reportId = params?.id ?? "";
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeTocId, setActiveTocId] = useState("");

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

  // Parse TOC entries from report content
  const tocEntries = useMemo(
    () => (report?.content ? parseToc(report.content) : []),
    [report?.content],
  );

  // Scroll observer for active TOC heading
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current || tocEntries.length === 0) return;

    const headings = contentRef.current.querySelectorAll("h2[id], h3[id]");
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocEntries]);

  const handleTocSelect = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTocId(id);
    }
  }, []);

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
          <div className={`flex gap-6 ${tocEntries.length > 0 ? "" : ""}`}>
            {/* Main content */}
            <Card className="min-w-0 flex-1 p-6 lg:p-8">
              <article ref={contentRef} className="prose-narrative max-w-none">
                <MarkdownWithIds content={report.content} />
              </article>
            </Card>

            {/* Table of contents sidebar */}
            {tocEntries.length > 3 && (
              <div className="hidden w-56 shrink-0 lg:block">
                <TableOfContents
                  entries={tocEntries}
                  activeId={activeTocId}
                  onSelect={handleTocSelect}
                />
              </div>
            )}
          </div>

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
