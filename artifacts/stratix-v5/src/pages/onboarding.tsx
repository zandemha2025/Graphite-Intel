import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveCompanyProfile, getGetCompanyProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Globe, ArrowRight, Loader2, Check } from "lucide-react";

type ResearchResult = { companyName: string; industry: string; stage: string; revenueRange: string; competitors: string; strategicPriorities: string; researchSummary: string; followUpQuestions: string[]; };
type Phase = "url-entry" | "researching" | "review" | "manual-entry";

function ProgressStepper({ currentPhase }: { currentPhase: Phase }) {
  const steps = ["Enter URL", "Research", "Review"];
  const stepMap: Record<Phase, number> = { "url-entry": 0, "manual-entry": 0, "researching": 1, "review": 2 };
  const current = stepMap[currentPhase];

  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-body-sm font-medium transition-all ${i <= current ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`text-body-sm transition-all ${i <= current ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"}`}>{step}</span>
          {i < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-1 transition-all ${i < current ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("url-entry");
  const [companyUrl, setCompanyUrl] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState("");
  const saveProfile = useSaveCompanyProfile();

  const isValidDomain = (url: string): boolean => {
    return url.includes(".");
  };

  if (phase === "url-entry") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
        <div className="w-full max-w-lg">
          <ProgressStepper currentPhase={phase} />
          <form onSubmit={(e) => { e.preventDefault(); if (!isValidDomain(companyUrl.trim())) { setUrlError("Please enter a valid domain (e.g., acmecorp.com)"); return; } setPhase("researching"); }} className="text-center">
            <h1 className="font-editorial text-display-lg text-[var(--text-primary)] mb-3">Enter your company's website</h1>
            <p className="text-body text-[var(--text-secondary)] mb-8">We'll research your company and build your intelligence profile automatically.</p>
            <div className="relative mb-2">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
              <input autoFocus type="text" value={companyUrl} onChange={(e) => { setCompanyUrl(e.target.value); setUrlError(""); }} placeholder="acmecorp.com" className="w-full pl-12 pr-4 h-14 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] text-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
            </div>
            {urlError && <p className="text-caption text-red-500 mb-6 text-left">{urlError}</p>}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button type="button" onClick={() => setLocation("/solve")} className="text-body-sm text-[var(--text-muted)] underline">Skip for now</button>
              <button type="submit" disabled={!companyUrl.trim()} className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
                Begin Research <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={() => setPhase("manual-entry")} className="text-body-sm text-[var(--accent)] underline hover:opacity-80">Don't have a website?</button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === "manual-entry") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
        <div className="w-full max-w-lg">
          <ProgressStepper currentPhase={phase} />
          <form onSubmit={(e) => { e.preventDefault(); const companyName = (e.currentTarget.elements.namedItem("companyName") as HTMLInputElement)?.value || ""; const industry = (e.currentTarget.elements.namedItem("industry") as HTMLInputElement)?.value || ""; setResult({ companyName, industry, stage: "", revenueRange: "", competitors: "", strategicPriorities: "", researchSummary: "", followUpQuestions: [] }); setPhase("review"); }} className="text-center">
            <h1 className="font-editorial text-display-lg text-[var(--text-primary)] mb-3">Tell us about your company</h1>
            <p className="text-body text-[var(--text-secondary)] mb-8">We'll skip the research and go straight to your profile setup.</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-caption text-[var(--text-muted)] mb-2 block text-left">Company Name</label>
                <input name="companyName" type="text" placeholder="Acme Corp" required className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
              <div>
                <label className="text-caption text-[var(--text-muted)] mb-2 block text-left">Industry</label>
                <input name="industry" type="text" placeholder="Technology" required className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => setPhase("url-entry")} className="text-body-sm text-[var(--text-muted)] underline">Back</button>
              <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
                Continue to Review <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (phase === "researching") {
    return <ResearchPhase url={companyUrl} onComplete={(r) => { setResult(r); setPhase("review"); }} onError={(err) => { toast({ title: err, variant: "destructive" }); setPhase("url-entry"); }} />;
  }

  if (phase === "review" && result) {
    return <ReviewPhase result={result} onSubmit={async (data) => {
      setIsSubmitting(true);
      saveProfile.mutate(
        { data: { companyName: data.companyName, industry: data.industry, stage: data.stage, revenueRange: data.revenueRange, competitors: data.competitors, strategicPriorities: data.strategicPriorities, companyUrl, researchSummary: data.researchSummary } },
        { onSuccess: async (saved) => { await queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() }); setLocation("/solve"); }, onError: () => { toast({ title: "Failed to save", variant: "destructive" }); setIsSubmitting(false); } }
      );
    }} isSubmitting={isSubmitting} />;
  }

  return null;
}

