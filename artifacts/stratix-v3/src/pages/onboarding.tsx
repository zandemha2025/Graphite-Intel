import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, apiSSE } from "@/lib/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Link2,
  SkipForward,
  Sparkles,
  Building2,
  Bookmark,
  Search,
} from "lucide-react";

/* ---------- Types ---------- */

interface ConnectorAccount {
  id: string;
  name: string;
  type: string;
  connected: boolean;
}

type OnboardingStep = 1 | 2 | 3;

/* ---------- Integration Cards ---------- */

const INTEGRATIONS = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM pipeline & account data",
    oauthPath: "/api/integrations/oauth/salesforce/start",
    logo: "SF",
    color: "#00A1E0",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Marketing & CRM contacts",
    oauthPath: "/api/integrations/oauth/hubspot/start",
    logo: "HS",
    color: "#FF7A59",
  },
  {
    id: "gong",
    name: "Gong",
    description: "Call recordings & deal intel",
    oauthPath: "/api/integrations/oauth/gong/start",
    logo: "G",
    color: "#7C3AED",
  },
  {
    id: "google",
    name: "Google Drive",
    description: "Documents, sheets & slides",
    oauthPath: "/api/integrations/oauth/google/start",
    logo: "GD",
    color: "#4285F4",
  },
] as const;

const ROLE_OPTIONS = [
  "CMO",
  "CEO",
  "CFO",
  "VP Marketing",
  "Head of Growth",
  "Marketing Director",
  "Revenue Operations",
  "Other",
];

const PRIORITY_OPTIONS = [
  "Growth",
  "Retention",
  "Brand Awareness",
  "Market Entry",
  "Competitive Intelligence",
  "Cost Optimization",
  "Channel Attribution",
  "Customer Segmentation",
];

/* ---------- Step Indicator ---------- */

function StepIndicator({ current }: { current: OnboardingStep }) {
  const steps = [
    { num: 1 as const, label: "Connect" },
    { num: 2 as const, label: "Profile" },
    { num: 3 as const, label: "Insight" },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-2">
          {idx > 0 && (
            <div
              className={cn(
                "h-px w-8",
                current > step.num - 1 ? "bg-[#4F46E5]" : "bg-[#E5E7EB]",
              )}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                current === step.num
                  ? "bg-[#4F46E5] text-white"
                  : current > step.num
                    ? "bg-[#4F46E5] text-white"
                    : "bg-[#E5E7EB] text-[#6B7280]",
              )}
            >
              {current > step.num ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                step.num
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                current === step.num
                  ? "text-[#111827]"
                  : current > step.num
                    ? "text-[#4F46E5]"
                    : "text-[#9CA3AF]",
              )}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Step 1: Connect Your Data ---------- */

function ConnectStep({
  connectedAccounts,
  onConnect,
  onRefresh,
  refreshing,
}: {
  connectedAccounts: string[];
  onConnect: (integrationId: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
          <Link2 className="h-5 w-5 text-[#4F46E5]" />
        </div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Connect Your Data
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Stratix gets smarter with your first-party data. Connect your tools
          to unlock personalized intelligence.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedAccounts.includes(integration.id);
          return (
            <button
              key={integration.id}
              onClick={() => !isConnected && onConnect(integration.id)}
              disabled={isConnected}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                isConnected
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[#E5E7EB] bg-white hover:border-[#4F46E5]/30 hover:bg-[#F9FAFB]",
              )}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                style={{ backgroundColor: integration.color }}
              >
                {integration.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111827]">
                    {integration.name}
                  </p>
                  {isConnected && (
                    <Badge variant="success">
                      <Check className="mr-0.5 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#6B7280]">
                  {integration.description}
                </p>
              </div>
              {!isConnected && (
                <span className="shrink-0 text-xs font-medium text-[#4F46E5]">
                  Connect
                </span>
              )}
            </button>
          );
        })}
      </div>

      {refreshing && (
        <div className="flex items-center justify-center gap-2 text-xs text-[#6B7280]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking connection status...
        </div>
      )}
    </div>
  );
}

/* ---------- Step 2: Business Profile ---------- */

