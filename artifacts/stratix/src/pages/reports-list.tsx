import { Link } from "wouter";
import { format } from "date-fns";
import {
  useListReports,
  getListReportsQueryKey,
  useDeleteReport
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function ReportsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: reports, isLoading } = useListReports(undefined, {
    query: { queryKey: getListReportsQueryKey() }
  });

  const deleteReport = useDeleteReport();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Delete this report?")) return;

    deleteReport.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
          toast({ title: "Report deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete report", variant: "destructive" });
        }
      }
    );
  };

  const filteredReports = reports?.filter(r =>
    r.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reportType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2" style={{ color: "var(--workspace-fg)" }}>Report Library</h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Intelligence briefings and strategic audits.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5" style={{ color: "var(--workspace-muted)" }} />
            <input
              type="search"
              placeholder="Search reports..."
              className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link
            href="/reports/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium shrink-0 transition-colors"
            style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            data-testid="btn-generate-report"
          >
            <Plus className="h-3.5 w-3.5" />
            Generate
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse" style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }} />
          ))}
        </div>
      ) : filteredReports?.length === 0 ? (
        <div className="py-16 text-center border-dashed" style={{ border: "1px dashed var(--workspace-border)" }}>
          <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--workspace-muted-bg)", border: "1px solid var(--workspace-border)" }}>
            <FileText className="h-6 w-6" style={{ color: "var(--workspace-muted)" }} />
          </div>
          <h3 className="font-sans text-xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>
            {searchTerm ? "No reports match your search" : "No reports yet"}
          </h3>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--workspace-muted)" }}>
            {searchTerm
              ? "Try adjusting your search terms."
              : "Generate competitive intelligence, market analyses, and strategic audits powered by AI."}
          </p>
          {!searchTerm && (
            <Link
              href="/reports/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Your First Report
            </Link>
          )}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--workspace-border)" }}>
          {filteredReports?.map((report, i) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="group flex items-center justify-between px-5 py-4 transition-colors"
              style={{
                borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                background: "#FFFFFF",
              }}
              data-testid={`report-card-${report.id}`}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--workspace-muted-bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
            >
              <div className="flex items-start gap-4 min-w-0">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--workspace-muted)" }} />
                <div className="min-w-0">
                  <p className="font-sans text-base font-light transition-colors" style={{ color: "var(--workspace-fg)" }}>
                    {report.company}
                  </p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                    {report.reportType.replace(/_/g, ' ')}
                  </p>
                  {report.summary && (
                    <p className="text-xs mt-1.5 line-clamp-1 max-w-lg" style={{ color: "var(--workspace-muted)" }}>
                      {report.summary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 ${report.status === 'generating' ? 'animate-pulse' : ''}`}
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: report.status === 'complete' ? "var(--workspace-muted)" : report.status === 'generating' ? "var(--workspace-fg)" : "#dc2626",
                  }}>
                  {report.status}
                </span>
                <button
                  className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--workspace-muted)" }}
                  onClick={(e) => handleDelete(report.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
