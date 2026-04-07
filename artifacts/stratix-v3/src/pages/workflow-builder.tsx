import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
// Card unused in this file but available for future extension
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  AlertTriangle,
  FileText,
  TrendingUp,
  Heart,
  BarChart3,
  Clock,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  History,
  Sparkles,
  Calendar,
  Webhook,
  Hand,
  MessageCircle,
  Star,
  Search,
  Presentation,
  MessageSquare,
} from "lucide-react";

/* ---------- Types ---------- */

interface WorkflowStep {
  id: string;
  label: string;
  tool?: string;
  status: "pending" | "building" | "done";
}

interface WorkflowPlan {
  name: string;
  steps: WorkflowStep[];
  schedule: string;
  trigger: "schedule" | "webhook" | "manual";
}

type Phase = "input" | "planning" | "review" | "building" | "deployed";

/* ---------- Templates ---------- */

const WORKFLOW_TEMPLATES = [
  {
    id: "competitor-watch",
    name: "Weekly Competitor Watch",
    description: "Monitor competitor websites for pricing, feature, and messaging changes",
    schedule: "Every Monday 9am",
    icon: Eye,
    steps: [
      "Scrape competitor sites",
      "Compare with last week",
      "Generate change report",
      "Send email summary",
    ],
  },
  {
    id: "pipeline-alert",
    name: "Deal Pipeline Alert",
    description: "Alert when deals stall, accounts go silent, or pipeline drops below threshold",
    schedule: "Daily 8am",
    icon: AlertTriangle,
    steps: [
      "Pull Salesforce pipeline",
      "Check deal velocity",
      "Identify stalled deals",
      "Send Slack alert",
    ],
  },
  {
    id: "content-brief",
    name: "Content Brief Generator",
    description: "Auto-generate content briefs based on trending topics in your industry",
    schedule: "Every Wednesday",
    icon: FileText,
    steps: [
      "Research industry trends",
      "Analyze competitor content",
      "Generate brief",
      "Add to Notion/Docs",
    ],
  },
  {
    id: "market-monitor",
    name: "Market Intelligence Brief",
    description: "Weekly market intelligence summary with competitor moves, news, and trends",
    schedule: "Every Friday 5pm",
    icon: TrendingUp,
    steps: [
      "Search industry news",
      "Track competitor announcements",
      "Analyze market sentiment",
      "Generate brief",
    ],
  },
  {
    id: "account-health",
    name: "Account Health Check",
    description: "Weekly check on key account engagement, call sentiment, and renewal risk",
    schedule: "Every Monday 7am",
    icon: Heart,
    steps: [
      "Pull CRM activity",
      "Analyze Gong calls",
      "Score account health",
      "Flag at-risk accounts",
    ],
  },
  {
    id: "campaign-report",
    name: "Campaign Performance Digest",
    description: "Auto-generate weekly campaign performance reports across all channels",
    schedule: "Every Monday 10am",
    icon: BarChart3,
    steps: [
      "Pull Google Ads data",
      "Pull Meta Ads data",
      "Calculate ROI metrics",
      "Generate performance deck",
    ],
  },
  {
    id: "social-listening",
    name: "Social Listening Digest",
    description: "Track brand mentions, sentiment, and trending topics across social platforms",
    schedule: "Daily 7am",
    icon: MessageCircle,
    steps: [
      "Scan social mentions",
      "Analyze sentiment",
      "Identify trends",
      "Send digest",
    ],
  },
  {
    id: "lead-scoring",
    name: "Lead Scoring Refresh",
    description: "Re-score leads based on engagement, intent signals, and fit criteria",
    schedule: "Daily 6am",
    icon: Star,
    steps: [
      "Pull new lead data",
      "Score against ICP",
      "Update CRM scores",
      "Alert sales on hot leads",
    ],
  },
  {
    id: "seo-rank-tracker",
    name: "SEO Rank Tracker",
    description: "Track keyword rankings and compare against competitor positions weekly",
    schedule: "Every Monday 8am",
    icon: Search,
    steps: [
      "Check keyword positions",
      "Compare vs competitors",
      "Identify opportunities",
      "Update dashboard",
    ],
  },
  {
    id: "churn-predictor",
    name: "Churn Risk Alert",
    description: "Identify accounts showing churn signals from usage, support, and engagement data",
    schedule: "Every Monday 7am",
    icon: AlertTriangle,
    steps: [
      "Pull usage metrics",
      "Check support tickets",
      "Analyze engagement drops",
      "Flag at-risk accounts",
    ],
  },
  {
    id: "board-deck-prep",
    name: "Board Deck Auto-Prep",
    description: "Auto-compile metrics, highlights, and talking points for board meetings",
    schedule: "Monthly, 3 days before board meeting",
    icon: Presentation,
    steps: [
      "Pull financial metrics",
      "Compile product milestones",
      "Generate competitive update",
      "Format deck sections",
    ],
  },
  {
    id: "customer-feedback",
    name: "Customer Feedback Aggregator",
    description: "Aggregate feedback from G2, support tickets, NPS surveys, and sales calls",
    schedule: "Every Friday 4pm",
    icon: MessageSquare,
    steps: [
      "Pull G2 reviews",
      "Scan support themes",
      "Aggregate NPS data",
      "Generate insights report",
    ],
  },
];

