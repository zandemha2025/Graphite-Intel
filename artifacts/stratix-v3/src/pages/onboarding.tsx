import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { apiPost, apiPut, apiSSE } from "@/lib/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Globe,
  Pencil,
  X,
} from "lucide-react";

/* ---------- Types ---------- */

type Phase = "url" | "researching" | "confirm" | "insight" | "ready";

interface CompanyProfile {
  companyName: string;
  industry: string;
  stage: string;
  funding: string;
  competitors: string[];
  revenueEstimate: string;
  teamSize: string;
  description: string;
  website: string;
}

interface ResearchStep {
  key: string;
  label: string;
  done: boolean;
  value: string | null;
}

const EMPTY_PROFILE: CompanyProfile = {
  companyName: "",
  industry: "",
  stage: "",
  funding: "",
  competitors: [],
  revenueEstimate: "",
  teamSize: "",
  description: "",
  website: "",
};

const PRIORITY_OPTIONS = [
  "Growth & Revenue",
  "Customer Retention",
  "Competitive Intelligence",
  "Market Expansion",
  "Cost Optimization",
  "Brand Awareness",
  "Product-Led Growth",
  "Enterprise Sales",
];

const ROLE_OPTIONS = [
  "CMO",
  "VP Marketing",
  "Head of Growth",
  "CEO",
  "CFO",
  "Revenue Operations",
  "Marketing Director",
  "Other",
];

/* ---------- Phase 1: URL Input ---------- */

function UrlPhase({
  url,
  setUrl,
  onResearch,
  onSkip,
  loading,
}: {
  url: string;
  setUrl: (v: string) => void;
  onResearch: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && url.trim()) onResearch();
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5]">
        <span className="text-lg font-bold text-white">S</span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-[#111827]">
        Let's set up your intelligence
      </h1>
      <p className="mb-8 text-[#6B7280]">
        Enter your company website and we'll do the rest.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            className="h-11 w-full rounded-lg border border-[#E5E7EB] pl-10 pr-4 text-[15px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            placeholder="yourcompany.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <button
          onClick={onResearch}
          disabled={!url.trim() || loading}
          className="flex h-11 items-center gap-2 rounded-lg bg-[#4F46E5] px-6 font-medium text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Research
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-[#9CA3AF]">
        Or{" "}
        <button
          className="text-[#4F46E5] underline hover:text-[#4338CA]"
          onClick={onSkip}
        >
          set up manually
        </button>
      </p>
    </div>
  );
}

/* ---------- Phase 2: Live Research ---------- */

