import { useState } from "react";
import {
  BarChart3, Radar, DollarSign, FileText, Heart, TrendingUp,
  Plus, ChevronRight, X, Loader2, Bot, Clock, CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */

export interface AgentBuilderProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Archetype = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  focusAreas: string[];
  defaultSchedule: string;
};

const ARCHETYPES: Archetype[] = [
  {
    key: "marketing-analyst",
    label: "Marketing Analyst",
    description: "Monitors campaigns, generates performance reports, suggests optimizations",
    icon: BarChart3,
    focusAreas: ["Google Ads", "Meta Ads", "Email campaigns", "Organic social", "SEO rankings"],
    defaultSchedule: "daily",
  },
  {
    key: "competitive-intel",
    label: "Competitive Intel",
    description: "Tracks competitors, pricing changes, product launches, generates briefs",
    icon: Radar,
    focusAreas: ["Pricing changes", "Product launches", "Hiring signals", "Press releases", "Social mentions"],
    defaultSchedule: "daily",
  },
  {
    key: "finance-analyst",
    label: "Finance Analyst",
    description: "Revenue forecasting, unit economics, budget analysis",
    icon: DollarSign,
    focusAreas: ["Revenue trends", "Unit economics", "Budget vs actual", "Cash flow", "Runway"],
    defaultSchedule: "weekly",
  },
  {
    key: "content-strategist",
    label: "Content Strategist",
    description: "Content calendar, topic research, SEO recommendations",
    icon: FileText,
    focusAreas: ["Blog performance", "Keyword gaps", "Content calendar", "Topic clusters", "Competitor content"],
    defaultSchedule: "weekly",
  },
  {
    key: "customer-success",
    label: "Customer Success",
    description: "Churn prediction, NPS tracking, health scoring",
    icon: Heart,
    focusAreas: ["Churn signals", "NPS trends", "Support tickets", "Usage patterns", "Renewal pipeline"],
    defaultSchedule: "daily",
  },
  {
    key: "growth-engineer",
    label: "Growth Engineer",
    description: "Experiment design, A/B test analysis, funnel optimization",
    icon: TrendingUp,
    focusAreas: ["Funnel conversion", "A/B test results", "Signup flow", "Activation metrics", "Retention cohorts"],
    defaultSchedule: "daily",
  },
  {
    key: "custom",
    label: "Custom",
    description: "Build a custom agent from scratch",
    icon: Plus,
    focusAreas: [],
    defaultSchedule: "daily",
  },
];

const SCHEDULE_OPTIONS = [
  { value: "realtime", label: "Real-time", cron: "* * * * *" },
  { value: "hourly", label: "Hourly", cron: "0 * * * *" },
  { value: "daily", label: "Daily (8 AM)", cron: "0 8 * * *" },
  { value: "weekly", label: "Weekly (Mon 8 AM)", cron: "0 8 * * 1" },
];

const DELIVERY_OPTIONS = [
  { value: "in-app", label: "In-app notifications" },
  { value: "email", label: "Email digest" },
  { value: "slack", label: "Slack channel" },
];

type Step = 1 | 2 | 3;