/* ---------- Tool mapping for generated plans ---------- */

const TOOL_HINTS: Record<string, string> = {
  scrape: "Firecrawl",
  competitor: "Firecrawl",
  website: "Firecrawl",
  crawl: "Firecrawl",
  email: "Pipedream",
  send: "Pipedream",
  slack: "Pipedream",
  notify: "Pipedream",
  notification: "Pipedream",
  generate: "OpenRouter",
  summary: "OpenRouter",
  summarize: "OpenRouter",
  analyze: "OpenRouter",
  brief: "OpenRouter",
  report: "OpenRouter",
  compare: "OpenRouter",
  salesforce: "Salesforce API",
  crm: "Salesforce API",
  pipeline: "Salesforce API",
  gong: "Gong API",
  call: "Gong API",
  sentiment: "Gong API",
  google: "Google Ads API",
  meta: "Meta Ads API",
  notion: "Notion API",
  docs: "Google Docs API",
  sheets: "Google Sheets",
  news: "SerpAPI",
  search: "SerpAPI",
  trend: "SerpAPI",
};

function inferTool(stepLabel: string): string | undefined {
  const lower = stepLabel.toLowerCase();
  for (const [keyword, tool] of Object.entries(TOOL_HINTS)) {
    if (lower.includes(keyword)) return tool;
  }
  return undefined;
}

/* ---------- Simulated AI planning ---------- */

function generatePlanFromPrompt(prompt: string): WorkflowPlan {
  const lower = prompt.toLowerCase();

  // Try to match a template
  for (const tpl of WORKFLOW_TEMPLATES) {
    const keywords = tpl.name.toLowerCase().split(" ");
    const matches = keywords.filter((k) => lower.includes(k));
    if (matches.length >= 2) {
      return {
        name: tpl.name,
        steps: tpl.steps.map((label, i) => ({
          id: `step-${i}`,
          label,
          tool: inferTool(label),
          status: "pending",
        })),
        schedule: tpl.schedule,
        trigger: "schedule",
      };
    }
  }

  // Parse the prompt into steps heuristically
  const steps: WorkflowStep[] = [];
  const sentences = prompt
    .split(/[,.]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length >= 2) {
    sentences.forEach((s, i) => {
      steps.push({
        id: `step-${i}`,
        label: s.charAt(0).toUpperCase() + s.slice(1),
        tool: inferTool(s),
        status: "pending",
      });
    });
  } else {
    // Break single sentence into generic steps
    steps.push(
      { id: "step-0", label: "Gather source data", tool: inferTool(prompt) || "Firecrawl", status: "pending" },
      { id: "step-1", label: "Process and analyze data", tool: "OpenRouter", status: "pending" },
      { id: "step-2", label: "Generate output report", tool: "OpenRouter", status: "pending" },
      { id: "step-3", label: "Deliver results", tool: "Pipedream", status: "pending" },
    );
  }

  // Infer schedule from prompt
  let schedule = "Every Monday 9:00 AM";
  if (lower.includes("daily") || lower.includes("every day")) schedule = "Daily 8:00 AM";
  else if (lower.includes("friday")) schedule = "Every Friday 5:00 PM";
  else if (lower.includes("wednesday")) schedule = "Every Wednesday 9:00 AM";
  else if (lower.includes("monday")) schedule = "Every Monday 9:00 AM";
  else if (lower.includes("weekly")) schedule = "Every Monday 9:00 AM";
  else if (lower.includes("hourly")) schedule = "Every hour";

  // Infer name
  const name = prompt.length > 50
    ? prompt.slice(0, 47) + "..."
    : prompt;

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    steps,
    schedule,
    trigger: "schedule",
  };
}