function ResearchPhase({ url, onComplete, onError }: { url: string; onComplete: (r: ResearchResult) => void; onError: (e: string) => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timeout = setTimeout(() => onError("Research took too long."), 60000);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 20;
      });
    }, 400);

    (async () => {
      try {
        const res = await fetch("/api/research/company", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ url }) });
        if (!res.ok || !res.body) { onError("Research failed."); return; }
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true }); const parts = buffer.split("\n\n"); buffer = parts.pop() || "";
          for (const part of parts) {
            let event = "", data = "";
            for (const line of part.split("\n")) { if (line.startsWith("event: ")) event = line.slice(7).trim(); if (line.startsWith("data: ")) data = line.slice(6).trim(); }
            if (!data) continue;
            try { const p = JSON.parse(data); if (event === "status") { setLines((prev) => prev.includes(p.message) ? prev : [...prev, p.message]); } else if (event === "complete") { clearTimeout(timeout); if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); setProgress(100); onComplete(p); } else if (event === "error") { clearTimeout(timeout); if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); onError(p.error); } } catch {}
          }
        }
      } catch { onError("Connection error."); } finally { clearTimeout(timeout); if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); }
    })();

    return () => {
      clearTimeout(timeout);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [url, onComplete, onError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-lg">
        <ProgressStepper currentPhase="researching" />
        <div className="flex items-center gap-2 mb-6"><Loader2 className="h-5 w-5 text-[var(--accent)] animate-spin" /><span className="text-overline text-[var(--accent)]">Researching</span></div>
        <h1 className="font-editorial text-display-lg text-[var(--text-primary)] mb-8">Building your intelligence profile</h1>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body-sm text-[var(--text-secondary)]">Research Progress</span>
            <span className="text-body-sm font-medium text-[var(--accent)]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="space-y-3">
          {lines.length === 0 && <p className="text-body-sm text-[var(--text-muted)] italic">Initiating research...</p>}
          {lines.map((l, i) => <div key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--accent)]" /><span className="text-body text-[var(--text-secondary)]">{l}</span></div>)}
        </div>
      </div>
    </div>
  );
}

function ReviewPhase({ result, onSubmit, isSubmitting }: { result: ResearchResult; onSubmit: (d: ResearchResult) => void; isSubmitting: boolean }) {
  const [data, setData] = useState(result);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }} className="w-full max-w-2xl space-y-8">
        <div className="w-full">
          <ProgressStepper currentPhase="review" />
        </div>
        <div>
          <span className="text-overline text-[var(--accent)]">Intelligence Profile</span>
          <h1 className="font-editorial text-display-lg text-[var(--text-primary)] mt-2">Here's what we found</h1>
        </div>
        {result.researchSummary && <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5"><p className="text-overline text-[var(--text-muted)] mb-2">Summary</p><p className="text-body text-[var(--text-secondary)] leading-relaxed">{result.researchSummary}</p></div>}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Company</label><input value={data.companyName} onChange={(e) => setData({ ...data, companyName: e.target.value })} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm" /></div>
          <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Industry</label><input value={data.industry} onChange={(e) => setData({ ...data, industry: e.target.value })} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm" /></div>
          <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Stage</label><input value={data.stage} onChange={(e) => setData({ ...data, stage: e.target.value })} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm" /></div>
          <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Revenue</label><input value={data.revenueRange} onChange={(e) => setData({ ...data, revenueRange: e.target.value })} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm" /></div>
        </div>
        <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Competitors</label><textarea value={data.competitors} onChange={(e) => setData({ ...data, competitors: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm resize-none" /></div>
        <div><label className="text-caption text-[var(--text-muted)] mb-1 block">Strategic Priorities</label><textarea value={data.strategicPriorities} onChange={(e) => setData({ ...data, strategicPriorities: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm resize-none" /></div>
        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enter Platform <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
