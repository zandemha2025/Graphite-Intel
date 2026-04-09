import { useState, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Filter,
  Plus,
  ChevronUp,
  ChevronDown,
  Sun,
  Zap,
  Eye,
  Newspaper,
  Globe,
  Target,
  Activity,
} from "lucide-react";

/* ── Types (mirrored from intelligence.tsx) ── */

type Signal = {
  id: number;
  type: "competitor" | "market" | "social" | "press" | "campaign";
  sentiment: "positive" | "negative" | "neutral";
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  competitor?: string;
  anomaly?: boolean;
  significance?: "high" | "medium" | "low";
};

type DailyBriefData = {
  generatedAt?: string;
  highlights?: string[];
  fullText?: string;
  signals?: { title: string; detail: string }[];
};

interface MobileRadarProps {
  signals: Signal[];
  brief: DailyBriefData | null;
  onRefresh: () => void;
  onTrackCompetitor?: () => void;
  onViewBrief?: () => void;
}

/* ── Signal type config ── */

const SIGNAL_TYPES = ["All", "competitor", "market", "social", "press", "campaign"] as const;

const TYPE_LABELS: Record<string, string> = {
  All: "All",
  competitor: "Competitor",
  market: "Market",
  social: "Social",
  press: "Press",
  campaign: "Campaign",
};

const TYPE_ICONS: Record<string, typeof Globe> = {
  competitor: Eye,
  market: TrendingUp,
  social: Globe,
  press: Newspaper,
  campaign: Target,
};

const SENTIMENT_ICONS = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
};

const SENTIMENT_COLORS = {
  positive: "#3C8B4E",
  negative: "#B85C38",
  neutral: "#8B7A3C",
};

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  competitor: { bg: "#E8D5E8", text: "#6B3C8B" },
  market: { bg: "#D5E0E8", text: "#3C5E8B" },
  social: { bg: "#D5E8D8", text: "#3C8B4E" },
  press: { bg: "#E8E0D5", text: "#8B7A3C" },
  campaign: { bg: "#E8D5D5", text: "#B85C38" },
};

/* ── Mobile Radar Component ── */

export function MobileRadar({
  signals,
  brief,
  onRefresh,
  onTrackCompetitor,
  onViewBrief,
}: MobileRadarProps) {
  const [filter, setFilter] = useState<string>("All");
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const filtered = filter === "All" ? signals : signals.filter((s) => s.type === filter);

  return (
    <div className="space-y-4 pb-24">
      {/* ── Daily Brief Summary Card ── */}
      {brief && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <button
            onClick={() => setBriefExpanded(!briefExpanded)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-body-sm font-medium text-[var(--text-primary)]">
                Daily Brief
              </span>
              {brief.generatedAt && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {new Date(brief.generatedAt).toLocaleDateString(undefined, { weekday: "short" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {brief.highlights && (
                <span className="text-[11px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                  {brief.highlights.length} insights
                </span>
              )}
              {briefExpanded ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
              )}
            </div>
          </button>

          {/* Collapsed: show 3 bullet points max */}
          {!briefExpanded && brief.highlights && brief.highlights.length > 0 && (
            <div className="px-4 pb-3 -mt-1">
              <ul className="space-y-1">
                {brief.highlights.slice(0, 3).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-caption text-[var(--text-secondary)]">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">{"\u2022"}</span>
                    <span className="line-clamp-1">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expanded: full brief */}
          {briefExpanded && (
            <div className="px-4 pb-4 space-y-2 border-t border-[var(--border)] pt-3">
              {brief.highlights && brief.highlights.length > 0 && (
                <ul className="space-y-1.5">
                  {brief.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--accent)] mt-0.5 shrink-0">{"\u2022"}</span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {brief.signals && brief.signals.length > 0 && !brief.highlights && (
                <ul className="space-y-1.5">
                  {brief.signals.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--accent)] mt-0.5 shrink-0">{"\u2022"}</span>
                      <span>
                        <span className="font-medium text-[var(--text-primary)]">{s.title}</span>{" "}
                        {s.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {brief.fullText && (
                <p className="text-body-sm text-[var(--text-secondary)] whitespace-pre-line">
                  {brief.fullText}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Filter Chips (horizontal scroll) ── */}
      <div
        ref={filterRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        <Filter className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
        {SIGNAL_TYPES.map((type) => {
          const count = type === "All" ? signals.length : signals.filter((s) => s.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium transition-colors ${
                filter === type
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              {TYPE_LABELS[type]}
              <span
                className={`text-[10px] ${
                  filter === type ? "text-white/70" : "text-[var(--text-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Signal Feed ── */}
      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <Activity className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-body-sm text-[var(--text-muted)]">
            No signals found{filter !== "All" ? ` for "${TYPE_LABELS[filter]}"` : ""}.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((signal) => {
          const SentimentIcon = SENTIMENT_ICONS[signal.sentiment];
          const sentimentColor = SENTIMENT_COLORS[signal.sentiment];
          const badge = TYPE_BADGE_COLORS[signal.type] || { bg: "#e5e5e5", text: "#666" };
          const TypeIcon = TYPE_ICONS[signal.type] || Globe;
          const isExpanded = expandedSignal === signal.id;

          return (
            <button
              key={signal.id}
              onClick={() => setExpandedSignal(isExpanded ? null : signal.id)}
              className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors active:bg-[var(--surface-elevated)]"
            >
              {/* Top row: type badge + sentiment */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {TYPE_LABELS[signal.type]}
                  </span>
                  {signal.anomaly && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--error)]/10 text-[var(--error)]">
                      <Zap className="h-2.5 w-2.5" />
                      Anomaly
                    </span>
                  )}
                </div>
                <SentimentIcon className="h-4 w-4" style={{ color: sentimentColor }} />
              </div>

              {/* Title */}
              <h4 className="text-body-sm font-medium text-[var(--text-primary)] leading-snug">
                {signal.title}
              </h4>

              {/* Summary (2 lines when collapsed, full when expanded) */}
              <p
                className={`text-caption text-[var(--text-secondary)] mt-1 ${
                  isExpanded ? "" : "line-clamp-2"
                }`}
              >
                {signal.summary}
              </p>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-3 pt-2 border-t border-[var(--border)] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Source: {signal.source}</span>
                    <span>{signal.timestamp}</span>
                  </div>
                  {signal.competitor && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Competitor: <span className="font-medium text-[var(--accent)]">{signal.competitor}</span>
                    </p>
                  )}
                  {signal.significance && (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        signal.significance === "high"
                          ? "bg-[var(--error)]/10 text-[var(--error)]"
                          : signal.significance === "medium"
                          ? "bg-[#D4A017]/10 text-[#D4A017]"
                          : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {signal.significance} significance
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Floating Quick Actions ── */}
      <div
        className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-3 px-4 z-40"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-lg px-2 py-1.5"
          style={{ pointerEvents: "auto" }}
        >
          {onTrackCompetitor && (
            <button
              onClick={onTrackCompetitor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-caption font-medium transition-colors active:opacity-80"
            >
              <Plus className="h-3.5 w-3.5" />
              Track
            </button>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium transition-colors active:opacity-80"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          {onViewBrief && (
            <button
              onClick={onViewBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium transition-colors active:opacity-80"
            >
              <Sun className="h-3.5 w-3.5" />
              Brief
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
