import { useState, useEffect, useRef } from "react";
import {
  useGetCurrentAuthUser,
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useSaveCompanyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, RefreshCw, Clock, User } from "lucide-react";

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
  const { data: auth } = useGetCurrentAuthUser();
  const authUser = auth?.user;

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
          <div key={i} className="h-12 animate-pulse" style={{ background: "var(--workspace-muted-bg)" }} />
        ))}
      </div>
    );
  }

  const lastUpdated = profile?.updatedAt ? new Date(profile.updatedAt) : null;

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
      {/* User Profile Section */}
      {authUser && (
        <div className="pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
          <h2 className="font-sans text-2xl font-light mb-4" style={{ color: "var(--workspace-fg)" }}>Your Profile</h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border" style={{ borderColor: "var(--workspace-border)" }}>
              <AvatarImage src={(authUser as any).profileImageUrl || undefined} />
              <AvatarFallback className="text-sm" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-fg)" }}>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium" style={{ color: "var(--workspace-fg)" }}>
                {(authUser as any).firstName
                  ? `${(authUser as any).firstName} ${(authUser as any).lastName || ""}`.trim()
                  : (authUser as any).email || "User"}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                {(authUser as any).email}
              </div>
              {(authUser as any).orgRole && (
                <div className="mt-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5"
                    style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}
                  >
                    {(authUser as any).orgRole}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pb-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-semibold tracking-tight mb-2" style={{ color: "var(--workspace-fg)" }}>Company Profile</h1>
            <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
              This context is injected into every AI conversation and report. Keep it current for the best results.
            </p>
          </div>
          {profile?.companyUrl && (
            <button
              type="button"
              onClick={handleRefreshIntelligence}
              disabled={refreshStatus.active}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
              data-testid="btn-refresh-intelligence"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshStatus.active ? "animate-spin" : ""}`} />
              Refresh Intelligence
            </button>
          )}
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--workspace-muted)" }}>
            <Clock className="h-3 w-3" />
            Last updated {lastUpdated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {refreshStatus.active && refreshStatus.lines.length > 0 && (
        <div className="p-4 space-y-3 animate-in fade-in duration-300" style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}>
          {refreshStatus.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-400">
              <div className="h-px w-4 flex-shrink-0" style={{ background: "var(--workspace-muted)" }} />
              <span className="text-sm font-sans" style={{ color: "var(--workspace-fg)" }}>{line}</span>
            </div>
          ))}
        </div>
      )}

      {profile?.researchSummary && !refreshStatus.active && (
        <div className="p-5" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <p className="text-xs font-medium mb-3" style={{ color: "var(--workspace-muted)" }}>Intelligence Summary</p>
          <p className="text-sm leading-relaxed font-sans" style={{ color: "var(--workspace-fg)" }}>{profile.researchSummary}</p>
          {profile.companyUrl && (
            <p className="text-[10px] mt-3" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>Source: {profile.companyUrl}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full py-2.5 text-base font-sans focus:outline-none transition-colors"
              style={{ background: "transparent", borderBottom: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
              data-testid="input-company-name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>Industry</label>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setIndustry(ind)}
                  className="text-left px-2.5 py-2 text-[10px] transition-colors"
                  style={{
                    border: `1px solid ${industry === ind ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                    background: industry === ind ? "var(--workspace-muted-bg)" : "#FFFFFF",
                    color: industry === ind ? "var(--workspace-fg)" : "var(--workspace-muted)",
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>Stage</label>
            <div className="space-y-1 mt-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors"
                  style={{
                    border: `1px solid ${stage === s ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                    background: stage === s ? "var(--workspace-muted-bg)" : "#FFFFFF",
                    color: stage === s ? "var(--workspace-fg)" : "var(--workspace-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>Annual Revenue</label>
            <div className="space-y-1 mt-2">
              {REVENUE_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRevenueRange(r)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors"
                  style={{
                    border: `1px solid ${revenueRange === r ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                    background: revenueRange === r ? "var(--workspace-muted-bg)" : "#FFFFFF",
                    color: revenueRange === r ? "var(--workspace-fg)" : "var(--workspace-muted)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
              Key Competitors <span className="normal-case tracking-normal opacity-60">(optional)</span>
            </label>
            <textarea
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="List your top 3–5 competitors, separated by commas..."
              rows={2}
              className="w-full p-3 text-sm focus:outline-none transition-colors resize-none"
              style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
              data-testid="input-competitors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
              Strategic Priorities <span className="normal-case tracking-normal opacity-60">(optional)</span>
            </label>
            <textarea
              value={strategicPriorities}
              onChange={(e) => setStrategicPriorities(e.target.value)}
              placeholder="e.g. Expand into APAC markets, reduce CAC, improve NRR above 120%..."
              rows={3}
              className="w-full p-3 text-sm focus:outline-none transition-colors resize-none"
              style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
              data-testid="input-priorities"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--workspace-border)" }}>
          {saved ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--workspace-muted)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </div>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={saveProfile.isPending || !companyName || !industry || !stage || !revenueRange}
            className="px-8 py-2.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            data-testid="btn-save-profile"
          >
            {saveProfile.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
