/**
 * New Campaign Builder — Step-by-step campaign creation with AI assistance.
 */
import { useState } from "react";
import { useLocation } from "wouter";

const objectives = [
  { value: "awareness", label: "Brand Awareness", desc: "Reach people likely to remember your brand" },
  { value: "traffic", label: "Traffic", desc: "Drive visitors to your website or landing page" },
  { value: "engagement", label: "Engagement", desc: "Get more likes, comments, and shares" },
  { value: "leads", label: "Lead Generation", desc: "Collect leads through forms and sign-ups" },
  { value: "conversions", label: "Conversions", desc: "Drive valuable actions on your website" },
  { value: "sales", label: "Sales", desc: "Maximize revenue from product purchases" },
];

const platforms = [
  { value: "google_ads", label: "Google Ads" },
  { value: "meta", label: "Meta (Facebook/Instagram)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
];

export function AdsCampaignNew() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("awareness");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [budgetDaily, setBudgetDaily] = useState("");
  const [budgetTotal, setBudgetTotal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [locations, setLocations] = useState("");
  const [keywords, setKeywords] = useState("");
  const [interests, setInterests] = useState("");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function createCampaign() {
    setSaving(true);
    try {
      const targeting: Record<string, unknown> = {};
      if (locations.trim()) targeting.locations = locations.split(",").map((s) => s.trim());
      if (keywords.trim()) targeting.keywords = keywords.split(",").map((s) => s.trim());
      if (interests.trim()) targeting.interests = interests.split(",").map((s) => s.trim());
      targeting.ageRange = { min: parseInt(ageMin), max: parseInt(ageMax) };

      const res = await fetch("/api/ads/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          objective,
          platforms: selectedPlatforms,
          budgetDaily: budgetDaily || null,
          budgetTotal: budgetTotal || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targeting: Object.keys(targeting).length > 0 ? targeting : null,
        }),
      });

      if (res.ok) {
        const campaign = await res.json();
        setLocation(`/ads/campaigns/${campaign.id}`);
      }
    } catch (err) {
      console.error("Failed to create campaign", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <button
          onClick={() => setLocation("/ads")}
          className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/60 mb-2 block"
        >
          &larr; Back to Ads
        </button>
        <h1 className="text-2xl font-semibold text-[#E8E4DC]">New Campaign</h1>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 transition ${s <= step ? "bg-[#C9A55A]" : "bg-[#E8E4DC]/10"}`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Name & Objective */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-2">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q2 Product Launch"
              className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-3">Objective</label>
            <div className="grid grid-cols-2 gap-3">
              {objectives.map((obj) => (
                <button
                  key={obj.value}
                  onClick={() => setObjective(obj.value)}
                  className={`p-4 border text-left transition ${
                    objective === obj.value
                      ? "border-[#C9A55A]/60 bg-[#C9A55A]/5"
                      : "border-[#E8E4DC]/10 hover:border-[#E8E4DC]/30"
                  }`}
                >
                  <div className="text-sm font-medium text-[#E8E4DC]">{obj.label}</div>
                  <div className="text-xs text-[#E8E4DC]/40 mt-1">{obj.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="px-6 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Platforms */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-3">Target Platforms</label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`p-4 border text-left transition ${
                    selectedPlatforms.includes(p.value)
                      ? "border-[#C9A55A]/60 bg-[#C9A55A]/5"
                      : "border-[#E8E4DC]/10 hover:border-[#E8E4DC]/30"
                  }`}
                >
                  <div className="text-sm font-medium text-[#E8E4DC]">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border border-[#E8E4DC]/20 text-[#E8E4DC]/60 text-sm hover:border-[#E8E4DC]/40 transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={selectedPlatforms.length === 0}
              className="px-6 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Budget & Schedule */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">Daily Budget (USD)</label>
              <input
                type="number"
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(e.target.value)}
                placeholder="50.00"
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">Total Budget (USD)</label>
              <input
                type="number"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder="1500.00"
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border border-[#E8E4DC]/20 text-[#E8E4DC]/60 text-sm hover:border-[#E8E4DC]/40 transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Targeting & Create */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-2">Locations (comma-separated)</label>
            <input
              type="text"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="United States, Canada, United Kingdom"
              className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="business intelligence, analytics, AI"
              className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#E8E4DC]/60 mb-2">Interests (comma-separated)</label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Technology, Business, Marketing"
              className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">Min Age</label>
              <input
                type="number"
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#E8E4DC]/60 mb-2">Max Age</label>
              <input
                type="number"
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:border-[#C9A55A]/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 border border-[#E8E4DC]/20 text-[#E8E4DC]/60 text-sm hover:border-[#E8E4DC]/40 transition"
            >
              Back
            </button>
            <button
              onClick={createCampaign}
              disabled={saving}
              className="px-6 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
