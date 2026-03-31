import { useRoute } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { 
  useGetReport, 
  getGetReportQueryKey,
  useDownloadReport
} from "@workspace/api-client-react";
import { Download, ChevronLeft, Calendar, Building2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          // Create a blob and download it
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
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-24 bg-muted rounded" />
        <div className="h-16 w-3/4 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-20 text-muted-foreground">Report not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      <Link 
        href="/reports" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Library
      </Link>

      <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm mb-10">
        <div className="p-8 border-b border-border/50 bg-primary text-primary-foreground relative overflow-hidden">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center px-2.5 py-1 rounded bg-white/10 text-white border border-white/20 text-xs font-bold uppercase tracking-widest">
                {report.reportType.replace(/_/g, ' ')}
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                {report.title}
              </h1>
            </div>
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="shrink-0 bg-transparent border-white/30 text-white hover:bg-white text-primary hover:text-primary transition-colors h-12 px-6"
              data-testid="btn-download-report"
              disabled={downloadReport.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Brief
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50 bg-muted/10">
          <div className="p-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target</p>
              <p className="font-medium">{report.company}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generated</p>
              <p className="font-medium">{format(new Date(report.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Target className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{report.status}</p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {report.summary && (
            <div className="mb-12 p-6 bg-brand/5 border-l-4 border-brand rounded-r-lg">
              <h3 className="font-bold text-brand uppercase tracking-wider text-sm mb-2">Executive Summary</h3>
              <p className="text-foreground/80 leading-relaxed font-medium">
                {report.summary}
              </p>
            </div>
          )}

          <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-serif prose-headings:font-bold prose-h2:text-3xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:text-foreground/80">
            {report.content ? (
              <ReactMarkdown>{report.content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">Content generation failed or is incomplete.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
