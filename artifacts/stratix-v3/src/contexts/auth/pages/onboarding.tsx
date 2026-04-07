import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const USE_CASES = [
  "Competitive Intelligence",
  "Market Research",
  "Strategic Planning",
  "Due Diligence",
  "Sales Intelligence",
  "Risk Analysis",
];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(item: string) {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item],
    );
  }

  async function handleFinish() {
    setLoading(true);
    try {
      await apiPost("/onboarding/complete", { useCases: selected });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch { /* continue regardless */ }
    navigate("/explore");
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white text-sm font-bold shadow-sm">
            S
          </div>
        </div>

        <p className="text-center text-sm text-[#A3A3A3] mb-6">Step 3 of 3</p>

        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-7">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1.5">
            What will you use Stratix for?
          </h2>
          <p className="text-sm text-[#525252] mb-6 leading-relaxed">
            Select all that apply. This helps us personalize your experience.
          </p>

          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {USE_CASES.map((uc) => {
              const active = selected.includes(uc);
              return (
                <button
                  key={uc}
                  onClick={() => toggle(uc)}
                  className={`flex items-center gap-2 px-3.5 py-3 rounded-xl border text-sm text-left transition-all ${
                    active
                      ? "border-[#1A1A1A] bg-[#F5F5F4] text-[#1A1A1A] font-medium"
                      : "border-[#E5E5E3] text-[#525252] hover:border-[#C4C4C2] hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    active ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-[#D4D4D4]"
                  }`}>
                    {active && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {uc}
                </button>
              );
            })}
          </div>

          <Button onClick={handleFinish} className="w-full" size="lg" loading={loading}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}
