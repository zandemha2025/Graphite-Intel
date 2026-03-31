import { Link } from "wouter";
import { format } from "date-fns";
import { 
  useListReports, 
  getListReportsQueryKey,
  useDeleteReport
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState as useReactState } from "react";

export function ReportsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useReactState("");

  const { data: reports, isLoading } = useListReports({
    query: { queryKey: getListReportsQueryKey() }
  });

  const deleteReport = useDeleteReport();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to report
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    deleteReport.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
          toast({ title: "Report deleted successfully" });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Report Library</h1>
          <p className="text-muted-foreground mt-1">Intelligence briefings and strategic audits.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search reports..." 
              className="pl-9 bg-card border-border/50 focus-visible:ring-brand"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button asChild className="bg-brand hover:bg-brand/90 text-white shrink-0 shadow-sm">
            <Link href="/reports/new" data-testid="btn-generate-report">
              <Plus className="mr-2 h-4 w-4" />
              Generate
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-card border border-border/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredReports?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border/50 border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-xl font-medium mb-2">No intelligence found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {searchTerm ? "No reports match your search criteria." : "You haven't generated any strategic reports yet."}
          </p>
          {!searchTerm && (
            <Button asChild variant="outline" className="border-brand text-brand hover:bg-brand hover:text-white">
              <Link href="/reports/new">Run First Analysis</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports?.map((report) => (
            <Link 
              key={report.id} 
              href={`/reports/${report.id}`}
              className="group block relative bg-card rounded-xl border border-border/60 p-6 hover:shadow-lg hover:border-brand/30 transition-all duration-300"
              data-testid={`report-card-${report.id}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`text-xs px-2.5 py-1 rounded-sm font-semibold uppercase tracking-wider ${
                  report.status === 'complete' ? 'bg-primary text-primary-foreground' :
                  report.status === 'generating' ? 'bg-brand/10 text-brand border border-brand/20 animate-pulse' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  {report.status}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                  onClick={(e) => handleDelete(report.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <h3 className="font-serif text-xl font-semibold leading-tight mb-1 group-hover:text-brand transition-colors">
                {report.company}
              </h3>
              <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                {report.reportType.replace(/_/g, ' ')}
              </p>
              
              <p className="text-sm text-foreground/70 line-clamp-2 mb-6">
                {report.summary || "Comprehensive strategic analysis and insights."}
              </p>
              
              <div className="flex items-center text-xs text-muted-foreground font-medium border-t border-border/50 pt-4">
                Generated {format(new Date(report.createdAt), "MMMM d, yyyy")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
