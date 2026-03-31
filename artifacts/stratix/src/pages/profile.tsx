import { useState, useEffect } from "react";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useSaveCompanyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/4 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
      <div className="border-b border-white/8 pb-6">
        <h1 className="font-serif text-4xl font-light text-[#E8E4DC] mb-2">Company Profile</h1>
        <p className="text-sm text-[#E8E4DC]/45">
          This context is injected into every AI conversation and report. Keep it current for the best results.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company basics */}
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

        {/* Stage & Revenue */}
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

        {/* Strategic context */}
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