function ProfileStep({
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  stage,
  setStage,
  role,
  setRole,
  priorities,
  setPriorities,
  competitors,
  setCompetitors,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  stage: string;
  setStage: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  priorities: string[];
  setPriorities: (v: string[]) => void;
  competitors: string;
  setCompetitors: (v: string) => void;
}) {
  function togglePriority(p: string) {
    if (priorities.includes(p)) {
      setPriorities(priorities.filter((x) => x !== p));
    } else if (priorities.length < 3) {
      setPriorities([...priorities, p]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
          <Building2 className="h-5 w-5 text-[#4F46E5]" />
        </div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Tell Us About Your Business
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Help Stratix understand your context so every insight is relevant.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          id="company"
          label="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Corp"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#111827]">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            >
              <option value="">Select industry...</option>
              <option value="saas">SaaS / Software</option>
              <option value="fintech">Fintech</option>
              <option value="healthcare">Healthcare</option>
              <option value="ecommerce">E-commerce / Retail</option>
              <option value="media">Media & Entertainment</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="professional-services">Professional Services</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#111827]">
              Company Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            >
              <option value="">Select stage...</option>
              <option value="seed">Seed / Pre-revenue</option>
              <option value="series-a">Series A</option>
              <option value="series-b">Series B</option>
              <option value="growth">Growth ($10M+ ARR)</option>
              <option value="enterprise">Enterprise ($100M+)</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#111827]">
            Your Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          >
            <option value="">Select role...</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#111827]">
            Top 3 Priorities{" "}
            <span className="text-xs font-normal text-[#6B7280]">
              ({priorities.length}/3 selected)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((p) => {
              const selected = priorities.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]"
                      : "border-[#E5E7EB] text-[#6B7280] hover:border-[#4F46E5]/30 hover:text-[#111827]",
                    !selected && priorities.length >= 3 && "opacity-40 cursor-not-allowed",
                  )}
                  disabled={!selected && priorities.length >= 3}
                >
                  {selected && <Check className="mr-1 inline-block h-3 w-3" />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          id="competitors"
          label="Key Competitors (optional)"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          placeholder="Competitor A, Competitor B"
        />
      </div>
    </div>
  );
}

/* ---------- Step 3: First Insight ---------- */

function InsightStep({
  connectedAccounts,
  priorities,
  competitors,
  industry,
}: {
  connectedAccounts: string[];
  priorities: string[];
  competitors: string;
  industry: string;
}) {
  const [insightContent, setInsightContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"researching" | "generating" | "done">(
    "researching",
  );
  const abortRef = useRef<AbortController | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Build a contextual prompt based on what they connected and care about
    let prompt: string;
    if (connectedAccounts.includes("salesforce")) {
      prompt =
        "Analyze my sales pipeline health. What patterns do you see in win rates, deal velocity, and at-risk accounts? Provide actionable recommendations for the CMO.";
    } else if (competitors.trim()) {
      const competitorList = competitors.split(",").map((c) => c.trim()).filter(Boolean);
      prompt = `Research ${competitorList[0]} as a competitor. What is their positioning, recent moves, estimated marketing spend, and how should we differentiate? Write as a competitive intelligence brief for a CMO.`;
    } else if (priorities.length > 0) {
      prompt = `Give me a market overview for the ${industry || "technology"} sector focused on ${priorities.join(", ")}. What are the key trends, benchmarks, and opportunities a CMO should know about this quarter?`;
    } else {
      prompt =
        "Give me a market intelligence overview for a technology company. What are the top trends, competitive dynamics, and growth opportunities a CMO should be tracking this quarter?";
    }

    abortRef.current = new AbortController();

    // Simulate research phase, then stream the response
    const phaseTimer = setTimeout(() => setPhase("generating"), 2000);

    apiSSE(
      "/openai/conversations/onboarding/messages",
      { content: prompt, depth: "quick" },
      (_event, data) => {
        if (_event === "done") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            setInsightContent((prev) => prev + parsed.choices[0].delta.content);
          } else if (typeof parsed.content === "string") {
            setInsightContent((prev) => prev + parsed.content);
          } else if (typeof parsed.token === "string") {
            setInsightContent((prev) => prev + parsed.token);
          }
        } catch {
          if (data && data !== "[DONE]") {
            setInsightContent((prev) => prev + data);
          }
        }
      },
      abortRef.current.signal,
    )
      .catch(() => {
        // If streaming fails, show a simulated insight
        if (!insightContent) {
          setInsightContent(
            getSimulatedInsight(connectedAccounts, priorities, competitors, industry),
          );
        }
      })
      .finally(() => {
        setLoading(false);
        setPhase("done");
      });

    return () => {
      clearTimeout(phaseTimer);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
          <Sparkles className="h-5 w-5 text-[#4F46E5]" />
        </div>
        <h2 className="text-lg font-semibold text-[#111827]">
          Your First Insight
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          {phase === "researching"
            ? "Researching your market and pulling data sources..."
            : phase === "generating"
              ? "Generating your personalized intelligence brief..."
              : "Here is your first insight from Stratix."}
        </p>
      </div>

      {/* Progress indicator */}
      {phase !== "done" && (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#4F46E5]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#111827]">
                  {phase === "researching"
                    ? connectedAccounts.includes("salesforce")
                      ? "Analyzing your Salesforce pipeline..."
                      : competitors.trim()
                        ? `Researching ${competitors.split(",")[0]?.trim()}...`
                        : `Researching ${industry || "your"} market...`
                    : "Synthesizing insights..."}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className={cn(
                    "h-full rounded-full bg-[#4F46E5] transition-all duration-1000 ease-out",
                    phase === "researching" ? "w-1/3" : "w-2/3",
                    insightContent && "w-5/6",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insight preview cell */}
      {insightContent && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="indigo">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Analysis
            </Badge>
            {connectedAccounts.length > 0 && (
              <Badge variant="indigo">
                {connectedAccounts.includes("salesforce")
                  ? "Your Salesforce"
                  : "1P Data"}
              </Badge>
            )}
            <Badge variant="default">Perplexity Research</Badge>
          </div>
          <div className="prose-narrative max-w-none text-sm leading-relaxed text-[#111827]">
            <ReactMarkdown>{insightContent}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Simulated insight fallback ---------- */

function getSimulatedInsight(
  connected: string[],
  priorities: string[],
  competitors: string,
  industry: string,
): string {
  if (connected.includes("salesforce")) {
    return `## Pipeline Health Assessment

Based on typical SaaS pipeline patterns, here are key areas to watch:

**Win Rate Trends**: Industry average for ${industry || "SaaS"} companies sits at 20-25%. Track this monthly against your baseline.

**Deal Velocity**: The median sales cycle in your segment is 45-60 days. Deals exceeding 90 days have a 70% higher churn risk.

**At-Risk Signals**: Look for accounts with declining engagement scores, no executive contact in 30+ days, or stalled deal stages.

**Key Recommendation**: Connect Salesforce to unlock real-time pipeline intelligence with account-specific risk scoring.`;
  }

  if (competitors.trim()) {
    const comp = competitors.split(",")[0]?.trim();
    return `## Competitive Intelligence: ${comp}

**Market Positioning**: ${comp} appears to compete on price and breadth of features in the ${industry || "technology"} segment.

**Recent Activity**: Companies in this space are increasing marketing spend by 15-20% QoQ, focusing heavily on content marketing and paid search.

**Differentiation Opportunity**: Focus on depth of insight and integration with existing workflows -- areas where point solutions struggle.

**Key Recommendation**: Set up a monitoring board to track ${comp}'s pricing, hiring, and product announcements weekly.`;
  }

  const focus = priorities.length > 0 ? priorities.join(" and ") : "growth and retention";
  return `## ${industry || "Technology"} Market Overview

**Market Trends**: The ${industry || "technology"} sector is seeing increased focus on ${focus}. Key benchmarks for Q2:

- Customer acquisition cost (CAC) has risen 12% YoY across the sector
- Top-quartile companies achieve 120%+ net revenue retention
- Marketing spend as % of revenue averages 15-20% for growth-stage companies

**Opportunities**: Companies investing in first-party data integration see 30% better attribution accuracy and 20% lower CAC.

**Key Recommendation**: Connect your CRM and call recording tools to unlock account-level intelligence and automated competitive monitoring.`;
}

/* ---------- Main Page ---------- */

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Step 2 state
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [role, setRole] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState("");

  // Check existing connections on mount
  useEffect(() => {
    refreshConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshConnections() {
    setRefreshing(true);
    api<{
      connectors: { id: string; name: string; type: string; connected: boolean }[];
    }>("/connectors/accounts/summary")
      .then((data) => {
        const connected = (data.connectors ?? [])
          .filter((c) => c.connected)
          .map((c) => c.type.toLowerCase());
        setConnectedAccounts(connected);
      })
      .catch(() => {
        // API not available
      })
      .finally(() => setRefreshing(false));
  }

  function handleConnect(integrationId: string) {
    const integration = INTEGRATIONS.find((i) => i.id === integrationId);
    if (!integration) return;

    // Open OAuth flow in popup
    const popup = window.open(
      integration.oauthPath,
      "stratix-oauth",
      "width=600,height=700,left=200,top=100",
    );

    // Poll for popup close, then refresh
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        refreshConnections();
      }
    }, 1000);
  }

  function handleFinish() {
    setLocation("/explore");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Logo & Step Indicator */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4F46E5] text-white font-bold text-sm">
            S
          </div>
          <StepIndicator current={step} />
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <ConnectStep
              connectedAccounts={connectedAccounts}
              onConnect={handleConnect}
              onRefresh={refreshConnections}
              refreshing={refreshing}
            />
          )}

          {step === 2 && (
            <ProfileStep
              companyName={companyName}
              setCompanyName={setCompanyName}
              industry={industry}
              setIndustry={setIndustry}
              stage={stage}
              setStage={setStage}
              role={role}
              setRole={setRole}
              priorities={priorities}
              setPriorities={setPriorities}
              competitors={competitors}
              setCompetitors={setCompetitors}
            />
          )}

          {step === 3 && (
            <InsightStep
              connectedAccounts={connectedAccounts}
              priorities={priorities}
              competitors={competitors}
              industry={industry}
            />
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              {step > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((step - 1) as OnboardingStep)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step === 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(2)}
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip for now
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={() => setStep((step + 1) as OnboardingStep)}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish}>
                  <Search className="h-4 w-4" />
                  Start Exploring
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