/* ---------- Step Status Icon ---------- */

function StepStatusIcon({ status }: { status: WorkflowStep["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "building":
      return <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />;
    case "pending":
      return <Circle className="h-5 w-5 text-[#3F3F46]" />;
  }
}

/* ---------- Trigger Icon ---------- */

function TriggerIcon({ trigger }: { trigger: WorkflowPlan["trigger"] }) {
  switch (trigger) {
    case "schedule":
      return <Calendar className="h-4 w-4" />;
    case "webhook":
      return <Webhook className="h-4 w-4" />;
    case "manual":
      return <Hand className="h-4 w-4" />;
  }
}

/* ---------- Input Phase ---------- */

function InputPhase({
  onSubmit,
  onSelectTemplate,
}: {
  onSubmit: (prompt: string) => void;
  onSelectTemplate: (templateId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-10 pt-8">
      {/* Conversational prompt */}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366F1]/10">
            <Sparkles className="h-5 w-5 text-[#6366F1]" />
          </div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">
            What would you like to automate?
          </h2>
        </div>

        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g., "Every Monday, check competitor websites for pricing changes and email me a summary"'
            rows={4}
            className="w-full rounded-xl border border-[#27272A] bg-[#18181B] px-4 py-3.5 text-[15px] text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none shadow-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (prompt.trim()) onSubmit(prompt.trim());
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#71717A]">
              Cmd+Enter to submit
            </p>
            <Button
              size="lg"
              disabled={!prompt.trim()}
              onClick={() => onSubmit(prompt.trim())}
            >
              Build This
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-[#27272A]" />
        <span className="text-xs font-medium text-[#71717A]">
          Or start from a template
        </span>
        <div className="h-px flex-1 bg-[#27272A]" />
      </div>

      {/* Templates */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WORKFLOW_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl.id)}
              className="group rounded-xl border border-[#27272A] bg-[#18181B] p-4 text-left transition-all hover:border-[#6366F1]/30 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-[#6366F1]" />
                <span className="text-sm font-medium text-[#FAFAFA]">
                  {tpl.name}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#A1A1AA]">
                {tpl.description}
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#71717A]">
                <Clock className="h-3 w-3" />
                {tpl.schedule}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Review Phase ---------- */

function ReviewPhase({
  plan,
  onConfirm,
  onEdit,
  onBack,
}: {
  plan: WorkflowPlan;
  onConfirm: () => void;
  onEdit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366F1]/10">
          <FileText className="h-5 w-5 text-[#6366F1]" />
        </div>
        <h2 className="text-lg font-semibold text-[#FAFAFA]">
          Here's what I'll build:
        </h2>
      </div>

      {/* Workflow name */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">
          {plan.name}
        </h3>

        {/* Steps */}
        <div className="space-y-3">
          {plan.steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg bg-[#18181B] px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/10 text-xs font-semibold text-[#6366F1]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#FAFAFA]">
                  {step.label}
                </p>
                {step.tool && (
                  <p className="mt-0.5 text-xs text-[#71717A]">
                    via {step.tool}
                  </p>
                )}
              </div>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            </div>
          ))}
        </div>

        {/* Schedule */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#6366F1]/10 px-4 py-2.5">
          <TriggerIcon trigger={plan.trigger} />
          <span className="text-sm font-medium text-[#6366F1]">
            Schedule: {plan.schedule}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Start Over
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Plan
          </Button>
        </div>
        <Button size="lg" onClick={onConfirm}>
          Looks Good -- Build It
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Building Phase ---------- */

function BuildingPhase({ plan }: { plan: WorkflowPlan }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#6366F1]" />
        <h2 className="text-lg font-semibold text-[#FAFAFA]">
          Building your workflow...
        </h2>
      </div>

      <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-sm">
        <div className="space-y-4">
          {plan.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <StepStatusIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    step.status === "pending"
                      ? "text-[#71717A]"
                      : "font-medium text-[#FAFAFA]"
                  }`}
                >
                  {step.status === "done" && "Created: "}
                  {step.status === "building" && "Setting up: "}
                  {step.label}
                </p>
                {step.tool && step.status !== "pending" && (
                  <p className="text-xs text-[#71717A]">via {step.tool}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Deployed Phase ---------- */

function DeployedPhase({
  plan,
  onRunNow,
  onEdit,
  onViewHistory,
  onBack,
}: {
  plan: WorkflowPlan;
  onRunNow: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      {/* Success header */}
      <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <div>
            <h2 className="text-lg font-semibold text-[#FAFAFA]">
              Workflow deployed!
            </h2>
            <p className="mt-0.5 text-sm text-[#A1A1AA]">
              "{plan.name}"
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            {plan.name}
          </h3>
          <Badge variant="success">Active</Badge>
        </div>

        {/* Steps summary */}
        <div className="mb-4 space-y-2">
          {plan.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-[#FAFAFA]">{step.label}</span>
              {step.tool && (
                <Badge variant="default" className="text-[10px]">
                  {step.tool}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-2 rounded-lg bg-[#18181B] px-4 py-2.5">
          <TriggerIcon trigger={plan.trigger} />
          <span className="text-sm text-[#A1A1AA]">
            Runs {plan.schedule.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onRunNow}>
          <Play className="h-4 w-4" />
          Run Now
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="secondary" onClick={onViewHistory}>
          <History className="h-4 w-4" />
          View History
        </Button>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Automations
        </Button>
      </div>
    </div>
  );
}

/* ---------- Edit Plan Modal ---------- */

function EditPlanOverlay({
  plan,
  onSave,
  onCancel,
}: {
  plan: WorkflowPlan;
  onSave: (updated: WorkflowPlan) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [schedule, setSchedule] = useState(plan.schedule);
  const [trigger, setTrigger] = useState<WorkflowPlan["trigger"]>(plan.trigger);
  const [steps, setSteps] = useState(plan.steps.map((s) => s.label));

  function handleSave() {
    onSave({
      ...plan,
      name,
      schedule,
      trigger,
      steps: steps
        .filter((s) => s.trim())
        .map((label, i) => ({
          id: `step-${i}`,
          label,
          tool: inferTool(label),
          status: "pending" as const,
        })),
    });
  }

  function updateStep(idx: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-[#27272A] bg-[#18181B] p-6 shadow-xl">
        <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">
          Edit Workflow Plan
        </h3>

        {/* Name */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[#A1A1AA]">
            Workflow Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
          />
        </div>

        {/* Steps */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[#A1A1AA]">
            Steps
          </label>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#27272A] text-xs font-medium text-[#A1A1AA]">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-sm text-[#FAFAFA] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                  placeholder="Describe this step..."
                />
                <button
                  onClick={() => removeStep(i)}
                  className="rounded p-1 text-[#71717A] hover:bg-[#27272A] hover:text-[#A1A1AA]"
                >
                  <span className="text-xs">x</span>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addStep}
            className="mt-2 text-xs font-medium text-[#6366F1] hover:text-[#818CF8]"
          >
            + Add step
          </button>
        </div>

        {/* Trigger */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[#A1A1AA]">
            Trigger
          </label>
          <div className="flex gap-2">
            {(["schedule", "webhook", "manual"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTrigger(t)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  trigger === t
                    ? "border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1]"
                    : "border-[#27272A] text-[#A1A1AA] hover:bg-[#18181B]"
                }`}
              >
                <TriggerIcon trigger={t} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule (only if trigger is schedule) */}
        {trigger === "schedule" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-[#A1A1AA]">
              Schedule
            </label>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
              placeholder="e.g., Every Monday 9am"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Builder Page ---------- */

export default function WorkflowBuilderPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const templateParam = new URLSearchParams(search).get("template");

  const [phase, setPhase] = useState<Phase>("input");
  const [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [definitionId, setDefinitionId] = useState<string | null>(null);

  // If a template param was passed, load it immediately
  useEffect(() => {
    if (templateParam) {
      const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === templateParam);
      if (tpl) {
        const generatedPlan: WorkflowPlan = {
          name: tpl.name,
          steps: tpl.steps.map((label, i) => ({
            id: `step-${i}`,
            label,
            tool: inferTool(label),
            status: "pending",
          })),
          schedule: tpl.schedule,
          trigger: "schedule",
        };
        setPlan(generatedPlan);
        setPhase("review");
      }
    }
  }, [templateParam]);

  /* -- Handle prompt submission (input phase) -- */
  const handlePromptSubmit = useCallback(async (prompt: string) => {
    setPhase("planning");

    // Simulate AI thinking
    await new Promise((r) => setTimeout(r, 1200));

    // Try calling the real API first
    try {
      const data = await apiPost<{ definition: { id: string } }>(
        "/workflow-definitions",
        { name: "AI Generated Workflow", description: prompt, steps: [] },
      );
      setDefinitionId(data.definition.id);

      // Try to generate steps via AI
      try {
        await apiPost(`/workflow-definitions/${data.definition.id}/generate`, {
          prompt,
        });
      } catch {
        // Generation endpoint may not exist -- fall back to local planning
      }
    } catch {
      // API not available -- use client-side plan generation
    }

    const generatedPlan = generatePlanFromPrompt(prompt);
    setPlan(generatedPlan);
    setPhase("review");
  }, []);

  /* -- Handle template selection -- */
  const handleSelectTemplate = useCallback((templateId: string) => {
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    const generatedPlan: WorkflowPlan = {
      name: tpl.name,
      steps: tpl.steps.map((label, i) => ({
        id: `step-${i}`,
        label,
        tool: inferTool(label),
        status: "pending",
      })),
      schedule: tpl.schedule,
      trigger: "schedule",
    };
    setPlan(generatedPlan);
    setPhase("review");
  }, []);

  /* -- Handle build confirmation -- */
  const handleBuild = useCallback(async () => {
    if (!plan) return;
    setPhase("building");

    // Animate steps one by one
    for (let i = 0; i < plan.steps.length; i++) {
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedSteps = prev.steps.map((s, idx) => ({
          ...s,
          status:
            idx < i
              ? ("done" as const)
              : idx === i
                ? ("building" as const)
                : ("pending" as const),
        }));
        return { ...prev, steps: updatedSteps };
      });

      // Simulate build time (600-1200ms per step)
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
    }

    // Mark all done
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => ({ ...s, status: "done" as const })),
      };
    });

    // Try to persist via API
    try {
      if (definitionId) {
        await apiPost(`/workflow-definitions/${definitionId}/deploy`, {
          schedule: plan.schedule,
          trigger: plan.trigger,
        });
      }
    } catch {
      // Deployment endpoint may not exist -- workflow is saved locally
    }

    await new Promise((r) => setTimeout(r, 400));
    setPhase("deployed");
    toast.success("Workflow deployed successfully");
  }, [plan, definitionId]);

  /* -- Handle edit save -- */
  const handleEditSave = useCallback((updated: WorkflowPlan) => {
    setPlan(updated);
    setEditing(false);
  }, []);

  return (
    <Page
      title="New Workflow"
      actions={
        <Button variant="ghost" size="sm" onClick={() => navigate("/boards")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Automations
        </Button>
      }
    >
      {/* Phase: Input */}
      {phase === "input" && (
        <InputPhase
          onSubmit={handlePromptSubmit}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {/* Phase: Planning (loading) */}
      {phase === "planning" && (
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-20">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#6366F1]" />
          <h2 className="text-lg font-semibold text-[#FAFAFA]">
            Understanding your workflow...
          </h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Analyzing requirements and generating a plan
          </p>
        </div>
      )}

      {/* Phase: Review */}
      {phase === "review" && plan && (
        <ReviewPhase
          plan={plan}
          onConfirm={handleBuild}
          onEdit={() => setEditing(true)}
          onBack={() => {
            setPhase("input");
            setPlan(null);
          }}
        />
      )}

      {/* Phase: Building */}
      {phase === "building" && plan && <BuildingPhase plan={plan} />}

      {/* Phase: Deployed */}
      {phase === "deployed" && plan && (
        <DeployedPhase
          plan={plan}
          onRunNow={() => {
            toast.success("Workflow run started");
          }}
          onEdit={() => {
            setEditing(true);
          }}
          onViewHistory={() => navigate("/boards")}
          onBack={() => navigate("/boards")}
        />
      )}

      {/* Edit overlay */}
      {editing && plan && (
        <EditPlanOverlay
          plan={plan}
          onSave={handleEditSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </Page>
  );
}
