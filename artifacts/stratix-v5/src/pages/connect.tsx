import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetCompanyProfile, getGetCompanyProfileQueryKey,
  useListDocuments, getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useTabParam } from "@/hooks/use-tab-param";
import { useToast } from "@/hooks/use-toast";
import { useContextHealth } from "@/hooks/use-context-health";
import { useDefinitions } from "@/hooks/use-definitions";
import type { Definition } from "@/hooks/use-definitions";
import {
  Database, Upload, Tag, Zap, Bot, Search, Plus, Trash2,
  FileText, Settings, CheckCircle, Circle, Play, Clock,
  AlertCircle, Edit2, X, ChevronRight, Eye, RefreshCw, Bell,
  Loader2, Activity, Send, Sparkles, BarChart3, Link2, ArrowRight,
  TrendingUp, Building2, Users, FileStack, Shield, Radar,
  Pause, Terminal, Copy, ChevronDown, Power, Calendar, Hash,
  StopCircle, RotateCw, Server,
} from "lucide-react";
import { AgentBuilder } from "@/components/connect/agent-builder";
import { AgentDashboard } from "@/components/connect/agent-dashboard";
import type { AgentRecord } from "@/components/connect/agent-dashboard";
import { AgentMemory } from "@/components/connect/agent-memory";
import { MCPConfig } from "@/components/connect/mcp-config";
import { WorkflowDetail } from "@/components/connect/workflow-detail";
import { WebhookConfig } from "@/components/connect/webhook-config";

type Tab = "insights" | "sources" | "knowledge" | "definitions" | "workflows" | "agents";

/* ── Cross-reference types ── */

type SyncedDataSummary = {
  accountId: number;
  accountName: string;
  category: string;
  recordCount: number;
  lastSyncedAt?: string;
};

type CrossReference = {
  internal: string;
  external: string;
  type: "industry" | "competitor" | "pipeline" | "document";
};

/* ── Types ── */

type Connection = {
  id: number;
  name: string;
  status: string;
  category: string;
};

// Definition type imported from @/hooks/use-definitions

type WorkflowTemplate = {
  key: string;
  name: string;
  description: string;
  icon?: string;
};

type WorkflowRun = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
};

type DataSource = {
  key: string;
  name: string;
  category?: string;
  description?: string;
  icon?: string;
};

type ContextHealth = {
  score: number;
  details?: Record<string, number>;
};

type WorkflowExecution = {
  id: string;
  workflowDefinitionId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  steps?: Array<{ name: string; status: string; duration?: number; error?: string }>;
};

type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  status?: string;
  createdAt?: string;
  trigger?: string;
  schedule?: string;
  lastRunAt?: string;
};

type PipedreamWorkflow = {
  id: string;
  name: string;
  active: boolean;
  trigger?: { type?: string; cron?: string };
  lastRunAt?: string;
  createdAt?: string;
};

type GeneratedWorkflowStep = {
  name: string;
  description: string;
  type: string;
  config?: Record<string, unknown>;
};

type GeneratedWorkflow = {
  id?: string;
  workflowId?: string;
  name: string;
  description: string;
  steps: GeneratedWorkflowStep[];
  trigger?: { type?: string; schedule?: string };
};

type PipedreamLog = {
  id: string;
  ts: string;
  status: string;
  duration?: number;
  error?: string;
};

const CATEGORY_OPTIONS = [
  { value: "market", label: "Market" },
  { value: "metric", label: "Metric" },
  { value: "customer", label: "Customer" },
  { value: "competitor", label: "Competitor" },
] as const;

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    market: "bg-[#D5DDE8] text-[#3C5E8B]",
    metric: "bg-[#E8E0D5] text-[#8B7A3C]",
    customer: "bg-[#D5E8D8] text-[#3C8B4E]",
    competitor: "bg-[#E8D5C8] text-[#8B5E3C]",
  };
  return map[cat] || "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function runStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed") return { cls: "bg-[#D5E8D8] text-[#3C8B4E]", icon: CheckCircle };
  if (s === "generating" || s === "running") return { cls: "bg-[#D5DDE8] text-[#3C5E8B]", icon: Clock };
  if (s === "failed") return { cls: "bg-[#E8D5D5] text-[var(--error)]", icon: AlertCircle };
  return { cls: "bg-[var(--surface-secondary)] text-[var(--text-muted)]", icon: Circle };
}

/* ── Main ── */

