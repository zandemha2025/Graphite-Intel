import { useState, useEffect, useRef } from "react";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useSaveCompanyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, RefreshCw, Clock } from "lucide-react";

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

type RefreshStatus = {
  active: boolean;
  lines: string[];
};

export function Profile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() }
  });

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [strategicPriorities, setStrategicPriorities] = useState("");
  const [saved, setSaved] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>({ active: false, lines: [] });
  const refreshRunning = useRef(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName);
      setIndustry(profile.industry);
      setStage(profile.stage);
      setRevenueRange(profile.revenueRange);
      setCompetitors(profile.competitors || "");
      setStrategicPriorities(profile.strategicPriorities || "");
    }
  }, [profile]);

  const saveProfile = useSaveCompanyProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile.mutate(
      {
        data: {
          companyName,
          industry,
          stage,
          revenueRange,
          competitors,
          strategicPriorities,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          toast({ title: "Profile updated" });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  };

  const handleRefreshIntelligence = async () => {
    if (!profile?.companyUrl) {
      toast({ title: "No company URL stored. Re-run onboarding to set one.", variant: "destructive" });
      return;
    }
    if (refreshRunning.current) return;
    refreshRunning.current = true;

    setRefreshStatus({ active: true, lines: [] });

    const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

    try {
      const res = await fetch(`${BASE_URL}/api/research/company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: profile.companyUrl }),
      });

      if (!res.ok || !res.body) {
        toast({ title: "Research failed. Please try again.", variant: "destructive" });
        setRefreshStatus({ active: false, lines: [] });
        refreshRunning.current = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
              setRefreshStatus((prev) => ({
                ...prev,
                lines: [...prev.lines, parsed.message],
              }));
            } else if (event === "complete") {
              saveProfile.mutate(
                {
                  data: {
                    companyName: parsed.companyName || companyName,
                    industry: parsed.industry || industry,
                    stage: parsed.stage || stage,
                    revenueRange: parsed.revenueRange || revenueRange,
                    competitors: parsed.competitors || competitors,
                    strategicPriorities: parsed.strategicPriorities || strategicPriorities,
                    companyUrl: profile.companyUrl || undefined,
                    researchSummary: parsed.researchSummary,
                  },
                },
                {
                  onSuccess: (updated) => {
                    queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() });
                    queryClient.setQueryData(getGetCompanyProfileQueryKey(), updated);
                    setRefreshStatus({ active: false, lines: [] });
                    toast({ title: "Intelligence refreshed" });
                    refreshRunning.current = false;
                  },
                  onError: () => {
                    toast({ title: "Failed to save refreshed intelligence", variant: "destructive" });
                    setRefreshStatus({ active: false, lines: [] });
                    refreshRunning.current = false;
                  },
                }
              );
            } else if (event === "error") {
              toast({ title: parsed.error || "Research failed", variant: "destructive" });
              setRefreshStatus({ active: false, lines: [] });
              refreshRunning.current = false;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      toast({ title: "Connection error. Please try again.", variant: "destructive" });
      setRefreshStatus({ active: false, lines: [] });
      refreshRunning.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/4 animate-pulse" />
        ))}
      </div>
    );
  }

  const lastUpdated = profile?.updatedAt ? new Date(profile.updatedAt) : null;

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-white/8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl font-light text-[#E8E4DC] mb-2">Company Profile</h1>
            <p className="text-sm text-[#E8E4DC]/45">
              This context is injected into every AI conversation and report. Keep it current for the best results.
            </p>
          </div>
          {profile?.companyUrl && (
            <button
              type="button"
              onClick={handleRefreshIntelligence}
              disabled={refreshStatus.active}
              className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/60 hover:border-white/30 hover:text-[#E8E4DC]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              data-testid="btn-refresh-intelligence"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshStatus.active ? "animate-spin" : ""}`} />
              Refresh Intelligence
            </button>
          )}
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-[#E8E4DC]/30">
            <Clock className="h-3 w-3" />
            Last updated {lastUpdated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {refreshStatus.active && refreshStatus.lines.length > 0 && (
        <div className="border border-white/8 p-4 bg-white/[0.02] space-y-3 animate-in fade-in duration-300">
          {refreshStatus.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-400">
              <div className="h-px w-4 bg-[#E8E4DC]/30 flex-shrink-0" />
              <span className="text-sm text-[#E8E4DC]/60 font-serif">{line}</span>
            </div>
          ))}
        </div>
      )}

      {profile?.researchSummary && !refreshStatus.active && (
        <div className="border border-white/10 p-5 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-3">Intelligence Summary</p>
          <p className="text-sm text-[#E8E4DC]/70 leading-relaxed font-serif">{profile.researchSummary}</p>
          {profile.companyUrl && (
            <p className="text-[10px] text-[#E8E4DC]/25 mt-3">Source: {profile.companyUrl}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full bg-transparent border-b border-white/20 py-2.5 text-[#E8E4DC] text-base font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/50 transition-colors"
              data-testid="input-company-name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Industry</label>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setIndustry(ind)}
                  className={`text-left px-2.5 py-2 border text-[10px] transition-colors ${
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
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Stage</label>
            <div className="space-y-1 mt-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`w-full text-left px-3 py-2 border text-xs transition-colors ${
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
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Annual Revenue</label>
            <div className="space-y-1 mt-2">
              {REVENUE_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRevenueRange(r)}
                  className={`w-full text-left px-3 py-2 border text-xs transition-colors ${
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

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">
              Key Competitors <span className="normal-case tracking-normal text-[#E8E4DC]/25">(optional)</span>
            </label>
            <textarea
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="List your top 3–5 competitors, separated by commas..."
              rows={2}
              className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
              data-testid="input-competitors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">
              Strategic Priorities <span className="normal-case tracking-normal text-[#E8E4DC]/25">(optional)</span>
            </label>
            <textarea
              value={strategicPriorities}
              onChange={(e) => setStrategicPriorities(e.target.value)}
              placeholder="e.g. Expand into APAC markets, reduce CAC, improve NRR above 120%..."
              rows={3}
              className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
              data-testid="input-priorities"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          {saved ? (
            <div className="flex items-center gap-2 text-xs text-[#E8E4DC]/50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </div>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={saveProfile.isPending || !companyName || !industry || !stage || !revenueRange}
            className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="btn-save-profile"
          >
            {saveProfile.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
