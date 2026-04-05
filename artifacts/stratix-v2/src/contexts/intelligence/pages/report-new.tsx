import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REPORT_TYPES = [
  { value: "market_intelligence", label: "Market Intelligence", description: "Market size, trends, and dynamics" },
  { value: "competitive_analysis", label: "Competitive Analysis", description: "Competitor landscape and positioning" },
  { value: "growth_strategy", label: "Growth Strategy", description: "Growth opportunities and roadmap" },
  { value: "paid_acquisition", label: "Paid Acquisition", description: "Paid channel strategy and optimization" },
  { value: "brand_positioning", label: "Brand Positioning", description: "Brand identity and market perception" },
  { value: "financial_modeling", label: "Financial Modeling", description: "Revenue projections and unit economics" },
  { value: "cultural_intelligence", label: "Cultural Intelligence", description: "Cultural trends and consumer behavior" },
  { value: "full_business_audit", label: "Full Business Audit", description: "Comprehensive business assessment" },
] as const;

export default function ReportNewPage() {
  const [, navigate] = useLocation();
  const [company, setCompany] = useState("");
  const [reportType, setReportType] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const canGenerate = company.trim() && reportType && !streaming;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setStreaming(true);
    setStreamContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    let reportId: number | null = null;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          company: company.trim(),
          additionalContext: additionalContext.trim() || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed with status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === "report_created" && event.id) {
              reportId = event.id;
            } else if (event.type === "content" && event.delta) {
              setStreamContent((prev) => prev + event.delta);
            } else if (event.type === "complete") {
              if (reportId) {
                toast.success("Report generated successfully");
                navigate(`/reports/${reportId}`);
                return;
              }
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Generation failed");
            }
          } catch (parseErr) {
            // Skip malformed SSE lines
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      // Stream ended without complete event
      if (reportId) {
        navigate(`/reports/${reportId}`);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error((err as Error).message || "Failed to generate report");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [canGenerate, company, reportType, additionalContext, navigate]);

  return (
    <Page
      title="Generate Report"
      subtitle="Create a new intelligence report"
      actions={
        <Button
          variant="secondary"
          onClick={() => {
            abortRef.current?.abort();
            navigate("/reports");
          }}
        >
          Cancel
        </Button>
      }
    >
      {!streaming ? (
        <div className="max-w-2xl space-y-6">
          {/* Company input */}
          <div className="space-y-1.5">
            <label htmlFor="company" className="text-sm font-medium text-[#0A0A0A]">
              Company Name
            </label>
            <Input
              id="company"
              placeholder="e.g. Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Report type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0A0A0A]">Report Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_TYPES.map((type) => (
                <Card
                  key={type.value}
                  clickable
                  hoverable
                  onClick={() => setReportType(type.value)}
                  className={
                    reportType === type.value
                      ? "border-[#0A0A0A] ring-1 ring-[#0A0A0A]"
                      : ""
                  }
                >
                  <p className="text-sm font-medium text-[#0A0A0A]">{type.label}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{type.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional context */}
          <div className="space-y-1.5">
            <label htmlFor="context" className="text-sm font-medium text-[#0A0A0A]">
              Additional Context
              <span className="text-[#9CA3AF] font-normal ml-1">(optional)</span>
            </label>
            <textarea
              id="context"
              rows={4}
              placeholder="Any specific areas of focus, recent events, or context for the analysis..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] resize-none"
            />
          </div>

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={!canGenerate} size="lg">
            Generate Report
          </Button>
        </div>
      ) : (
        /* Streaming output */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#1E40AF] animate-pulse" />
            <p className="text-sm text-[#404040]">Generating report for {company}...</p>
          </div>
          <Card className="min-h-[300px]">
            <div className="prose prose-sm max-w-none text-[#0A0A0A]">
              <ReactMarkdown>{streamContent || "Initializing..."}</ReactMarkdown>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
