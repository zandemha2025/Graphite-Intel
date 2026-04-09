import {
  BarChart3, Radar, DollarSign, FileText, Heart, TrendingUp,
  Bot, Play, Pause, Trash2, Settings, Eye, Clock, Brain,
  Loader2, ChevronRight,
} from "lucide-react";

/* ── Types ── */

export type AgentRecord = {
  id: string;
  name: string;
  archetype: string;
  status: string;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
  description?: string;
  recentOutputs?: Array<{ id: string; summary: string; createdAt: string }>;
  memoryCount?: number;
};

export interface AgentDashboardProps {
  agents: AgentRecord[];
  loading: boolean;
  togglingId: string | null;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onViewMemory: (id: string) => void;
  onViewOutput: (id: string) => void;
}

/* ── Archetype icon mapping ── */

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "marketing-analyst": BarChart3,
  "competitive-intel": Radar,
  "finance-analyst": DollarSign,
  "content-strategist": FileText,
  "customer-success": Heart,
  "growth-engineer": TrendingUp,
};

function archetypeIcon(archetype: string): React.ComponentType<{ className?: string }> {
  return ARCHETYPE_ICONS[archetype] || Bot;
}

function archetypeLabel(archetype: string): string {
  const labels: Record<string, string> = {
    "marketing-analyst": "Marketing Analyst",
    "competitive-intel": "Competitive Intel",
    "finance-analyst": "Finance Analyst",
    "content-strategist": "Content Strategist",
    "customer-success": "Customer Success",
    "growth-engineer": "Growth Engineer",
  };
  return labels[archetype] || "Custom Agent";
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return { cls: "bg-[#D5E8D8] text-[#3C8B4E]", pulse: true };
  if (s === "paused") return { cls: "bg-[#E8E0D5] text-[#8B7A3C]", pulse: false };
  return { cls: "bg-[var(--surface-secondary)] text-[var(--text-muted)]", pulse: false };
}

/* ── Inline date format helper ── */
function formatDate(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/* ── Component ── */

export function AgentDashboard({
  agents,
  loading,
  togglingId,
  onPause,
  onResume,
  onDelete,
  onViewMemory,
  onViewOutput,
}: AgentDashboardProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 text-[var(--text-muted)] animate-spin" />
        <span className="ml-2 text-body-sm text-[var(--text-muted)]">Loading agents...</span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <Bot className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-body-sm font-medium text-[var(--text-primary)] mb-1">No agents yet</p>
        <p className="text-caption text-[var(--text-muted)]">Create a domain-specific agent to start automating intelligence gathering.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {agents.map((agent) => {
        const Icon = archetypeIcon(agent.archetype);
        const badge = statusBadge(agent.status);
        const isActive = agent.status === "active";
        const isPaused = agent.status === "paused";

        return (
          <div
            key={agent.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:shadow-md transition-all group"
          >
            {/* Card header */}
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{agent.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{archetypeLabel(agent.archetype)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${badge.cls}`}>
                  {badge.pulse && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />}
                  {agent.status || "draft"}
                </span>
              </div>

              {/* Timing row */}
              <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
                {agent.lastRunAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last run {relativeTime(agent.lastRunAt)}
                  </span>
                )}
                {agent.nextRunAt && (
                  <span className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    Next: {formatDate(agent.nextRunAt)}
                  </span>
                )}
                {agent.schedule && !agent.lastRunAt && !agent.nextRunAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {agent.schedule}
                  </span>
                )}
              </div>

              {/* Recent output preview */}
              {agent.recentOutputs && agent.recentOutputs.length > 0 && (
                <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] px-3 py-2">
                  <p className="text-[11px] text-[var(--text-muted)] mb-1">Latest output</p>
                  <p className="text-caption text-[var(--text-secondary)] line-clamp-2">
                    {agent.recentOutputs[0].summary}
                  </p>
                </div>
              )}
            </div>

            {/* Card footer with actions */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-elevated)]/50 rounded-b-xl">
              {/* Memory indicator */}
              <button
                onClick={() => onViewMemory(agent.id)}
                className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <Brain className="h-3 w-3" />
                {agent.memoryCount != null ? `${agent.memoryCount} learned patterns` : "View memory"}
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => (isPaused ? onResume(agent.id) : onPause(agent.id))}
                  disabled={togglingId === agent.id}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {togglingId === agent.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isPaused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onViewOutput(agent.id)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                  title="View outputs"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(agent.id)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error,#c44)] hover:bg-[var(--surface)] transition-colors"
                  title="Delete agent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
