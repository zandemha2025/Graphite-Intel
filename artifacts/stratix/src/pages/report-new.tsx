import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateReportBodyReportType } from "@workspace/api-client-react";

const REPORT_TYPE_LABELS: Record<string, string> = {
  market_intelligence: "Market Intelligence",
  competitive_analysis: "Competitive Analysis",
  growth_strategy: "Growth Strategy",
  paid_acquisition: "Paid Acquisition Strategy",
  brand_positioning: "Brand Positioning",
  financial_modeling: "Financial Modeling",
  cultural_intelligence: "Cultural Intelligence",
  full_business_audit: "Full Business Audit",
};

export function ReportNew() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [reportType, setReportType] = useState<string>("market_intelligence");
  const [company, setCompany] = useState("");
  const [context, setContext] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const validTypes = Object.values(CreateReportBodyReportType) as string[];
    if (type && validTypes.includes(type)) {
      setReportType(type);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    setIsGenerating(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, company, additionalContext: context }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to start generation");

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
            toast({ title: "Report generated" });
            setLocation(generatedReportId ? `/reports/${generatedReportId}` : "/reports");
            return;
          } else if (event === "error") {
            throw new Error(data.error || "Generation error");
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div className="border border-white/10">
          <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#E8E4DC]/60 animate-spin" />
                <h2 className="font-serif text-xl font-light text-[#E8E4DC]">Compiling Intelligence</h2>
              </div>
              <p className="text-xs text-[#E8E4DC]/35 mt-1 ml-7">
                {company} — {REPORT_TYPE_LABELS[reportType]}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 border border-white/12 px-2 py-1 animate-pulse">
              Processing
            </span>
          </div>

          <div className="p-8 min-h-[500px] font-mono text-sm leading-relaxed text-[#E8E4DC]/50 bg-[#0A0908]">
            <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/25">
              Initializing McKinsey-grade strategic analysis framework...
            </div>
            <div className="whitespace-pre-wrap text-[#E8E4DC]/65">{streamingContent}</div>
            <span className="inline-block w-1.5 h-4 bg-[#E8E4DC]/40 ml-0.5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8 border-b border-white/8 pb-6">
        <h1 className="font-serif text-5xl font-light text-[#E8E4DC] mb-2">Commission Report</h1>
        <p className="text-sm text-[#E8E4DC]/40">Specify the parameters for the strategic analysis.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Target Entity</label>
          <input
            required
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Acme Corp, Replit, Competitor Inc"
            className="w-full bg-transparent border-b border-white/20 py-3 text-[#E8E4DC] text-base font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/50 transition-colors"
            data-testid="input-company"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Analysis Framework</label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReportType(value)}
                className={`text-left px-3 py-2.5 border text-xs transition-colors ${
                  reportType === value
                    ? "border-[#E8E4DC]/50 bg-white/5 text-[#E8E4DC]"
                    : "border-white/10 text-[#E8E4DC]/40 hover:border-white/20 hover:text-[#E8E4DC]/65"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">
            Additional Context <span className="normal-case tracking-normal text-[#E8E4DC]/25">(optional)</span>
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Specific areas to focus on, questions to answer, or internal context..."
            rows={3}
            className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
            data-testid="input-context"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-[#E8E4DC] text-[#0D0C0B] py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors"
            data-testid="btn-submit-report"
          >
            Commence Analysis
          </button>
        </div>
      </form>
    </div>
  );
}
