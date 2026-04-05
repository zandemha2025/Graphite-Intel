import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiDelete } from "@/lib/api";

interface Report {
  id: number;
  title: string;
  company: string;
  reportType: string;
  status: "pending" | "generating" | "complete" | "error";
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

export default function ReportsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: () => api<Report[]>("/reports"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted");
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete report");
    },
  });

  const filtered = (reports ?? []).filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.company.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || r.reportType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <Page
      title="Report Library"
      subtitle="Generate and review intelligence reports"
      actions={
        <Button onClick={() => navigate("/reports/new")}>Generate</Button>
      }
    >
      {/* Search and filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <Input
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="flex h-9 appearance-none rounded-lg border border-[#E5E5E3] bg-white px-3 pr-8 text-sm text-[#0A0A0A] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
        >
          <option value="">All types</option>
          {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <p className="text-sm text-[#9CA3AF] mb-3">
            {reports?.length === 0
              ? "Generate your first intelligence report"
              : "No reports match your filters"}
          </p>
          {reports?.length === 0 && (
            <Button size="sm" onClick={() => navigate("/reports/new")}>
              Generate Report
            </Button>
          )}
        </div>
      )}

      {/* Report grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((report) => (
            <Card
              key={report.id}
              hoverable
              clickable
              onClick={() => navigate(`/reports/${report.id}`)}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-[#0A0A0A] line-clamp-2 flex-1">
                  {report.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(report);
                  }}
                  className="shrink-0 rounded-lg p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                  aria-label="Delete report"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF]">{report.company}</p>
              <div className="flex items-center gap-2 mt-auto">
                <Badge>{REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}</Badge>
                <Badge variant={STATUS_VARIANT[report.status] ?? "default"}>
                  {report.status}
                </Badge>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {format(new Date(report.createdAt), "MMM d, yyyy")}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogTitle>Delete Report</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;?
            This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