function ResearchPhase({ steps }: { steps: ResearchStep[] }) {
  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-1 text-lg font-semibold text-[#111827]">
        Researching your company...
      </h2>
      <p className="mb-6 text-sm text-[#6B7280]">
        This usually takes 10-15 seconds.
      </p>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex items-start gap-3 text-sm"
          >
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#059669]">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
              )}
            </div>
            <span
              className={cn(
                "flex-1",
                step.done ? "text-[#111827]" : "text-[#6B7280]",
              )}
            >
              {step.label}
            </span>
            {step.value && (
              <span className="shrink-0 text-right text-sm font-medium text-[#111827]">
                {step.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Phase 3: Smart Confirmation ---------- */

function ConfirmPhase({
  profile,
  setProfile,
  priorities,
  togglePriority,
  role,
  setRole,
  missingFields,
  onContinue,
}: {
  profile: CompanyProfile;
  setProfile: (p: CompanyProfile) => void;
  priorities: string[];
  togglePriority: (p: string) => void;
  role: string;
  setRole: (r: string) => void;
  missingFields: string[];
  onContinue: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const profileFields = [
    { key: "companyName", label: "Company", value: profile.companyName },
    { key: "industry", label: "Industry", value: profile.industry },
    { key: "stage", label: "Stage & Funding", value: [profile.stage, profile.funding].filter(Boolean).join(", ") || "" },
    { key: "competitors", label: "Competitors", value: profile.competitors.join(", ") },
    { key: "revenueEstimate", label: "Revenue Estimate", value: profile.revenueEstimate },
    { key: "teamSize", label: "Team Size", value: profile.teamSize },
    { key: "description", label: "Description", value: profile.description },
  ];

  function startEdit(key: string, value: string) {
    setEditingField(key);
    setEditValue(value);
  }

  function saveEdit(key: string) {
    if (key === "competitors") {
      setProfile({ ...profile, competitors: editValue.split(",").map((s) => s.trim()).filter(Boolean) });
    } else if (key === "stage") {
      setProfile({ ...profile, stage: editValue });
    } else {
      setProfile({ ...profile, [key]: editValue });
    }
    setEditingField(null);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-1 text-lg font-semibold text-[#111827]">
        Here's what we found
      </h2>
      <p className="mb-6 text-sm text-[#6B7280]">
        Confirm or adjust anything that's off.
      </p>

      <div className="divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB]">
        {profileFields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between px-4 py-3"
          >
            {editingField === field.key ? (
              <div className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <p className="mb-1 text-xs text-[#6B7280]">{field.label}</p>
                  <input
                    className="h-8 w-full rounded border border-[#E5E7EB] px-2 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(field.key);
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => saveEdit(field.key)}
                  className="text-xs font-medium text-[#059669] hover:text-[#047857]"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#6B7280]">{field.label}</p>
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      field.value
                        ? "text-[#111827]"
                        : "italic text-[#9CA3AF]",
                    )}
                  >
                    {field.value || "Not found"}
                  </p>
                </div>
                <button
                  className="shrink-0 ml-3 flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#4338CA]"
                  onClick={() => startEdit(field.key, field.value)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Questions the AI could not answer */}
      <div className="mt-6">
        <h3 className="mb-1 text-sm font-medium text-[#111827]">
          Help us understand your priorities
        </h3>
        <p className="mb-4 text-xs text-[#6B7280]">
          {missingFields.length > 0
            ? "We couldn't find everything from your website. This helps us give better recommendations."
            : "Select what matters most to you this quarter."}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#6B7280]">
              Top priorities this quarter{" "}
              <span className="text-xs">({priorities.length}/3)</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => {
                const selected = priorities.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePriority(p)}
                    disabled={!selected && priorities.length >= 3}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#4F46E5]/30 hover:text-[#111827]",
                      !selected &&
                        priorities.length >= 3 &&
                        "cursor-not-allowed opacity-40",
                    )}
                  >
                    {selected && (
                      <Check className="mr-1 inline-block h-3 w-3" />
                    )}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-[#6B7280]">Your role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            >
              <option value="">Select role...</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4F46E5] font-medium text-white transition-colors hover:bg-[#4338CA]"
      >
        Save & Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Phase 4: First Real Insight ---------- */

function InsightPhase({
  profile,
  priorities,
  insightContent,
  insightLoading,
}: {
  profile: CompanyProfile;
  priorities: string[];
  insightContent: string;
  insightLoading: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
          <Sparkles className="h-5 w-5 text-[#4F46E5]" />
        </div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Your First Insight
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          {insightLoading
            ? `Generating intelligence for ${profile.companyName || "your company"}...`
            : "Here's your personalized intelligence brief."}
        </p>
      </div>

      {insightLoading && !insightContent && (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#4F46E5]" />
            <div className="flex-1">
              <span className="text-xs font-medium text-[#111827]">
                Synthesizing intelligence from multiple sources...
              </span>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[#4F46E5]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {insightContent && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-medium text-[#4F46E5]">
              <Sparkles className="h-3 w-3" />
              AI Analysis
            </span>
            <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#6B7280]">
              Fusion Engine
            </span>
          </div>
          <div className="prose-sm max-w-none text-sm leading-relaxed text-[#111827] [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:pl-4">
            <ReactMarkdown>{insightContent}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Phase 5: Ready ---------- */

function ReadyPhase({
  healthScore,
  onStart,
}: {
  healthScore: number;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#059669]/10">
        <Check className="h-7 w-7 text-[#059669]" />
      </div>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] px-4 py-2 text-sm text-[#4F46E5]">
        <Check className="h-4 w-4" />
        Context Health: {healthScore}%
      </div>

      <h2 className="mb-2 text-lg font-semibold text-[#111827]">
        Your intelligence workspace is ready
      </h2>
      <p className="mb-6 text-sm text-[#6B7280]">
        We've set up your profile, identified competitors, and generated your
        first insight.
      </p>

      <button
        onClick={onStart}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4F46E5] px-8 font-medium text-white transition-colors hover:bg-[#4338CA]"
      >
        Start Exploring
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<Phase>("url");

  // URL input
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  // Research
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_PROFILE);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Confirmation
  const [priorities, setPriorities] = useState<string[]>([]);
  const [role, setRole] = useState("");

  // Insight
  const [insightContent, setInsightContent] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const insightAbortRef = useRef<AbortController | null>(null);

  // Health score
  const [healthScore, setHealthScore] = useState(0);

  function togglePriority(p: string) {
    if (priorities.includes(p)) {
      setPriorities(priorities.filter((x) => x !== p));
    } else if (priorities.length < 3) {
      setPriorities([...priorities, p]);
    }
  }

  /* --- Research flow --- */

  const startResearch = useCallback(async () => {
    if (!url.trim()) return;

    setUrlLoading(true);
    setPhase("researching");

    const initialSteps: ResearchStep[] = [
      { key: "scanning", label: "Scanning website...", done: false, value: null },
      { key: "companyName", label: "Company name", done: false, value: null },
      { key: "industry", label: "Industry", done: false, value: null },
      { key: "stage", label: "Stage & funding", done: false, value: null },
      { key: "competitors", label: "Key competitors", done: false, value: null },
      { key: "revenueEstimate", label: "Revenue estimate", done: false, value: null },
      { key: "teamSize", label: "Team size", done: false, value: null },
      { key: "building", label: "Building your profile...", done: false, value: null },
    ];
    setResearchSteps(initialSteps);

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const newProfile = { ...EMPTY_PROFILE, website: normalizedUrl };
    const missing: string[] = [];

    try {
      // Mark scanning as done after a brief moment
      setTimeout(() => {
        setResearchSteps((prev) =>
          prev.map((s) =>
            s.key === "scanning" ? { ...s, done: true, value: "Done" } : s,
          ),
        );
      }, 1200);

      const abort = new AbortController();

      await apiSSE(
        "/research/company",
        { url: normalizedUrl },
        (event, data) => {
          if (event === "done" || event === "complete") return;
          if (event === "error") return;

          try {
            const parsed = JSON.parse(data);

            // The SSE endpoint sends profile fields as they're discovered
            if (parsed.profile) {
              const p = parsed.profile;

              if (p.companyName) {
                newProfile.companyName = p.companyName;
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "companyName"
                      ? { ...s, done: true, value: p.companyName }
                      : s,
                  ),
                );
              }
              if (p.industry) {
                newProfile.industry = p.industry;
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "industry"
                      ? { ...s, done: true, value: p.industry }
                      : s,
                  ),
                );
              }
              if (p.stage || p.funding) {
                if (p.stage) newProfile.stage = p.stage;
                if (p.funding) newProfile.funding = p.funding;
                const combined = [p.stage, p.funding]
                  .filter(Boolean)
                  .join(", ");
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "stage"
                      ? { ...s, done: true, value: combined || s.value }
                      : s,
                  ),
                );
              }
              if (p.competitors && Array.isArray(p.competitors) && p.competitors.length > 0) {
                newProfile.competitors = p.competitors;
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "competitors"
                      ? {
                          ...s,
                          done: true,
                          value: p.competitors.slice(0, 3).join(", "),
                        }
                      : s,
                  ),
                );
              }
              if (p.revenueEstimate) {
                newProfile.revenueEstimate = p.revenueEstimate;
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "revenueEstimate"
                      ? { ...s, done: true, value: p.revenueEstimate }
                      : s,
                  ),
                );
              }
              if (p.teamSize) {
                newProfile.teamSize = p.teamSize;
                setResearchSteps((prev) =>
                  prev.map((s) =>
                    s.key === "teamSize"
                      ? { ...s, done: true, value: p.teamSize }
                      : s,
                  ),
                );
              }
              if (p.description) {
                newProfile.description = p.description;
              }
            }
          } catch {
            // Non-JSON event, ignore
          }
        },
        abort.signal,
      );

      // Identify what we didn't find
      if (!newProfile.companyName) missing.push("companyName");
      if (!newProfile.industry) missing.push("industry");
      if (!newProfile.stage) missing.push("stage");
      if (!newProfile.teamSize) missing.push("teamSize");
      if (newProfile.competitors.length === 0) missing.push("competitors");

      // Mark remaining steps
      setResearchSteps((prev) =>
        prev.map((s) => {
          if (s.key === "building") return { ...s, done: true, value: "Done" };
          if (!s.done) return { ...s, done: true, value: "Not found" };
          return s;
        }),
      );
    } catch {
      // SSE failed -- fall back gracefully
      setResearchSteps((prev) =>
        prev.map((s) => ({ ...s, done: true, value: s.value || "Unavailable" })),
      );
      missing.push("companyName", "industry", "stage");
    }

    setProfile(newProfile);
    setMissingFields(missing);
    setUrlLoading(false);

    // Brief pause to let user see the completed checklist, then move to confirm
    setTimeout(() => setPhase("confirm"), 800);
  }, [url]);

  /* --- Skip to manual --- */

  function skipToManual() {
    setPhase("confirm");
    setMissingFields(["companyName", "industry", "stage", "competitors"]);
  }

  /* --- Save profile and generate insight --- */

  async function handleConfirmContinue() {
    // Save profile
    try {
      await apiPut("/company-profile", {
        companyName: profile.companyName,
        website: profile.website || url,
        industry: profile.industry,
        stage: profile.stage,
        funding: profile.funding,
        competitors: profile.competitors,
        revenueEstimate: profile.revenueEstimate,
        teamSize: profile.teamSize,
        description: profile.description,
        role,
        priorities,
      });
    } catch {
      // Profile save failed -- continue anyway
    }

    // Move to insight phase
    setPhase("insight");
    setInsightLoading(true);
    setInsightContent("");

    const companyName = profile.companyName || "your company";
    const industry = profile.industry || "technology";
    const stage = profile.stage || "";
    const revenue = profile.revenueEstimate || "";
    const competitorList = profile.competitors.join(", ");

    // Build a contextual first query
    let firstQuery: string;
    if (priorities.includes("Competitive Intelligence") && competitorList) {
      firstQuery = `Give me a competitive landscape overview for ${companyName} in the ${industry} space. Key competitors include: ${competitorList}. Who are the key players, what are they doing, and where are the opportunities?`;
    } else if (priorities.includes("Growth & Revenue")) {
      firstQuery = `What are the 3 highest-impact growth strategies for ${companyName} as a ${stage} ${industry} company${revenue ? ` with ${revenue} ARR` : ""}? Be specific and actionable.`;
    } else if (priorities.includes("Market Expansion")) {
      firstQuery = `Give me a market expansion analysis for ${companyName} in the ${industry} space. What adjacent markets or geographies should we consider, and what's the competitive landscape in each?`;
    } else {
      firstQuery = `Give me a strategic intelligence briefing for ${companyName}. What should a ${role || "CMO"} know about the ${industry} market right now? Include competitive dynamics, trends, and 2-3 actionable recommendations.`;
    }

    try {
      // Create a real conversation
      const conv = await apiPost<{ id: number }>("/openai/conversations", {});
      insightAbortRef.current = new AbortController();

      await apiSSE(
        `/openai/conversations/${conv.id}/messages`,
        { content: firstQuery, depth: "standard" },
        (event, data) => {
          if (event === "done" || event === "complete") return;
          if (event === "error") {
            try {
              const parsed = JSON.parse(data);
              setInsightContent(
                parsed.error || "Analysis unavailable -- check API configuration.",
              );
            } catch {
              // ignore
            }
            return;
          }
          if (
            event === "step" ||
            event === "step_complete" ||
            event === "sources"
          )
            return;

          try {
            const parsed = JSON.parse(data);
            const delta =
              parsed.delta ?? parsed.content ?? parsed.token ?? "";
            if (delta)
              setInsightContent((prev) => prev + delta);
          } catch {
            if (data && data !== "[DONE]")
              setInsightContent((prev) => prev + data);
          }
        },
        insightAbortRef.current.signal,
      );
    } catch {
      setInsightContent(
        "We couldn't generate your first insight right now. You can ask any question from the Explore page.",
      );
    }

    setInsightLoading(false);

    // Calculate a simple health score based on profile completeness
    let score = 20; // base for completing onboarding
    if (profile.companyName) score += 10;
    if (profile.industry) score += 10;
    if (profile.stage) score += 5;
    if (profile.competitors.length > 0) score += 10;
    if (profile.revenueEstimate) score += 5;
    if (priorities.length > 0) score += 10;
    if (role) score += 5;
    score = Math.min(score, 75); // cap -- they haven't connected data sources yet
    setHealthScore(score);

    // Show the ready phase after insight is complete
    setTimeout(() => setPhase("ready"), 1500);
  }

  /* --- Cleanup --- */

  useEffect(() => {
    return () => {
      insightAbortRef.current?.abort();
    };
  }, []);

  /* --- Progress dots --- */

  const phases: Phase[] = ["url", "researching", "confirm", "insight", "ready"];
  const phaseIndex = phases.indexOf(phase);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {phases.map((p, i) => (
            <div
              key={p}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i <= phaseIndex
                  ? "w-8 bg-[#4F46E5]"
                  : "w-4 bg-[#E5E7EB]",
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          {phase === "url" && (
            <UrlPhase
              url={url}
              setUrl={setUrl}
              onResearch={startResearch}
              onSkip={skipToManual}
              loading={urlLoading}
            />
          )}

          {phase === "researching" && (
            <ResearchPhase steps={researchSteps} />
          )}

          {phase === "confirm" && (
            <ConfirmPhase
              profile={profile}
              setProfile={setProfile}
              priorities={priorities}
              togglePriority={togglePriority}
              role={role}
              setRole={setRole}
              missingFields={missingFields}
              onContinue={handleConfirmContinue}
            />
          )}

          {phase === "insight" && (
            <InsightPhase
              profile={profile}
              priorities={priorities}
              insightContent={insightContent}
              insightLoading={insightLoading}
            />
          )}

          {phase === "ready" && (
            <ReadyPhase
              healthScore={healthScore}
              onStart={() => setLocation("/explore")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
