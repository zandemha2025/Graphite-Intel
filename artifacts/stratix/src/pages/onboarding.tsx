import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveCompanyProfile, getGetCompanyProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Public", "Enterprise"];
const REVENUE_RANGES = ["Pre-revenue", "<$1M", "$1M–$10M", "$10M–$50M", "$50M–$200M", "$200M–$1B", "$1B+"];
const INDUSTRIES = [
  "Technology / SaaS",
  "Fintech / Financial Services",
  "Healthcare / Biotech",
  "Consumer / Retail",
  "Media / Entertainment",
  "Enterprise Software",
  "E-commerce",
  "Real Estate",
  "Manufacturing / Industrial",
  "Professional Services",
  "Education",
  "Other",
];

type ResearchResult = {
  companyName: string;
  industry: string;
  stage: string;
  revenueRange: string;
  competitors: string;
  strategicPriorities: string;
  researchSummary: string;
  followUpQuestions: string[];
};

type Phase = "url-entry" | "researching" | "review";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-6 w-6 border border-[#E8E4DC]/30 flex items-center justify-center">
        <span className="font-serif font-semibold text-[#E8E4DC] text-xs leading-none">S</span>
      </div>
      <span className="font-serif font-medium text-base uppercase tracking-tight text-[#E8E4DC]">Stratix</span>
    </div>
  );
}