export function Connect() {
  const [tab, setTab] = useTabParam<Tab>("insights", ["insights", "sources", "knowledge", "definitions", "workflows", "agents"]);

  return (
    <div>
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Connect</h1>

      <div className="flex items-center gap-1 mt-6 border-b border-[var(--border)] overflow-x-auto">
        {([
          { id: "insights" as Tab, label: "Insights", icon: Radar },
          { id: "sources" as Tab, label: "Data Sources", icon: Database },
          { id: "knowledge" as Tab, label: "Knowledge Base", icon: Upload },
          { id: "definitions" as Tab, label: "Definitions", icon: Tag },
          { id: "workflows" as Tab, label: "Workflows", icon: Zap },
          { id: "agents" as Tab, label: "Agents", icon: Bot },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "insights" && <InsightsTab onSwitchTab={setTab} />}
        {tab === "sources" && <SourcesTab />}
        {tab === "knowledge" && <KnowledgeTab />}
        {tab === "definitions" && <DefinitionsTab />}
        {tab === "workflows" && <WorkflowsTab />}
        {tab === "agents" && <AgentsTab onSwitchTab={() => setTab("workflows")} />}
      </div>
    </div>
  );
}

/* ── Insights ── */

function InsightsTab({ onSwitchTab }: { onSwitchTab: (tab: Tab) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: profile } = useGetCompanyProfile({ query: { queryKey: getGetCompanyProfileQueryKey() } });
  const { data: docs = [] } = useListDocuments({ query: { queryKey: getListDocumentsQueryKey() } });

  const contextHealth = useContextHealth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [syncedData, setSyncedData] = useState<SyncedDataSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const p = profile as unknown as Record<string, string> | undefined;
  const docList = Array.isArray(docs) ? docs as Array<{ id: number; title: string }> : [];

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/connectors/accounts/summary", { credentials: "include" }).then((r) => (r.ok ? r.json() : { accounts: [] })),
      fetch("/api/company-profile", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ]).then(async ([accountsResult]) => {
      let accts: Connection[] = [];
      if (accountsResult.status === "fulfilled") {
        accts = accountsResult.value?.accounts || [];
        setConnections(accts);
      }
      // Fetch synced data for each connected account
      if (accts.length > 0) {
        const syncResults = await Promise.allSettled(
          accts.map((a) =>
            fetch(`/api/connectors/accounts/${a.id}/synced-data`, { credentials: "include" })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => data ? { accountId: a.id, accountName: a.name, category: a.category, recordCount: data?.recordCount || data?.count || 0, lastSyncedAt: data?.lastSyncedAt } as SyncedDataSummary : null)
          )
        );
        const summaries = syncResults
          .filter((r): r is PromiseFulfilledResult<SyncedDataSummary | null> => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((v): v is SyncedDataSummary => v != null);
        setSyncedData(summaries);
      }
      setLoading(false);
    });
  }, []);

  const healthPct = contextHealth.loading ? null : contextHealth.score;
  const healthBreakdown = contextHealth.breakdown;
  const activeConnections = connections.filter((c) => c.status === "active");

  // Build cross-references
  const crossRefs: CrossReference[] = [];
  if (p?.industry) {
    crossRefs.push({ internal: `Industry: ${p.industry}`, external: "Market signals tracked for your sector", type: "industry" });
  }
  if (p?.competitors) {
    const comps = p.competitors.split(",").map((s) => s.trim()).filter(Boolean);
    if (comps.length > 0) {
      crossRefs.push({ internal: `Competitors: ${comps.join(", ")}`, external: `${comps.length} monitored, briefs available`, type: "competitor" });
    }
  }
  syncedData.forEach((sd) => {
    if (sd.recordCount > 0) {
      crossRefs.push({ internal: `${sd.accountName}: ${sd.recordCount.toLocaleString()} records synced`, external: "Correlated with market intelligence", type: "pipeline" });
    }
  });
  if (docList.length > 0) {
    crossRefs.push({ internal: `${docList.length} document${docList.length !== 1 ? "s" : ""} uploaded`, external: "Indexed for AI-powered retrieval", type: "document" });
  }

  // Build nudges from health breakdown — data-driven
  const nudges: Array<{ message: string; action: () => void; actionLabel: string }> = [];
  if (!healthBreakdown.sources.complete) {
    nudges.push({ message: "Connect Salesforce to correlate pipeline data with market signals", action: () => onSwitchTab("sources"), actionLabel: "Add Data Source" });
  }
  if (!healthBreakdown.documents.complete) {
    nudges.push({ message: "Upload strategy docs to enrich AI context", action: () => onSwitchTab("knowledge"), actionLabel: "Upload Documents" });
  }
  if (!healthBreakdown.profile.complete) {
    nudges.push({ message: "Complete your company profile for personalized intelligence", action: () => setLocation("/settings"), actionLabel: "Set Up Profile" });
  }
  if (!healthBreakdown.definitions.complete) {
    nudges.push({ message: "Define key terms so AI understands your business language", action: () => onSwitchTab("definitions"), actionLabel: "Add Definitions" });
  }

  const handleRunAnalysis = () => {
    const prompt = encodeURIComponent("Analyze my business based on all connected data");
    setLocation(`/solve?q=${prompt}`);
  };

  const handleGenerateBrief = async () => {
    setGeneratingBrief(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "weekly_intelligence_brief" }),
      });
      if (res.ok) {
        toast({ title: "Brief generation started", description: "Your weekly intelligence brief is being generated.", duration: 3000 });
      } else {
        toast({ title: "Brief generation failed", description: `Could not generate brief: ${res.statusText}`, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to reach the server.", duration: 2000 });
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const results = await Promise.allSettled(
        connections.map((c) =>
          fetch(`/api/connectors/accounts/${c.id}/sync`, { method: "POST", credentials: "include" })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      toast({ title: "Sync initiated", description: `Sync started for ${succeeded} of ${connections.length} connections.`, duration: 3000 });
    } catch {
      toast({ title: "Sync error", description: "Failed to sync connections.", duration: 2000 });
    } finally {
      setTimeout(() => setSyncingAll(false), 1500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 text-[var(--text-muted)] animate-spin" />
        <span className="ml-2 text-body-sm text-[var(--text-muted)]">Loading insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Data Overview Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Context Health Score */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative h-14 w-14 shrink-0">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  stroke="var(--accent)" strokeWidth="2.5"
                  strokeDasharray={`${healthPct ?? 0} ${100 - (healthPct ?? 0)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[var(--text-primary)]">
                {healthPct ?? 0}%
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Context Health</h3>
              <p className="text-caption text-[var(--text-muted)]">
                {healthPct != null && healthPct >= 75
                  ? "Strong"
                  : healthPct != null && healthPct >= 40
                    ? "Moderate"
                    : "Needs data"}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-3 border-t border-[var(--border)]">
            {Object.values(healthBreakdown).map((item) => (
              <div key={item.label} className="text-center flex-1">
                <div className={`text-body-sm font-medium ${item.complete ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                  {item.complete ? "Done" : "Missing"}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[22px] font-bold text-[var(--text-primary)] leading-none">{connections.length}</div>
              <p className="text-caption text-[var(--text-muted)]">Connected</p>
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--border)]">
            {activeConnections.length > 0 ? (
              <div className="space-y-1">
                {activeConnections.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    <span className="text-caption text-[var(--text-secondary)] truncate">{c.name}</span>
                  </div>
                ))}
                {activeConnections.length > 3 && (
                  <p className="text-[11px] text-[var(--text-muted)]">+{activeConnections.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-caption text-[var(--text-muted)]">No active connections</p>
            )}
          </div>
        </div>

        {/* Documents Uploaded */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <FileStack className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <div className="text-[22px] font-bold text-[var(--text-primary)] leading-none">{docList.length}</div>
              <p className="text-caption text-[var(--text-muted)]">Documents</p>
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--border)]">
            {docList.length > 0 ? (
              <div className="space-y-1">
                {docList.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                    <span className="text-caption text-[var(--text-secondary)] truncate">{d.title}</span>
                  </div>
                ))}
                {docList.length > 3 && (
                  <p className="text-[11px] text-[var(--text-muted)]">+{docList.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-caption text-[var(--text-muted)]">No documents uploaded</p>
            )}
          </div>
        </div>

        {/* Company Profile */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Profile</h3>
              <p className="text-caption text-[var(--text-muted)]">
                {p?.companyName ? "Configured" : "Not set up"}
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-[var(--border)]">
            {p?.companyName ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-caption text-[var(--text-muted)]">Name:</span>
                  <span className="text-caption text-[var(--text-secondary)] truncate">{p.companyName}</span>
                </div>
                {p.industry && (
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-[var(--text-muted)]">Industry:</span>
                    <span className="text-caption text-[var(--text-secondary)]">{p.industry}</span>
                  </div>
                )}
                {p.stage && (
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-[var(--text-muted)]">Stage:</span>
                    <span className="text-caption text-[var(--text-secondary)]">{p.stage}</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLocation("/settings")}
                className="text-caption text-[var(--accent)] hover:underline"
              >
                Set up company profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cross-Reference View ── */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-heading-sm text-[var(--text-primary)]">Your Data + Market Intelligence</h3>
            <p className="text-caption text-[var(--text-muted)]">How your internal data correlates with external signals</p>
          </div>
        </div>

        {crossRefs.length > 0 ? (
          <div className="space-y-3">
            {crossRefs.map((cr, i) => {
              const iconMap: Record<CrossReference["type"], typeof TrendingUp> = {
                industry: BarChart3,
                competitor: Shield,
                pipeline: Users,
                document: FileText,
              };
              const Icon = iconMap[cr.type];
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border)]"
                >
                  <Icon className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-[var(--text-primary)]">{cr.internal}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ArrowRight className="h-3 w-3 text-[var(--accent)]" />
                      <span className="text-caption text-[var(--text-secondary)]">{cr.external}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-body-sm text-[var(--text-muted)]">No data connected yet. Add sources to see cross-references.</p>
          </div>
        )}

        {/* Nudges for thin data */}
        {nudges.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-caption font-medium text-[var(--text-muted)] uppercase tracking-wider">Recommendations</p>
            {nudges.map((nudge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <p className="text-body-sm text-[var(--text-secondary)] flex-1">{nudge.message}</p>
                <button
                  onClick={nudge.action}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors"
                >
                  {nudge.actionLabel}
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleRunAnalysis}
          className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all text-left"
        >
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-[var(--text-primary)]">Run Full Analysis</p>
            <p className="text-caption text-[var(--text-muted)]">Analyze all connected data in Solve</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] ml-auto shrink-0" />
        </button>

        <button
          onClick={handleGenerateBrief}
          disabled={generatingBrief}
          className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all text-left disabled:opacity-50"
        >
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            {generatingBrief ? (
              <Loader2 className="h-5 w-5 text-[var(--accent)] animate-spin" />
            ) : (
              <FileText className="h-5 w-5 text-[var(--accent)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-[var(--text-primary)]">Generate Weekly Brief</p>
            <p className="text-caption text-[var(--text-muted)]">Create an intelligence summary report</p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] ml-auto shrink-0" />
        </button>

        <button
          onClick={handleSyncAll}
          disabled={syncingAll || connections.length === 0}
          className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all text-left disabled:opacity-50"
        >
          <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            {syncingAll ? (
              <Loader2 className="h-5 w-5 text-[var(--accent)] animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 text-[var(--accent)]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-[var(--text-primary)]">Sync All Data</p>
            <p className="text-caption text-[var(--text-muted)]">
              {connections.length > 0
                ? `Refresh ${connections.length} connection${connections.length !== 1 ? "s" : ""}`
                : "No connections to sync"}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] ml-auto shrink-0" />
        </button>
      </div>
    </div>
  );
}

/* ── Data Sources ── */

const SOURCE_COLORS: Record<string, string> = {
  salesforce: "bg-blue-100 text-blue-700",
  hubspot: "bg-orange-100 text-orange-700",
  google_analytics: "bg-green-100 text-green-700",
  slack: "bg-purple-100 text-purple-700",
  gong: "bg-red-100 text-red-700",
  snowflake: "bg-cyan-100 text-cyan-700",
};

const FALLBACK_SOURCES: DataSource[] = [
  { key: "salesforce", name: "Salesforce", category: "CRM" },
  { key: "hubspot", name: "HubSpot", category: "CRM" },
  { key: "google_analytics", name: "Google Analytics", category: "Analytics" },
  { key: "slack", name: "Slack", category: "Communication" },
  { key: "gong", name: "Gong", category: "Revenue" },
  { key: "snowflake", name: "Snowflake", category: "Data Warehouse" },
];

function SourcesTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: profile } = useGetCompanyProfile({ query: { queryKey: getGetCompanyProfileQueryKey() } });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const contextHealth = useContextHealth();

  useEffect(() => {
    // Fetch data sources and connected accounts in parallel
    Promise.allSettled([
      fetch("/api/connectors/sources", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/connectors/accounts/summary", { credentials: "include" }).then((r) => (r.ok ? r.json() : { accounts: [] })),
    ]).then(([sourcesResult, accountsResult]) => {
      if (sourcesResult.status === "fulfilled" && sourcesResult.value) {
        const raw = sourcesResult.value;
        const arr = Array.isArray(raw) ? raw : raw?.sources || raw?.data || [];
        // Normalize: API uses "label" but frontend expects "name"
        const list: DataSource[] = arr.map((s: Record<string, unknown>) => ({
          key: (s.key || s.appSlug || "") as string,
          name: (s.name || s.label || s.key || "") as string,
          category: (s.category || "") as string,
          description: (s.description || "") as string,
          icon: (s.icon || "") as string,
        }));
        setSources(list.length > 0 ? list : FALLBACK_SOURCES);
      } else {
        setSources(FALLBACK_SOURCES);
      }
      setSourcesLoading(false);
      if (accountsResult.status === "fulfilled") {
        setConnections(accountsResult.value?.accounts || []);
      }
    });
  }, []);

  const p = profile as unknown as Record<string, string> | undefined;

  const handleConnectClick = async (source: DataSource) => {
    setConnecting(source.key);
    try {
      // 1. Get a Pipedream Connect token for this data source
      const tokenRes = await fetch("/api/connectors/token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.key }),
      });
      if (!tokenRes.ok) {
        toast({
          title: "Connection setup failed",
          description: `Could not create token for ${source.name}. ${tokenRes.statusText}`,
          duration: 3000,
        });
        return;
      }
      const tokenData = await tokenRes.json();
      const token = tokenData.token;
      if (!token) {
        toast({ title: "Connection setup failed", description: "No token returned from server.", duration: 3000 });
        return;
      }

      // 2. Open Pipedream Connect OAuth in a popup
      const appSlug = source.key.toLowerCase().replace(/[\s_]+/g, "-");
      const connectUrl = `https://pipedream.com/connect?token=${encodeURIComponent(token)}&app=${encodeURIComponent(appSlug)}`;
      const popup = window.open(connectUrl, "pipedream-connect", "width=600,height=700,left=200,top=100");

      // 3. Poll for popup close, then register the connected account
      const pollInterval = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          // Register the connected account with our backend
          try {
            const registerRes = await fetch("/api/connectors/accounts", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pipedream_account_id: token,
                data_source: source.key,
                name: source.name,
              }),
            });
            if (registerRes.ok) {
              const account = await registerRes.json();
              setConnections((prev) => [
                ...prev,
                { id: account.id || Date.now(), name: source.name, status: "active", category: source.category || "integration" },
              ]);
              toast({ title: "Connected", description: `${source.name} has been connected successfully.`, duration: 3000 });
            } else {
              toast({ title: "Registration failed", description: `Connected but could not register ${source.name}. Try refreshing.`, duration: 4000 });
            }
          } catch {
            toast({ title: "Registration error", description: "Connection may have succeeded. Try refreshing the page.", duration: 4000 });
          }
          setConnecting(null);
        }
      }, 500);

      // Safety timeout: stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setConnecting(null);
      }, 300000);
    } catch {
      toast({
        title: "Connection error",
        description: `Failed to reach the server for ${source.name}. Please try again.`,
        duration: 3000,
      });
      setConnecting(null);
    }
  };

  const handleSyncNow = async (connectionId: number) => {
    setSyncing(connectionId);
    try {
      const res = await fetch(`/api/connectors/accounts/${connectionId}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Sync initiated", description: "Data synchronization has started.", duration: 2000 });
      } else {
        toast({ title: "Sync failed", description: `Could not start sync: ${res.statusText}`, duration: 2000 });
      }
    } catch {
      toast({ title: "Sync error", description: "Failed to reach the server.", duration: 2000 });
    } finally {
      setTimeout(() => setSyncing(null), 1500);
    }
  };

  const healthPct = contextHealth.loading ? null : contextHealth.score;
  const healthBreakdown = contextHealth.breakdown;

  return (
    <div className="space-y-6">
      {/* Context Health Score */}
      {healthPct != null && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="var(--accent)" strokeWidth="3"
                strokeDasharray={`${healthPct} ${100 - healthPct}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)]">
              {healthPct}%
            </span>
          </div>
          <div>
            <h3 className="text-heading-sm text-[var(--text-primary)]">Context Health</h3>
            <p className="text-caption text-[var(--text-muted)]">
              {healthPct >= 75
                ? "Your intelligence context is strong."
                : healthPct >= 40
                  ? "Add more data sources to improve results."
                  : "Connect sources and upload documents for better intelligence."}
            </p>
          </div>
          <div className="ml-auto flex gap-4 text-caption text-[var(--text-muted)]">
            {Object.values(healthBreakdown).map((item) => (
              <div key={item.label} className="text-center">
                <div className={`text-body-sm font-medium ${item.complete ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                  {item.complete ? "Done" : "Missing"}
                </div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company profile card */}
      {p && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-heading-sm text-[var(--text-primary)]">Company Profile</h3>
            <button
              onClick={() => setLocation("/settings")}
              className="flex items-center gap-1.5 text-caption text-[var(--accent)] font-medium hover:underline"
            >
              <Settings className="h-3 w-3" />
              Edit in Settings
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            {p.companyName && (
              <div>
                <span className="text-[var(--text-muted)]">Company:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.companyName}</span>
              </div>
            )}
            {p.industry && (
              <div>
                <span className="text-[var(--text-muted)]">Industry:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.industry}</span>
              </div>
            )}
            {p.stage && (
              <div>
                <span className="text-[var(--text-muted)]">Stage:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.stage}</span>
              </div>
            )}
            {p.revenueRange && (
              <div>
                <span className="text-[var(--text-muted)]">Revenue:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.revenueRange}</span>
              </div>
            )}
          </div>
          {!p.companyName && (
            <p className="text-caption text-[var(--text-muted)] mt-2">
              No company profile set up yet.{" "}
              <button onClick={() => setLocation("/settings")} className="text-[var(--accent)] hover:underline">
                Configure now
              </button>
            </p>
          )}
        </div>
      )}

      {/* Integrations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-sm text-[var(--text-primary)]">Integrations</h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Connection
          </button>
        </div>

        {/* Connected accounts */}
        {connections.length > 0 && (
          <div className="space-y-2 mb-4">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                  {c.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                  <p className="text-caption text-[var(--text-muted)]">{c.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSyncNow(c.id)}
                    disabled={syncing === c.id}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                    title="Sync now"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing === c.id ? "animate-spin" : ""}`} />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${c.status === "active" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
                    <span className={`text-caption ${c.status === "active" ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available sources from API */}
        {sourcesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-[var(--text-muted)] animate-spin" />
            <span className="ml-2 text-body-sm text-[var(--text-muted)]">Loading data sources...</span>
          </div>
        ) : (
          <div>
            <p className="text-body-sm text-[var(--text-muted)] mb-3">
              {connections.length === 0
                ? "No connections yet. Select from available integrations to get started."
                : "Connect additional data sources to enrich your intelligence."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sources.map((source) => {
                const colorKey = source.key?.toLowerCase() || source.name?.toLowerCase().replace(/\s+/g, "_");
                const color = SOURCE_COLORS[colorKey] || "bg-[var(--surface-secondary)] text-[var(--text-muted)]";
                return (
                  <div
                    key={source.key || source.name}
                    className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center text-sm font-bold ${color}`}>
                        {source.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-body-sm font-medium text-[var(--text-primary)]">{source.name}</h4>
                        <p className="text-caption text-[var(--text-muted)]">{source.category || source.description || ""}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnectClick(source)}
                      disabled={connecting === source.key}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                    >
                      {connecting === source.key ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Connect
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Knowledge Base ── */

function KnowledgeTab() {
  const { data: docs = [], refetch } = useListDocuments({ query: { queryKey: getListDocumentsQueryKey() } });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: number; title: string; snippet?: string; score?: number }> | null>(null);
  const [searching, setSearching] = useState(false);

  const handleProcess = async (docId: number, title: string) => {
    setProcessing(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/process`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Processing started", description: `${title} is being processed and extracted.`, duration: 2000 });
        await refetch();
      } else {
        toast({ title: "Processing failed", description: `Could not process ${title}: ${res.statusText}`, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to process document.", duration: 2000 });
    } finally {
      setProcessing(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch("/api/documents/search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : data?.results || data?.documents || [];
        setSearchResults(results);
      } else {
        toast({ title: "Search failed", description: res.statusText, duration: 2000 });
      }
    } catch {
      toast({ title: "Search error", description: "Could not search documents.", duration: 2000 });
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setUploadProgress(`Uploading ${file.name}...`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.ok) {
          setUploadProgress("Upload complete. Processing...");
          await refetch();
          setUploadProgress(null);
        } else {
          setUploadProgress(`Upload failed: ${res.statusText}`);
          setTimeout(() => setUploadProgress(null), 3000);
        }
      } catch {
        setUploadProgress("Upload failed. Please try again.");
        setTimeout(() => setUploadProgress(null), 3000);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [refetch]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleUpload({ target: { files: dataTransfer.files } } as any);
    }
  };

  const handleDelete = async (docId: number, title: string) => {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({
          title: "Document deleted",
          description: `${title} has been removed from your knowledge base.`,
          duration: 2000,
        });
        await refetch();
      } else {
        toast({
          title: "Delete failed",
          description: "Could not delete the document. Please try again.",
          duration: 2000,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred while deleting the document.",
        duration: 2000,
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-[var(--text-secondary)]">
          Upload documents to build your knowledge base.
        </p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Search results */}
      {searchResults != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-caption text-[var(--text-muted)]">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            <button
              onClick={() => { setSearchResults(null); setSearchQuery(""); }}
              className="text-caption text-[var(--accent)] hover:underline"
            >
              Clear search
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-body-sm text-[var(--text-muted)] py-4 text-center">No matching documents found.</p>
          ) : (
            searchResults.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--accent)]/5"
              >
                <Search className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                  {r.snippet && (
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.snippet}</p>
                  )}
                </div>
                {r.score != null && (
                  <span className="text-caption text-[var(--text-muted)] shrink-0">
                    {Math.round(r.score * 100)}% match
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Drag and drop zone */}
      {(Array.isArray(docs) ? docs as Array<{ id: number; title: string; chunkCount?: number; size?: number }> : []).length === 0 && !uploadProgress && searchResults == null && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-8 rounded-[var(--radius-lg)] border-2 border-dashed transition-all ${
            dragOver
              ? "border-[var(--accent)] bg-[var(--accent)]/5"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="h-8 w-8 text-[var(--text-muted)] mb-2" />
            <p className="text-body-sm font-medium text-[var(--text-primary)]">Drag files here to upload</p>
            <p className="text-caption text-[var(--text-muted)] mt-1">
              or click the Upload button above
            </p>
            <p className="text-caption text-[var(--text-muted)] mt-2">
              Supported formats: PDF, DOC, DOCX, TXT, CSV, XLSX
            </p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-body-sm text-[var(--accent)]">
          <div className="h-3 w-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          {uploadProgress}
        </div>
      )}

      {/* Document list */}
      {(Array.isArray(docs) ? docs as Array<{ id: number; title: string; chunkCount?: number; size?: number }> : []).length === 0 ? (
        !uploadProgress && (
          <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No documents uploaded yet.</p>
        )
      ) : (
        <div className="space-y-2">
          {(Array.isArray(docs) ? docs as Array<{ id: number; title: string; chunkCount?: number; size?: number }> : []).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <FileText className="h-4 w-4 text-[var(--accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">
                  {d.title}
                </p>
                <p className="text-caption text-[var(--text-muted)]">
                  {d.size ? formatFileSize(d.size) : "—"}
                </p>
              </div>
              {d.chunkCount != null && (
                <span className="text-caption text-[var(--text-muted)] shrink-0">
                  {d.chunkCount} chunks
                </span>
              )}
              <button
                onClick={() => handleProcess(d.id, d.title)}
                disabled={processing === d.id}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50 shrink-0"
                title="Process document"
              >
                {processing === d.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => handleDelete(d.id, d.title)}
                disabled={deleting === d.id}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50 shrink-0"
                title="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Definitions ── */

function DefinitionsTab() {
  const { definitions, loading, addDefinition, updateDefinition, deleteDefinition } = useDefinitions();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ term: "", value: "", category: "market" as Definition["category"] });

  const resetForm = () => {
    setForm({ term: "", value: "", category: "market" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.term.trim() || !form.value.trim()) return;
    if (editingId) {
      updateDefinition(editingId, { term: form.term, value: form.value, category: form.category });
    } else {
      addDefinition({ term: form.term, value: form.value, category: form.category });
    }
    resetForm();
  };

  const handleEdit = (def: Definition) => {
    setForm({ term: def.term, value: def.value, category: def.category });
    setEditingId(def.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteDefinition(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-[var(--text-secondary)]">
          Define terms, metrics, and competitors so AI understands your business language.
        </p>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Definition
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <span className="ml-2 text-body-sm text-[var(--text-muted)]">Loading definitions...</span>
        </div>
      )}

      {/* Add/Edit form */}
      {!loading && showForm && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-[var(--surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-body-sm font-medium text-[var(--text-primary)]">
              {editingId ? "Edit Definition" : "New Definition"}
            </h4>
            <button onClick={resetForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Term (e.g. CAC, LTV)"
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            placeholder="Definition or value..."
            rows={2}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Definition["category"] }))}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={resetForm}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] text-body-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.term.trim() || !form.value.trim()}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Definition list */}
      {!loading && definitions.length === 0 ? (
        <p className="text-body-sm text-[var(--text-muted)] py-12 text-center">No definitions yet.</p>
      ) : (
        <div className="space-y-2">
          {definitions.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-body-sm font-medium text-[var(--text-primary)]">{d.term}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${categoryColor(d.category)}`}>
                    {d.category}
                  </span>
                </div>
                <p className="text-caption text-[var(--text-secondary)]">{d.value}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(d)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Workflows ── */

function WorkflowsTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Existing state
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [expandedExec, setExpandedExec] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<WorkflowExecution["steps"]>(undefined);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  // Prompt-to-Workflow builder state
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [testing, setTesting] = useState(false);

  // Deployed Pipedream workflows
  const [deployedWorkflows, setDeployedWorkflows] = useState<PipedreamWorkflow[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<PipedreamLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState<string | null>(null);

  // Panel state for MCP, Webhook, and Workflow Detail
  const [mcpOpen, setMcpOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [detailWorkflowId, setDetailWorkflowId] = useState<string | null>(null);

  const EXAMPLE_PROMPTS = [
    "Every Monday, pull Salesforce pipeline data and generate a competitive brief",
    "When a new Gong call is recorded, extract key insights and update the company profile",
    "Daily at 8am, monitor competitor websites and send me a Slack summary",
  ];

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/workflow-definitions", { credentials: "include", method: "GET" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/workflow-executions", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/workflows/templates", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/pipedream/workflows", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([defsResult, execsResult, tplResult, pdResult]) => {
      if (defsResult.status === "fulfilled") {
        const raw = defsResult.value;
        setDefinitions(Array.isArray(raw) ? raw : raw?.definitions || raw?.data || []);
      }
      if (execsResult.status === "fulfilled") {
        const raw = execsResult.value;
        setExecutions(Array.isArray(raw) ? raw : raw?.executions || raw?.data || []);
      }
      if (tplResult.status === "fulfilled") {
        const raw = tplResult.value;
        setTemplates(Array.isArray(raw) ? raw : raw?.templates || []);
      }
      if (pdResult.status === "fulfilled") {
        const raw = pdResult.value;
        setDeployedWorkflows(Array.isArray(raw) ? raw : raw?.workflows || raw?.data || []);
      }
    });
  }, []);

  /* ── Prompt to Workflow: Generate ── */
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedWorkflow(null);
    try {
      const res = await fetch("/api/pipedream/workflows/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: prompt.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedWorkflow(data);
        toast({ title: "Workflow generated", description: "Review the steps below, then deploy.", duration: 3000 });
      } else {
        toast({ title: "Generation failed", description: `Could not generate workflow: ${res.statusText}`, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate workflow. Please try again.", duration: 2000 });
    } finally {
      setGenerating(false);
    }
  };

  /* ── Deploy generated workflow ── */
  const handleDeploy = async () => {
    if (!generatedWorkflow) return;
    setDeploying(true);
    try {
      const workflowId = generatedWorkflow.workflowId || generatedWorkflow.id;
      const res = await fetch("/api/pipedream/workflows/deploy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });
      if (res.ok) {
        const deployed = await res.json();
        toast({ title: "Workflow deployed", description: `"${generatedWorkflow.name}" is now live.`, duration: 3000 });
        setDeployedWorkflows((prev) => [
          { id: deployed.id || workflowId || crypto.randomUUID(), name: generatedWorkflow.name, active: true, createdAt: new Date().toISOString() },
          ...prev,
        ]);
        setGeneratedWorkflow(null);
        setPrompt("");
      } else {
        toast({ title: "Deploy failed", description: res.statusText, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to deploy workflow.", duration: 2000 });
    } finally {
      setDeploying(false);
    }
  };

  /* ── Test generated workflow (Pipedream dry-run) ── */
  const handleTest = async () => {
    if (!generatedWorkflow) return;
    const wfId = generatedWorkflow.workflowId || generatedWorkflow.id;
    if (!wfId) {
      toast({ title: "Cannot test", description: "No workflow ID available for testing.", duration: 2000 });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`/api/pipedream/workflows/${wfId}/test`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        toast({
          title: "Test complete",
          description: result.status === "passed" ? "Dry run succeeded." : `Dry run: ${result.status || "done"}`,
          duration: 3000,
        });
      } else {
        toast({ title: "Test failed", description: res.statusText, duration: 3000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to test workflow.", duration: 2000 });
    } finally {
      setTesting(false);
    }
  };

  /* ── View logs for a deployed workflow ── */
  const handleViewLogs = async (wfId: string) => {
    if (expandedLogs === wfId) {
      setExpandedLogs(null);
      setWorkflowLogs([]);
      return;
    }
    setExpandedLogs(wfId);
    setWorkflowLogs([]);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/pipedream/workflows/${wfId}/logs`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkflowLogs(Array.isArray(data) ? data : data?.logs || data?.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoadingLogs(false); }
  };

  /* ── Delete a deployed workflow ── */
  const handleDeleteWorkflow = async (wfId: string) => {
    setDeletingWorkflow(wfId);
    try {
      const res = await fetch(`/api/pipedream/workflows/${wfId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setDeployedWorkflows((prev) => prev.filter((w) => w.id !== wfId));
        toast({ title: "Workflow deleted", duration: 2000 });
      } else {
        toast({ title: "Delete failed", description: res.statusText, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete workflow.", duration: 2000 });
    } finally {
      setDeletingWorkflow(null);
    }
  };

  /* ── View execution step traces ── */
  const handleViewSteps = async (execId: string) => {
    if (expandedExec === execId) {
      setExpandedExec(null);
      setExpandedSteps(undefined);
      return;
    }
    setExpandedExec(execId);
    setExpandedSteps(undefined);
    try {
      const res = await fetch(`/api/workflow-executions/${execId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExpandedSteps(data.steps || []);
      }
    } catch { /* ignore */ }
  };

  const stepTypeIcon = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("trigger") || t.includes("schedule") || t.includes("cron")) return Clock;
    if (t.includes("api") || t.includes("http") || t.includes("fetch")) return Link2;
    if (t.includes("ai") || t.includes("claude") || t.includes("llm")) return Sparkles;
    if (t.includes("notify") || t.includes("slack") || t.includes("email")) return Send;
    if (t.includes("transform") || t.includes("filter")) return Activity;
    return Terminal;
  };

  return (
    <div className="space-y-8">

      {/* Panel overlays */}
      <MCPConfig open={mcpOpen} onClose={() => setMcpOpen(false)} />
      <WebhookConfig open={webhookOpen} onClose={() => setWebhookOpen(false)} />
      {detailWorkflowId && (
        <WorkflowDetail
          workflowId={detailWorkflowId}
          open={!!detailWorkflowId}
          onClose={() => setDetailWorkflowId(null)}
        />
      )}

      {/* Quick-access toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMcpOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)]/40 transition-colors"
        >
          <Server className="h-3.5 w-3.5 text-[var(--accent)]" />
          MCP Server
        </button>
        <button
          onClick={() => setWebhookOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] hover:border-[var(--accent)]/40 transition-colors"
        >
          <Link2 className="h-3.5 w-3.5 text-[var(--accent)]" />
          Webhooks
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          1. PROMPT TO WORKFLOW — Hero Section
          ═══════════════════════════════════════════ */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/20 bg-[var(--surface)] p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="h-11 w-11 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-editorial text-[20px] text-[var(--text-primary)]">Describe it, we build it</h3>
            <p className="text-body-sm text-[var(--text-secondary)] mt-0.5">
              Tell us what you want to automate in plain language. Stratix generates the workflow, you review and deploy.
            </p>
          </div>
        </div>

        <textarea
          placeholder="Describe what you want to automate..."
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
        />

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-caption text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] transition-colors text-left"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating workflow...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Build Workflow
              </>
            )}
          </button>
        </div>

        {/* ── Generated workflow preview ── */}
        {generatedWorkflow && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--surface-elevated)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-body-sm font-medium text-[var(--text-primary)]">{generatedWorkflow.name}</h4>
                <p className="text-caption text-[var(--text-secondary)] mt-0.5">{generatedWorkflow.description}</p>
              </div>
              <button
                onClick={() => setGeneratedWorkflow(null)}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step list */}
            <div className="space-y-2">
              {generatedWorkflow.steps.map((step, i) => {
                const StepIcon = stepTypeIcon(step.type);
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <span className="h-5 w-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                        {i + 1}
                      </span>
                      <StepIcon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-[var(--text-primary)]">{step.name}</p>
                      <p className="text-caption text-[var(--text-secondary)]">{step.description}</p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                      {step.type}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Deploy / Test buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {deploying ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deploying...</>
                ) : (
                  <><Power className="h-3.5 w-3.5" /> Deploy</>
                )}
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...</>
                ) : (
                  <><Play className="h-3.5 w-3.5 text-[var(--accent)]" /> Test</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          2. DEPLOYED WORKFLOWS (Pipedream)
          ═══════════════════════════════════════════ */}
      {deployedWorkflows.length > 0 && (
        <div>
          <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Deployed Workflows</h3>
          <div className="space-y-2">
            {deployedWorkflows.map((wf) => {
              const isLogsOpen = expandedLogs === wf.id;
              return (
                <div key={wf.id}>
                  <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors">
                    <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailWorkflowId(wf.id)}>
                      <p className="text-body-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">{wf.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {wf.trigger?.cron && (
                          <span className="text-caption text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {wf.trigger.cron}
                          </span>
                        )}
                        {wf.lastRunAt && (
                          <span className="text-caption text-[var(--text-muted)]">
                            Last run: {format(new Date(wf.lastRunAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${wf.active ? "bg-[#D5E8D8] text-[#3C8B4E]" : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"}`}>
                      {wf.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleViewLogs(wf.id)}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
                      title="View logs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      disabled={deletingWorkflow === wf.id}
                      className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingWorkflow === wf.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Inline logs */}
                  {isLogsOpen && (
                    <div className="ml-6 mt-1 mb-2 border-l-2 border-[var(--border)] pl-4 space-y-1.5">
                      {loadingLogs ? (
                        <div className="flex items-center gap-2 py-2 text-caption text-[var(--text-muted)]">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading logs...
                        </div>
                      ) : workflowLogs.length === 0 ? (
                        <p className="text-caption text-[var(--text-muted)] py-2">No execution logs yet.</p>
                      ) : (
                        workflowLogs.map((log) => {
                          const logBadge = runStatusBadge(log.status);
                          return (
                            <div key={log.id} className="flex items-center gap-2 py-1">
                              <logBadge.icon className="h-3 w-3 shrink-0" />
                              <span className="text-caption text-[var(--text-primary)]">{log.ts && format(new Date(log.ts), "MMM d, yyyy")}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${logBadge.cls}`}>{log.status}</span>
                              {log.duration != null && (
                                <span className="text-[11px] text-[var(--text-muted)]">{log.duration}ms</span>
                              )}
                              {log.error && (
                                <span className="text-[11px] text-[var(--error)] truncate max-w-[200px]">{log.error}</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          3. LEGACY WORKFLOW DEFINITIONS
          ═══════════════════════════════════════════ */}
      {definitions.length > 0 && (
        <div>
          <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Your Workflows</h3>
          <div className="space-y-2">
            {definitions.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">{d.name}</p>
                  <p className="text-caption text-[var(--text-secondary)] truncate">{d.description}</p>
                </div>
                {d.status && (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${runStatusBadge(d.status).cls}`}>
                    {d.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          4. TEMPLATES (existing)
          ═══════════════════════════════════════════ */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div
                key={t.key}
                onClick={() => setLocation(`/connect/workflows/${t.key}`)}
                className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-body-sm font-medium text-[var(--text-primary)]">{t.name}</h4>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setLocation(`/connect/workflows/${t.key}`); }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors w-full justify-center"
                >
                  <Play className="h-3 w-3" />
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          5. EXECUTION HISTORY (enhanced)
          ═══════════════════════════════════════════ */}
      <div>
        <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Execution History</h3>
        {executions.length === 0 ? (
          <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No workflow executions yet.</p>
        ) : (
          <div className="space-y-2">
            {executions.map((ex) => {
              const badge = runStatusBadge(ex.status);
              const isExpanded = expandedExec === ex.id;
              const isRunning = ex.status === "running" || ex.status === "generating";
              return (
                <div key={ex.id}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                    onClick={() => handleViewSteps(ex.id)}
                  >
                    <div className="relative shrink-0">
                      <badge.icon className="h-4 w-4" style={{ color: "currentColor" }} />
                      {isRunning && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#3C5E8B] animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">
                        Execution {ex.id.slice(0, 8)}...
                      </p>
                      <p className="text-caption text-[var(--text-muted)]">
                        {ex.startedAt && format(new Date(ex.startedAt), "MMM d, yyyy")}
                        {ex.completedAt && ex.startedAt && (
                          <span className="ml-2 text-[var(--text-muted)]">
                            ({Math.round((new Date(ex.completedAt).getTime() - new Date(ex.startedAt).getTime()) / 1000)}s)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                      {isRunning && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />}
                      {ex.status}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                  {/* Step traces */}
                  {isExpanded && (
                    <div className="ml-6 mt-1 mb-2 border-l-2 border-[var(--border)] pl-4 space-y-1.5">
                      {expandedSteps === undefined ? (
                        <div className="flex items-center gap-2 py-2 text-caption text-[var(--text-muted)]">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading steps...
                        </div>
                      ) : expandedSteps.length === 0 ? (
                        <p className="text-caption text-[var(--text-muted)] py-2">No step details available.</p>
                      ) : (
                        expandedSteps.map((step, i) => {
                          const stepBadge = runStatusBadge(step.status);
                          const isStepRunning = step.status === "running";
                          return (
                            <div key={i} className="flex items-center gap-2 py-1">
                              <div className="relative shrink-0">
                                <stepBadge.icon className="h-3 w-3" />
                                {isStepRunning && (
                                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#3C5E8B] animate-pulse" />
                                )}
                              </div>
                              <span className="text-caption text-[var(--text-primary)]">{step.name}</span>
                              {step.duration != null && (
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  {step.duration}ms
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${stepBadge.cls}`}>
                                {step.status}
                              </span>
                              {step.error && (
                                <span className="text-[11px] text-[var(--error)] truncate max-w-[200px]">
                                  {step.error}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Deliveries */}
      <ScheduledDeliveries />
    </div>
  );
}

/* ── Scheduled Deliveries ── */

type ReportSchedule = {
  id: string;
  reportTitle: string;
  channel: "email" | "slack";
  destination: string;
  frequency: "daily" | "weekly";
  active: boolean;
  nextDelivery?: string;
};

function ScheduledDeliveries() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports/schedules", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSchedules(Array.isArray(d) ? d : d?.schedules || []))
      .catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
      toast({ title: active ? "Schedule resumed" : "Schedule paused" });
    } catch {
      toast({ title: "Failed to update schedule", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Schedule deleted" });
    } catch {
      toast({ title: "Failed to delete schedule", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Scheduled Deliveries</h3>
      </div>

      {loading ? (
        <div className="py-4 text-center text-caption text-[var(--text-muted)]">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-caption text-[var(--text-muted)]">
            No scheduled deliveries. Generate a report in Intelligence and use "Deliver" to set one up.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{s.reportTitle}</p>
                <p className="text-caption text-[var(--text-muted)]">
                  {s.channel === "email" ? "Email" : "Slack"}: {s.destination} -- {s.frequency}
                </p>
                {s.nextDelivery && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Next: {s.nextDelivery}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleToggle(s.id, !s.active)}
                disabled={togglingId === s.id}
                className={`px-2.5 py-1 rounded-[var(--radius-md)] text-caption font-medium transition-colors ${
                  s.active
                    ? "bg-[#D5E8D8] text-[#3C8B4E] hover:bg-[#C5D8C8]"
                    : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-elevated)]"
                }`}
              >
                {togglingId === s.id ? "..." : s.active ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Agents ── */

function AgentsTab({ onSwitchTab }: { onSwitchTab: () => void }) {
  const { toast } = useToast();

  // Builder wizard state
  const [builderOpen, setBuilderOpen] = useState(false);

  // Memory panel state
  const [memoryAgentId, setMemoryAgentId] = useState<string | null>(null);

  // Active agents list
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);

  const fetchAgents = useCallback(() => {
    setLoadingAgents(true);
    fetch("/api/pipedream/workflows", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((raw) => {
        const workflows: PipedreamWorkflow[] = Array.isArray(raw) ? raw : raw?.workflows || raw?.data || [];
        const agentWorkflows = workflows.filter(
          (w) => w.trigger?.cron || w.trigger?.type === "schedule" || w.trigger?.type === "cron"
        );
        const agentRecords: AgentRecord[] = agentWorkflows.map((w) => ({
          id: w.id,
          name: w.name,
          archetype: (w as Record<string, unknown>).archetype as string || "custom",
          status: w.active ? "active" : "paused",
          lastRunAt: w.lastRunAt,
          schedule: w.trigger?.cron || "",
          description: w.name,
          memoryCount: (w as Record<string, unknown>).memoryCount as number | undefined,
        }));
        setAgents(agentRecords);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  /* ── Toggle pause/resume via Pipedream ── */
  const handleToggle = async (id: string, resume: boolean) => {
    setTogglingAgent(id);
    const endpoint = resume
      ? `/api/pipedream/workflows/${id}/activate`
      : `/api/pipedream/workflows/${id}/deactivate`;
    try {
      const res = await fetch(endpoint, { method: "POST", credentials: "include" });
      if (res.ok) {
        setAgents((prev) =>
          prev.map((a) => a.id === id ? { ...a, status: resume ? "active" : "paused" } : a)
        );
        toast({ title: resume ? "Agent resumed" : "Agent paused", duration: 2000 });
      } else {
        toast({ title: "Toggle failed", description: res.statusText, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to toggle agent.", duration: 2000 });
    } finally {
      setTogglingAgent(null);
    }
  };

  /* ── Delete agent ── */
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pipedream/workflows/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== id));
        toast({ title: "Agent deleted", duration: 2000 });
      } else {
        toast({ title: "Delete failed", description: res.statusText, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete agent.", duration: 2000 });
    }
  };

  /* ── View outputs (opens execution history in new tab / logs panel) ── */
  const handleViewOutput = async (id: string) => {
    try {
      const res = await fetch(`/api/pipedream/workflows/${id}/logs`, { credentials: "include" });
      if (res.ok) {
        const raw = await res.json();
        const logs: PipedreamLog[] = Array.isArray(raw) ? raw : raw?.logs || raw?.data || [];
        if (logs.length > 0) {
          toast({ title: `${logs.length} execution(s) found`, description: logs[0].status ? `Latest: ${logs[0].status}` : undefined, duration: 3000 });
        } else {
          toast({ title: "No executions yet", duration: 2000 });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load outputs.", duration: 2000 });
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Header with New Agent button ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-editorial text-[20px] text-[var(--text-primary)]">AI Agents</h3>
          <p className="text-body-sm text-[var(--text-secondary)] mt-0.5">
            Domain-specific agents that learn from your data and run on a schedule.
          </p>
        </div>
        <button
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="h-4 w-4" /> New Agent
        </button>
      </div>

      {/* ── Agent Dashboard (card grid) ── */}
      <AgentDashboard
        agents={agents}
        loading={loadingAgents}
        togglingId={togglingAgent}
        onPause={(id) => handleToggle(id, false)}
        onResume={(id) => handleToggle(id, true)}
        onDelete={handleDelete}
        onViewMemory={(id) => setMemoryAgentId(id)}
        onViewOutput={handleViewOutput}
      />

      {/* ── Link to workflows ── */}
      <div className="flex justify-center">
        <button
          onClick={onSwitchTab}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
          View Workflows
          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* ── Agent Builder Wizard ── */}
      <AgentBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={() => { setBuilderOpen(false); fetchAgents(); }}
      />

      {/* ── Agent Memory Panel ── */}
      <AgentMemory
        agentId={memoryAgentId || ""}
        open={memoryAgentId !== null}
        onClose={() => setMemoryAgentId(null)}
      />
    </div>
  );
}

/* ── format helper (inline to avoid extra import in workflows) ── */
function format(date: Date, fmt: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return fmt
    .replace("MMM", months[date.getMonth()])
    .replace("d", String(date.getDate()))
    .replace("yyyy", String(date.getFullYear()));
}
