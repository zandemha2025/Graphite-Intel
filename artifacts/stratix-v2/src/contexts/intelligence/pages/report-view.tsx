import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface Report {
  id: number;
  title: string;
  company: string;
  reportType: string;
  status: "pending" | "generating" | "complete" | "error";
  content: string;
  createdAt: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  market_intelligence: "Market Intelligence",
  competitive_analysis: "Competitive Analysis",
  growth_strategy: "Growth Strategy",
  paid_acquisition: "Paid Acquisition",
  brand_positioning: "Brand Positioning",
  financial_modeling: "Financial Modeling",
  cultural_intelligence: "Cultural Intelligence",
  full_business_audit: "Full Business Audit",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "default",
  generating: "info",
  complete: "success",
  error: "error",
};

async function downloadBlob(url: string, filename: string) {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  } catch {
    toast.error("Export failed. Please try again.");
  }
}

export default function ReportViewPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/reports/:id");
  const reportId = params?.id;

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: ["reports", reportId],
    queryFn: () => api<Report>(`/reports/${reportId}`),
    enabled: !!reportId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "generating" || status === "pending" ? 3000 : false;
    },
  });

  const isComplete = report?.status === "complete";

  return (
    <Page
      title={report?.title ?? "Report"}
      subtitle={report?.company}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate("/reports")}>
            Back
          </Button>
          {isComplete && (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadBlob(
                    `/api/reports/${reportId}/export?format=pdf`,
                    `${report.title}.pdf`
                  )
                }
              >
                Export PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadBlob(
                    `/api/reports/${reportId}/export?format=docx`,
                    `${report.title}.docx`
                  )
                }
              >
                Export DOCX
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadBlob(
                    `/api/reports/${reportId}/download`,
                    `${report.title}.md`
                  )
                }
              >
                Download MD
              </Button>
            </>
          )}
        </div>
      }
    >
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {!isLoading && !report && (
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <p className="text-sm text-[#9CA3AF]">Report not found</p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Meta row */}
          <div className="flex items-center gap-3">
            <Badge>
              {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
            </Badge>
            <Badge variant={STATUS_VARIANT[report.status] ?? "default"}>
              {report.status}
            </Badge>
            <span className="text-xs text-[#9CA3AF]">
              {format(new Date(report.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          {/* Generating indicator */}
          {(report.status === "generating" || report.status === "pending") && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
              <div className="h-2 w-2 rounded-full bg-[#1E40AF] animate-pulse" />
              <p className="text-sm text-[#1E40AF]">
                {report.status === "pending"
                  ? "Report is queued for generation..."
                  : "Report is being generated..."}
              </p>
            </div>
          )}

          {/* Error state */}
          {report.status === "error" && (
            <div className="px-4 py-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-sm text-[#991B1B]">
                Report generation failed. Please try creating a new report.
              </p>
            </div>
          )}

          {/* Report content */}
          {report.content && (
            <Card>
              <div className="prose prose-sm max-w-none text-[#0A0A0A]">
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </div>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}
