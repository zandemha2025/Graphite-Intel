import { useState } from "react";
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

export function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [strategicPriorities, setStrategicPriorities] = useState("");

  const saveProfile = useSaveCompanyProfile();

  const handleSubmit = async (e: React.FormEvent) => {
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
        onSuccess: async (data) => {
          await queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() });
          queryClient.setQueryData(getGetCompanyProfileQueryKey(), data);
          setLocation("/dashboard");
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
        },
      }
    );
  };

  const steps = [
    {
      id: 0,
      title: "Your company",
      subtitle: "Tell us who we're working with.",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Company Name</label>
            <input
              autoFocus
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-transparent border-b border-white/20 py-3 text-[#E8E4DC] text-lg font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/60 transition-colors"
              data-testid="input-company-name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Industry</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => setIndustry(ind)}
                  className={`text-left px-3 py-2.5 border text-xs transition-colors ${
                    industry === ind
                      ? "border-[#E8E4DC]/60 bg-white/6 text-[#E8E4DC]"
                      : "border-white/12 text-[#E8E4DC]/45 hover:border-white/25 hover:text-[#E8E4DC]/70"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      isValid: () => companyName.trim().length > 0 && industry.length > 0,
    },
    {
      id: 1,
      title: "Company stage",
      subtitle: "Where are you in your growth journey?",
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Stage</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`text-left px-3 py-2.5 border text-xs transition-colors ${
                    stage === s
                      ? "border-[#E8E4DC]/60 bg-white/6 text-[#E8E4DC]"
                      : "border-white/12 text-[#E8E4DC]/45 hover:border-white/25 hover:text-[#E8E4DC]/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Annual Revenue</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {REVENUE_RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRevenueRange(r)}
                  className={`text-left px-3 py-2.5 border text-xs transition-colors ${
                    revenueRange === r
                      ? "border-[#E8E4DC]/60 bg-white/6 text-[#E8E4DC]"
                      : "border-white/12 text-[#E8E4DC]/45 hover:border-white/25 hover:text-[#E8E4DC]/70"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      isValid: () => stage.length > 0 && revenueRange.length > 0,
    },
    {
      id: 2,
      title: "Strategic context",
      subtitle: "Help the AI understand your competitive landscape.",
      content: (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">
              Key Competitors <span className="normal-case tracking-normal text-[#E8E4DC]/25">(optional)</span>
            </label>
            <textarea
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="List your top 3–5 competitors, separated by commas..."
              rows={3}
              className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
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
              rows={4}
              className="w-full bg-transparent border border-white/12 p-3 text-[#E8E4DC] text-sm placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
              data-testid="input-priorities"
            />
          </div>
        </div>
      ),
      isValid: () => true,
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 border border-[#E8E4DC]/30 flex items-center justify-center">
            <span className="font-serif font-semibold text-[#E8E4DC] text-xs leading-none">S</span>
          </div>
          <span className="font-serif font-medium text-base uppercase tracking-tight text-[#E8E4DC]">Stratix</span>
        </div>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-0.5 w-8 transition-colors ${i <= step ? "bg-[#E8E4DC]/60" : "bg-white/12"}`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-lg">
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">
              Step {step + 1} of {steps.length}
            </p>
            <h1 className="font-serif text-4xl font-light text-[#E8E4DC] mb-2">{currentStep.title}</h1>
            <p className="text-sm text-[#E8E4DC]/45">{currentStep.subtitle}</p>
          </div>

          <div className="mb-10">
            {currentStep.content}
          </div>

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="text-xs uppercase tracking-widest text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                type="submit"
                disabled={saveProfile.isPending}
                className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-50"
                data-testid="btn-save-profile"
              >
                {saveProfile.isPending ? "Saving..." : "Enter Platform"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!currentStep.isValid()}
                className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="btn-next-step"
              >
                Continue
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
