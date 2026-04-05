import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiPost } from "@/lib/api";

const STEPS = ["Name & Objective", "Platforms", "Budget & Schedule", "Targeting & Create"];

const OBJECTIVES = [
  { value: "awareness", label: "Brand Awareness" },
  { value: "traffic", label: "Traffic" },
  { value: "engagement", label: "Engagement" },
  { value: "leads", label: "Lead Generation" },
  { value: "conversions", label: "Conversions" },
  { value: "sales", label: "Sales" },
];

const PLATFORMS = [
  { id: "google", label: "Google Ads" },
  { id: "meta", label: "Meta Ads" },
  { id: "tiktok", label: "TikTok Ads" },
  { id: "linkedin", label: "LinkedIn Ads" },
];

export default function AdsCampaignNewPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [budgetType, setBudgetType] = useState("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [locations, setLocations] = useState("");
  const [interests, setInterests] = useState("");

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const canNext = () => {
    if (step === 0) return name.trim() && objective;
    if (step === 1) return platforms.length > 0;
    if (step === 2) return budget && startDate;
    return true;
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await apiPost("/ads/campaigns", {
        name,
        objective,
        platforms,
        budget: Number(budget),
        budgetType,
        startDate,
        endDate: endDate || undefined,
        targeting: {
          ageMin: Number(ageMin),
          ageMax: Number(ageMax),
          locations: locations.split(",").map((l) => l.trim()).filter(Boolean),
          interests: interests.split(",").map((i) => i.trim()).filter(Boolean),
        },
      });
      toast.success("Campaign created");
      navigate("/ads");
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page
      title="New Campaign"
      subtitle="Create a new advertising campaign"
      actions={
        <Button variant="secondary" onClick={() => navigate("/ads")}>
          Cancel
        </Button>
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                i === step
                  ? "text-[#0A0A0A]"
                  : i < step
                    ? "text-[#0A0A0A] cursor-pointer hover:underline"
                    : "text-[#9CA3AF]"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i === step
                    ? "bg-[#0A0A0A] text-white"
                    : i < step
                      ? "bg-[#ECFDF5] text-[#065F46]"
                      : "bg-[#F3F3F1] text-[#9CA3AF]"
                }`}
              >
                {i < step ? "\u2713" : i + 1}
              </span>
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-[#E5E5E3]" />
            )}
          </div>
        ))}
      </div>

      <Card className="max-w-xl">
        {/* Step 0: Name & Objective */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Campaign Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q2 Brand Awareness" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Objective</label>
              <Select value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Select objective" options={OBJECTIVES} />
            </div>
          </div>
        )}

        {/* Step 1: Platforms */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-[#404040] mb-2">Select one or more platforms to run this campaign on.</p>
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  platforms.includes(p.id)
                    ? "border-[#0A0A0A] bg-[#F6F5F4] text-[#0A0A0A]"
                    : "border-[#E5E5E3] text-[#404040] hover:border-[#C8C8C6]"
                }`}
              >
                {p.label}
                {platforms.includes(p.id) && (
                  <span className="text-[#065F46] text-xs font-semibold">Selected</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Budget & Schedule */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Budget ($)</label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Type</label>
                <Select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "lifetime", label: "Lifetime" },
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">End Date (optional)</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Targeting & Create */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Min Age</label>
                <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Max Age</label>
                <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Locations (comma-separated)</label>
              <Input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="e.g. US, UK, Canada" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-1">Interests (comma-separated)</label>
              <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Technology, Marketing" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-[#E5E5E3]">
          <Button variant="secondary" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/ads"))}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={submitting} disabled={!canNext()}>
              Create Campaign
            </Button>
          )}
        </div>
      </Card>
    </Page>
  );
}
