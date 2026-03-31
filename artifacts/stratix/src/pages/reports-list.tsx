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

  const { data: reports, isLoading } = useListReports({
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/8 pb-6">
        <div>
          <h1 className="font-serif text-5xl font-light text-[#E8E4DC] mb-2">Report Library</h1>
          <p className="text-sm text-[#E8E4DC]/40">Intelligence briefings and strategic audits.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#E8E4DC]/25" />
            <input
              type="search"
              placeholder="Search reports..."
              className="w-full bg-transparent border border-white/12 pl-9 pr-3 py-2 text-xs text-[#E8E4DC] placeholder:text-[#E8E4DC]/25 focus:outline-none focus:border-white/25 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link
            href="/reports/new"
            className="flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors shrink-0"
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
            <div key={i} className="h-16 border border-white/6 animate-pulse bg-white/2" />
          ))}
        </div>
      ) : filteredReports?.length === 0 ? (
        <div className="border border-dashed border-white/12 py-16 text-center">
          <FileText className="h-6 w-6 mx-auto mb-4 text-[#E8E4DC]/20" />
          <h3 className="font-serif text-xl font-light text-[#E8E4DC]/60 mb-2">No intelligence found</h3>
          <p className="text-sm text-[#E8E4DC]/30 mb-6">
            {searchTerm ? "No reports match your search." : "You haven't generated any reports yet."}
          </p>
          {!searchTerm && (
            <Link
              href="/reports/new"
              className="inline-block text-xs uppercase tracking-widest text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 border-b border-white/15 pb-0.5 transition-colors"
            >
              Commission First Report
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/6 border border-white/10">
          {filteredReports?.map((report) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="group flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
              data-testid={`report-card-${report.id}`}
            >
              <div className="flex items-start gap-4 min-w-0">
                <FileText className="h-4 w-4 text-[#E8E4DC]/20 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-serif text-base font-light text-[#E8E4DC]/85 group-hover:text-[#E8E4DC] transition-colors">
                    {report.company}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/35 mt-0.5">
                    {report.reportType.replace(/_/g, ' ')}
                  </p>
                  {report.summary && (
                    <p className="text-xs text-[#E8E4DC]/35 mt-1.5 line-clamp-1 max-w-lg">
                      {report.summary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <span className="text-[10px] text-[#E8E4DC]/30">
                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                </span>
                <span className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 ${
                  report.status === 'complete'
                    ? 'border-white/12 text-[#E8E4DC]/40'
                    : report.status === 'generating'
                    ? 'border-white/20 text-[#E8E4DC]/60 animate-pulse'
                    : 'border-red-800/40 text-red-400/60'
                }`}>
                  {report.status}
                </span>
                <button
                  className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#E8E4DC]/25 hover:text-[#E8E4DC]/60 transition-opacity"
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