export function AgentBuilder({ open, onClose, onCreated }: AgentBuilderProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);

  // Config state
  const [agentName, setAgentName] = useState("");
  const [schedule, setSchedule] = useState("daily");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<string[]>(["in-app"]);
  const [customDescription, setCustomDescription] = useState("");

  // Deploy state
  const [deploying, setDeploying] = useState(false);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setSelectedArchetype(null);
    setAgentName("");
    setSchedule("daily");
    setSelectedFocus([]);
    setDelivery(["in-app"]);
    setCustomDescription("");
    setDeploying(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectArchetype = (arch: Archetype) => {
    setSelectedArchetype(arch);
    setAgentName(arch.key === "custom" ? "" : `${arch.label} Agent`);
    setSchedule(arch.defaultSchedule);
    setSelectedFocus([]);
    setCustomDescription("");
  };

  const toggleFocus = (area: string) => {
    setSelectedFocus((prev) =>
      prev.includes(area) ? prev.filter((f) => f !== area) : [...prev, area]
    );
  };

  const toggleDelivery = (method: string) => {
    setDelivery((prev) =>
      prev.includes(method) ? prev.filter((d) => d !== method) : [...prev, method]
    );
  };

  const canProceedStep2 = agentName.trim().length > 0 && (selectedArchetype?.key !== "custom" || customDescription.trim().length > 0);

  const scheduleLabel = SCHEDULE_OPTIONS.find((s) => s.value === schedule)?.label || schedule;
  const scheduleCron = SCHEDULE_OPTIONS.find((s) => s.value === schedule)?.cron || "0 8 * * *";

  const handleDeploy = async () => {
    if (!selectedArchetype) return;
    setDeploying(true);
    try {
      const focusText = selectedFocus.length > 0 ? ` Focus on: ${selectedFocus.join(", ")}.` : "";
      const description = selectedArchetype.key === "custom"
        ? `[Agent - runs on schedule: ${scheduleLabel}] ${customDescription.trim()}`
        : `[Agent - runs on schedule: ${scheduleLabel}] ${selectedArchetype.label}: ${selectedArchetype.description}.${focusText} Deliver via ${delivery.join(", ")}.`;

      // Generate workflow
      const genRes = await fetch("/api/pipedream/workflows/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          agentConfig: {
            archetype: selectedArchetype.key,
            name: agentName,
            schedule: scheduleCron,
            focusAreas: selectedFocus,
            delivery,
          },
        }),
      });

      if (!genRes.ok) {
        toast({ title: "Generation failed", description: genRes.statusText, duration: 3000 });
        setDeploying(false);
        return;
      }

      const genData = await genRes.json();
      const workflowId = genData.workflowId || genData.id;

      // Deploy workflow
      const deployRes = await fetch("/api/pipedream/workflows/deploy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });

      if (deployRes.ok) {
        toast({ title: "Agent deployed", description: `${agentName} is now active.`, duration: 3000 });
        reset();
        onCreated();
      } else {
        toast({ title: "Deploy failed", description: deployRes.statusText, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to deploy agent.", duration: 2000 });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[720px] max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-editorial text-[18px] text-[var(--text-primary)]">New Agent</h2>
              <p className="text-caption text-[var(--text-secondary)]">
                {step === 1 && "Choose an archetype"}
                {step === 2 && "Configure your agent"}
                {step === 3 && "Review and deploy"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-7 px-3 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors ${
                  s === step
                    ? "bg-[var(--accent)] text-white"
                    : s < step
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {s < step ? <CheckCircle className="h-3.5 w-3.5" /> : s}
                <span className="ml-1.5">
                  {s === 1 && "Archetype"}
                  {s === 2 && "Configure"}
                  {s === 3 && "Review"}
                </span>
              </div>
              {s < 3 && <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Choose Archetype */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {ARCHETYPES.map((arch) => {
                const Icon = arch.icon;
                const isSelected = selectedArchetype?.key === arch.key;
                return (
                  <button
                    key={arch.key}
                    onClick={() => handleSelectArchetype(arch)}
                    className={`text-left p-4 rounded-[var(--radius-md)] border transition-all ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-elevated)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[var(--accent)] text-white" : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-[var(--text-primary)]">{arch.label}</p>
                        <p className="text-caption text-[var(--text-secondary)] mt-0.5 leading-relaxed">{arch.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && selectedArchetype && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Weekly Campaign Reviewer"
                  className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
              </div>

              {/* Custom description (only for custom archetype) */}
              {selectedArchetype.key === "custom" && (
                <div>
                  <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">What should this agent do?</label>
                  <textarea
                    rows={3}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Describe the agent's purpose and behavior..."
                    className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
                  />
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">Schedule</label>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSchedule(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors ${
                        schedule === opt.value
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus areas */}
              {selectedArchetype.focusAreas.length > 0 && (
                <div>
                  <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">Focus Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedArchetype.focusAreas.map((area) => {
                      const active = selectedFocus.includes(area);
                      return (
                        <button
                          key={area}
                          onClick={() => toggleFocus(area)}
                          className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors ${
                            active
                              ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
                              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40"
                          }`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Select areas to focus on, or leave empty for all.</p>
                </div>
              )}

              {/* Delivery */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">Delivery Method</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_OPTIONS.map((opt) => {
                    const active = delivery.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleDelivery(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors ${
                          active
                            ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
                            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review and Deploy */}
          {step === 3 && selectedArchetype && (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                    {(() => { const Icon = selectedArchetype.icon; return <Icon className="h-5 w-5 text-[var(--accent)]" />; })()}
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-[var(--text-primary)]">{agentName}</p>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5">{selectedArchetype.label}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] p-3">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Schedule</p>
                    <p className="text-body-sm text-[var(--text-primary)] font-medium">{scheduleLabel}</p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] p-3">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Delivery</p>
                    <p className="text-body-sm text-[var(--text-primary)] font-medium">
                      {delivery.map((d) => DELIVERY_OPTIONS.find((o) => o.value === d)?.label || d).join(", ")}
                    </p>
                  </div>
                </div>

                {selectedFocus.length > 0 && (
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Focus Areas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFocus.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent)]/10 text-[var(--accent)]">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedArchetype.key === "custom" && customDescription && (
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</p>
                    <p className="text-body-sm text-[var(--text-secondary)]">{customDescription}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            onClick={step === 1 ? handleClose : () => setStep((s) => (s - 1) as Step)}
            className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 ? !selectedArchetype : !canProceedStep2}
              className="flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="flex items-center gap-2 px-5 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {deploying ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deploying...</>
              ) : (
                <><Bot className="h-3.5 w-3.5" /> Deploy Agent</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
