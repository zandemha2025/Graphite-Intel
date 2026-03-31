import { useState as useReactState, useEffect as useReactEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreateReportBodyReportType } from "@workspace/api-client-react";

export function ReportNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useReactState(false);
  const [streamingContent, setStreamingContent] = useReactState("");
  const [reportType, setReportType] = useReactState<string>("market_intelligence");
  const [company, setCompany] = useReactState("");
  const [context, setContext] = useReactState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    setIsGenerating(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reportType, 
          company, 
          additionalContext: context 
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let generatedReportId = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        
        for (const chunk of lines) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;
          
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);
          
          if (event === "report_created") {
            generatedReportId = data.id;
          } else if (event === "content") {
            setStreamingContent(prev => prev + data.delta);
          } else if (event === "complete") {
            toast({ title: "Report generated successfully" });
            if (generatedReportId) {
              setLocation(`/reports/${generatedReportId}`);
            } else {
              setLocation("/reports");
            }
            return;
          } else if (event === "error") {
            throw new Error(data.error || "Generation error");
          }
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Generation Failed", 
        description: error.message,
        variant: "destructive" 
      });
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
                Compiling Intelligence...
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Analyzing data for {company} — {reportType.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="px-3 py-1 rounded bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider animate-pulse">
              Processing
            </div>
          </div>
          
          <div className="p-8 min-h-[500px] font-mono text-sm leading-relaxed text-muted-foreground bg-slate-950 dark text-slate-300">
            <div className="mb-4 text-brand">System: Initializing McKinsey-grade strategic analysis framework...</div>
            <div className="whitespace-pre-wrap">{streamingContent}</div>
            <span className="inline-block w-2 h-4 bg-brand ml-1 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8 border-b border-border/50 pb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Commission Report</h1>
        <p className="text-muted-foreground mt-2">Specify the parameters for the strategic analysis.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-xl border border-border/60 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Target Entity</label>
          <Input 
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Acme Corp, Replit, Competitor Inc"
            className="h-12 bg-background border-border/60 focus-visible:ring-brand font-medium text-lg"
            data-testid="input-company"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Analysis Framework</label>
          <Select value={reportType} onValueChange={setReportType} required>
            <SelectTrigger className="h-12 bg-background border-border/60 focus:ring-brand font-medium text-base">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CreateReportBodyReportType).map((type) => (
                <SelectItem key={type} value={type} className="capitalize py-3">
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Strategic Context <span className="text-muted-foreground/50 lowercase normal-case font-normal">(Optional)</span>
          </label>
          <Textarea 
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Specific areas to focus on, questions to answer, or internal context to consider during the audit..."
            className="min-h-[120px] bg-background border-border/60 focus-visible:ring-brand resize-y"
            data-testid="input-context"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <AlertCircle className="w-3 h-3" /> The more context provided, the more tailored the insights.
          </p>
        </div>

        <div className="pt-4 border-t border-border/50">
          <Button 
            type="submit" 
            className="w-full h-12 bg-brand hover:bg-brand/90 text-white font-semibold text-base shadow-[0_0_20px_-5px_rgba(234,88,12,0.4)]"
            data-testid="btn-submit-report"
          >
            <FileText className="w-5 h-5 mr-2" />
            Commence Analysis
          </Button>
        </div>
      </form>
    </div>
  );
}