function UrlEntryPhase({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      <header className="px-8 py-5 flex items-center border-b border-white/8">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-4">Intelligence Setup</p>
            <h1 className="font-serif text-5xl font-light text-[#E8E4DC] mb-4 leading-tight">
              Enter your company's website.
            </h1>
            <p className="text-sm text-[#E8E4DC]/45 leading-relaxed">
              We'll research your company, map your competitive landscape, and build your intelligence profile automatically.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Company Website</label>
              <input
                autoFocus
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. acmecorp.com"
                className="w-full bg-transparent border-b border-white/20 py-3 text-[#E8E4DC] text-xl font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/60 transition-colors"
                data-testid="input-company-url"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!url.trim()}
                className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="btn-start-research"
              >
                Begin Research
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

type StatusLine = {
  message: string;
  visible: boolean;
};

function ResearchingPhase({ url, onComplete, onError }: {
  url: string;
  onComplete: (result: ResearchResult) => void;
  onError: (err: string) => void;
}) {
  const [statusLines, setStatusLines] = useState<StatusLine[]>([]);
  const startedRef = useRef(false);
  const receivedCompleteRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
    const timeoutId = setTimeout(() => {
      if (!receivedCompleteRef.current) {
        onError("Research took too long. Please try again.");
      }
    }, 60000);

    const run = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/research/company`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url }),
        });

        if (!res.ok || !res.body) {
          onError("Research failed. Please try again.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Stream ended without receiving complete event
              if (!receivedCompleteRef.current) {
                onError("Research pipeline failed. Please try again...");
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";

            for (const part of parts) {
              const lines = part.split("\n");
              let event = "";
              let data = "";

              for (const line of lines) {
                if (line.startsWith("event: ")) event = line.slice(7).trim();
                if (line.startsWith("data: ")) data = line.slice(6).trim();
              }

              if (!data) continue;

              try {
                const parsed = JSON.parse(data);

                if (event === "status") {
                  setStatusLines((prev) => {
                    const exists = prev.find((s) => s.message === parsed.message);
                    if (exists) return prev;
                    return [...prev, { message: parsed.message, visible: true }];
                  });
                } else if (event === "complete") {
                  receivedCompleteRef.current = true;
                  clearTimeout(timeoutId);
                  onComplete(parsed as ResearchResult);
                } else if (event === "error") {
                  receivedCompleteRef.current = true;
                  clearTimeout(timeoutId);
                  onError(parsed.error || "Research failed");
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } catch (streamErr) {
          if (!receivedCompleteRef.current) {
            onError("Stream interrupted. Please try again.");
          }
        }
      } catch {
        onError("Connection error. Please try again.");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    run();
  }, [url, onComplete, onError]);

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      <header className="px-8 py-5 flex items-center border-b border-white/8">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-lg">
          <div className="mb-12">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-4">Researching</p>
            <h1 className="font-serif text-4xl font-light text-[#E8E4DC] leading-tight">
              Building your intelligence profile.
            </h1>
          </div>

          <div className="space-y-5">
            {statusLines.length === 0 && (
              <div className="flex items-center gap-3">
                <div className="h-px w-4 bg-[#E8E4DC]/20 animate-pulse" />
                <span className="text-sm text-[#E8E4DC]/30 italic">Initiating research...</span>
              </div>
            )}
            {statusLines.map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-px w-6 bg-[#E8E4DC]/40 flex-shrink-0" />
                <span className="text-base text-[#E8E4DC]/80 font-serif">{line.message}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ReviewPhase({ url, result, onSubmit, isSubmitting }: {
  url: string;
  result: ResearchResult;
  onSubmit: (data: ResearchResult & { followUpAnswers: Record<number, string> }) => void;
  isSubmitting: boolean;
}) {
  const [companyName, setCompanyName] = useState(result.companyName);
  const [industry, setIndustry] = useState(result.industry);
  const [stage, setStage] = useState(result.stage);
  const [revenueRange, setRevenueRange] = useState(result.revenueRange);
  const [competitors, setCompetitors] = useState(result.competitors);
  const [strategicPriorities, setStrategicPriorities] = useState(result.strategicPriorities);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<number, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      companyName,
      industry,
      stage,
      revenueRange,
      competitors,
      strategicPriorities,
      researchSummary: result.researchSummary,
      followUpQuestions: result.followUpQuestions,
      followUpAnswers,
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      <header className="px-8 py-5 flex items-center border-b border-white/8">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-10 animate-in fade-in duration-500">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-4">Intelligence Profile</p>
            <h1 className="font-serif text-4xl font-light text-[#E8E4DC] mb-3">
              Here's what we found.
            </h1>
            <p className="text-sm text-[#E8E4DC]/45 leading-relaxed">
              Review and edit any details, then answer a few questions we couldn't answer automatically.
            </p>
          </div>

          {result.researchSummary && (
            <div className="border border-white/10 p-5 bg-white/[0.02]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-3">Intelligence Summary</p>
              <p className="text-sm text-[#E8E4DC]/70 leading-relaxed font-serif">{result.researchSummary}</p>
            </div>
          )}

          <div className="space-y-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35">Extracted Profile</p>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-transparent border-b border-white/20 py-2.5 text-[#E8E4DC] text-base font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/50 transition-colors"
                data-testid="input-company-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">Industry</label>
                <div className="space-y-1 mt-1">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => setIndustry(ind)}
                      className={`w-full text-left px-3 py-1.5 border text-[10px] transition-colors ${
                        industry === ind
                          ? "border-[#E8E4DC]/50 bg-white/5 text-[#E8E4DC]"
                          : "border-white/10 text-[#E8E4DC]/40 hover:border-white/20 hover:text-[#E8E4DC]/60"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">Stage</label>
                  <div className="space-y-1 mt-1">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStage(s)}
                        className={`w-full text-left px-3 py-1.5 border text-[10px] transition-colors ${
                          stage === s
                            ? "border-[#E8E4DC]/50 bg-white/5 text-[#E8E4DC]"
                            : "border-white/10 text-[#E8E4DC]/40 hover:border-white/20 hover:text-[#E8E4DC]/60"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">Revenue Range</label>
                  <div className="space-y-1 mt-1">
                    {REVENUE_RANGES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRevenueRange(r)}
                        className={`w-full text-left px-3 py-1.5 border text-[10px] transition-colors ${
                          revenueRange === r
                            ? "border-[#E8E4DC]/50 bg-white/5 text-[#E8E4DC]"
                            : "border-white/10 text-[#E8E4DC]/40 hover:border-white/20 hover:text-[#E8E4DC]/60"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">
                Key Competitors <span className="normal-case tracking-normal text-[#E8E4DC]/25">(AI-identified)</span>
              </label>
              <textarea
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                rows={2}
                className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
                data-testid="input-competitors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/40">
                Strategic Priorities <span className="normal-case tracking-normal text-[#E8E4DC]/25">(AI-identified)</span>
              </label>
              <textarea
                value={strategicPriorities}
                onChange={(e) => setStrategicPriorities(e.target.value)}
                rows={3}
                className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
                data-testid="input-priorities"
              />
            </div>
          </div>

          {result.followUpQuestions && result.followUpQuestions.length > 0 && (
            <div className="space-y-5 border-t border-white/8 pt-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-1">A few questions</p>
                <p className="text-xs text-[#E8E4DC]/40">Things we couldn't determine automatically. Answer what you can — these sharpen the AI's advice.</p>
              </div>
              {result.followUpQuestions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <label className="text-sm text-[#E8E4DC]/70 leading-relaxed">{q}</label>
                  <textarea
                    value={followUpAnswers[i] || ""}
                    onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                    placeholder="Optional..."
                    rows={2}
                    className="w-full bg-transparent border border-white/10 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-white/8">
            <button
              type="submit"
              disabled={isSubmitting || !companyName || !industry || !stage || !revenueRange}
              className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="btn-enter-platform"
            >
              {isSubmitting ? "Saving..." : "Enter Platform"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("url-entry");
  const [companyUrl, setCompanyUrl] = useState("");
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveProfile = useSaveCompanyProfile();

  const handleUrlSubmit = (url: string) => {
    setCompanyUrl(url);
    setPhase("researching");
  };

  const handleResearchComplete = (result: ResearchResult) => {
    setResearchResult(result);
    setPhase("review");
  };

  const handleResearchError = (err: string) => {
    toast({ title: err, variant: "destructive" });
    setPhase("url-entry");
  };

  const handleReviewSubmit = async (data: ResearchResult & { followUpAnswers: Record<number, string> }) => {
    setIsSubmitting(true);

    const answeredQuestions = data.followUpQuestions
      .map((q, i) => data.followUpAnswers[i] ? `Q: ${q}\nA: ${data.followUpAnswers[i]}` : null)
      .filter(Boolean)
      .join("\n\n");

    const enrichedSummary = answeredQuestions
      ? `${data.researchSummary}\n\nAdditional context from founder:\n${answeredQuestions}`
      : data.researchSummary;

    saveProfile.mutate(
      {
        data: {
          companyName: data.companyName,
          industry: data.industry,
          stage: data.stage,
          revenueRange: data.revenueRange,
          competitors: data.competitors,
          strategicPriorities: data.strategicPriorities,
          companyUrl,
          researchSummary: enrichedSummary,
        },
      },
      {
        onSuccess: async (savedData) => {
          await queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() });
          queryClient.setQueryData(getGetCompanyProfileQueryKey(), savedData);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
          setIsSubmitting(false);
        },
      }
    );
  };

  if (phase === "url-entry") {
    return <UrlEntryPhase onSubmit={handleUrlSubmit} />;
  }

  if (phase === "researching") {
    return (
      <ResearchingPhase
        url={companyUrl}
        onComplete={handleResearchComplete}
        onError={handleResearchError}
      />
    );
  }

  if (phase === "review" && researchResult) {
    return (
      <ReviewPhase
        url={companyUrl}
        result={researchResult}
        onSubmit={handleReviewSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  return null;
}
