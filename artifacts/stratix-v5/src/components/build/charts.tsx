import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Hash,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Target,
  FileText,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

/* ── Chart Color Palette ── */

export const CHART_COLORS = ["#B85C38", "#3C5E8B", "#3C8B4E", "#8B7A3C", "#6B3C8B"];

/* ── Bar Chart ── */

export function BarChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="h-full flex items-end gap-1 pb-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-[3px] transition-all"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: 4,
              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
            }}
          />
          <span className="text-[9px] text-[var(--text-muted)]">{d.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Line Chart ── */

export function LineChart({
  data,
  color = CHART_COLORS[0],
  width = 300,
  height = 120,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const areaPath = `M ${points[0]} ${points.slice(1).map((p) => `L ${p}`).join(" ")} L ${pad + w},${pad + h} L ${pad},${pad + h} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.1} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = pad + (i / Math.max(data.length - 1, 1)) * w;
        const y = pad + h - ((v - min) / range) * h;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
      })}
    </svg>
  );
}

/* ── Pie / Donut Chart ── */

export function PieChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const currentOffset = offset;
    offset += dash;
    return { ...seg, dash, gap, offset: currentOffset, pct };
  });

  return (
    <div className="flex flex-col items-center gap-2 h-full">
      <svg viewBox="0 0 100 100" className="w-full max-w-[120px] flex-shrink-0">
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={16}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <circle cx={cx} cy={cy} r={28} fill="var(--surface)" />
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[9px] text-[var(--text-muted)] truncate">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sparkline (mini line for metric-trend) ── */

export function Sparkline({
  data,
  color = CHART_COLORS[0],
  width = 80,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data.length) return null;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = pad + (i / Math.max(data.length - 1, 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Progress Card ── */

export function ProgressCard({
  label,
  current,
  target,
  color = CHART_COLORS[0],
}: {
  label: string;
  current: number;
  target: number;
  color?: string;
}) {
  const pct = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
        <span className="text-[12px] font-medium text-[var(--text-primary)]">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-3 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-baseline justify-between text-[10px] text-[var(--text-muted)]">
        <span>{formatCompact(current)}</span>
        <span>Goal: {formatCompact(target)}</span>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/* ── Metric with Trend ── */

export function MetricTrend({
  label,
  value,
  trend,
  sparkData,
}: {
  label: string;
  value: string;
  trend: number;
  sparkData: number[];
}) {
  const positive = trend >= 0;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none">
        {value}
      </p>
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <Sparkline data={sparkData} color={positive ? "#3C8B4E" : "#B85C38"} />
        <span className={`text-[12px] font-medium ${positive ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
          {positive ? "+" : ""}{trend}%
        </span>
      </div>
    </div>
  );
}

/* ── AI Insight Card ── */

export function AIInsightCard({
  content,
  lastUpdated,
  onRefresh,
  isRefreshing,
}: {
  prompt: string;
  content: string;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-1 overflow-auto">
        <div className="prose prose-sm max-w-none text-[13px] text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)]">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 mt-auto">
        <span className="text-[9px] text-[var(--text-muted)]">{lastUpdated}</span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:opacity-80 disabled:opacity-50"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}

/* ── Card Settings Panel ── */

export interface CardConfig {
  id: string;
  type: CardType;
  title: string;
  dataSource: "manual" | "api" | "connected";
  apiEndpoint?: string;
  connectedSourceId?: number;
  refreshInterval?: number;
  data: unknown;
  content?: string;
}

export type CardType =
  | "stat"
  | "bar"
  | "line"
  | "pie"
  | "progress"
  | "markdown"
  | "ai-insight"
  | "metric-trend";

export function CardSettingsPanel({
  config,
  onSave,
  onCancel,
}: {
  config: CardConfig;
  onSave: (c: CardConfig) => void;
  onCancel: () => void;
}) {
  const [local, setLocal] = useState<CardConfig>({ ...config });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCancel();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const chartTypes: { value: CardType; label: string }[] = [
    { value: "stat", label: "Stat" },
    { value: "bar", label: "Bar Chart" },
    { value: "line", label: "Line Chart" },
    { value: "pie", label: "Pie Chart" },
    { value: "progress", label: "Progress" },
    { value: "markdown", label: "Markdown" },
    { value: "ai-insight", label: "AI Insight" },
    { value: "metric-trend", label: "Metric Trend" },
  ];

  const refreshOptions = [
    { value: 0, label: "No auto-refresh" },
    { value: 60, label: "Every 1 minute" },
    { value: 300, label: "Every 5 minutes" },
    { value: 900, label: "Every 15 minutes" },
    { value: 3600, label: "Every hour" },
  ];

  return (
    <div
      ref={panelRef}
      className="absolute top-8 right-0 z-50 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-lg p-3 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[12px] font-semibold text-[var(--text-primary)]">Card Settings</p>

      {/* Title */}
      <label className="block">
        <span className="text-[10px] text-[var(--text-muted)]">Title</span>
        <input
          value={local.title}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
          className="mt-0.5 w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </label>

      {/* Data Source */}
      <fieldset className="space-y-1">
        <legend className="text-[10px] text-[var(--text-muted)]">Data Source</legend>
        {(["manual", "api", "connected"] as const).map((ds) => (
          <label key={ds} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="dataSource"
              checked={local.dataSource === ds}
              onChange={() => setLocal({ ...local, dataSource: ds })}
              className="accent-[var(--accent)]"
            />
            <span className="text-[11px] text-[var(--text-secondary)] capitalize">
              {ds === "api" ? "API Endpoint" : ds === "connected" ? "Connected Source" : "Manual"}
            </span>
          </label>
        ))}
      </fieldset>

      {/* API Endpoint field */}
      {local.dataSource === "api" && (
        <label className="block">
          <span className="text-[10px] text-[var(--text-muted)]">API Endpoint</span>
          <input
            value={local.apiEndpoint || ""}
            onChange={(e) => setLocal({ ...local, apiEndpoint: e.target.value })}
            placeholder="/api/ads/metrics/overview"
            className="mt-0.5 w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </label>
      )}

      {/* Connected Source dropdown */}
      {local.dataSource === "connected" && (
        <label className="block">
          <span className="text-[10px] text-[var(--text-muted)]">Connected Source</span>
          <select
            value={local.connectedSourceId ?? ""}
            onChange={(e) =>
              setLocal({ ...local, connectedSourceId: e.target.value ? Number(e.target.value) : undefined })
            }
            className="mt-0.5 w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="">Select a source...</option>
            <option value="1">Salesforce</option>
            <option value="2">Google Analytics</option>
            <option value="3">HubSpot</option>
            <option value="4">Gong</option>
          </select>
        </label>
      )}

      {/* Chart Type */}
      <label className="block">
        <span className="text-[10px] text-[var(--text-muted)]">Card Type</span>
        <select
          value={local.type}
          onChange={(e) => setLocal({ ...local, type: e.target.value as CardType })}
          className="mt-0.5 w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          {chartTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </label>

      {/* Refresh Interval */}
      <label className="block">
        <span className="text-[10px] text-[var(--text-muted)]">Refresh</span>
        <select
          value={local.refreshInterval ?? 0}
          onChange={(e) => setLocal({ ...local, refreshInterval: Number(e.target.value) })}
          className="mt-0.5 w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          {refreshOptions.map((ro) => (
            <option key={ro.value} value={ro.value}>
              {ro.label}
            </option>
          ))}
        </select>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onSave(local)}
          className="flex-1 px-3 py-1.5 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 text-[11px] font-medium rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Icon map ── */

export const TYPE_ICONS: Record<CardType, typeof Hash> = {
  stat: Hash,
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChartIcon,
  progress: Target,
  markdown: FileText,
  "ai-insight": Sparkles,
  "metric-trend": TrendingUp,
};

/* ── Default card data by type ── */

export function makeDefaultCard(type: CardType): Omit<CardConfig, "id"> {
  const base = { type, dataSource: "manual" as const };
  switch (type) {
    case "stat":
      return { ...base, title: "New Stat", data: { value: "0", label: "Stat", change: "", positive: true } };
    case "bar":
      return { ...base, title: "New Bar Chart", data: { data: [{ name: "A", value: 30 }, { name: "B", value: 50 }, { name: "C", value: 20 }] } };
    case "line":
      return { ...base, title: "New Line Chart", data: { values: [10, 20, 15, 30, 25, 35] } };
    case "pie":
      return { ...base, title: "New Pie Chart", data: { segments: [{ label: "A", value: 60, color: CHART_COLORS[0] }, { label: "B", value: 40, color: CHART_COLORS[1] }] } };
    case "progress":
      return { ...base, title: "New Progress", data: { label: "Progress", current: 60000, target: 100000, color: CHART_COLORS[0] } };
    case "markdown":
      return { ...base, title: "New Note", data: {}, content: "Edit this card..." };
    case "ai-insight":
      return { ...base, title: "AI Insight", data: { prompt: "Summarize key marketing trends", content: "Click **Refresh** to generate an insight.", lastUpdated: "Just now" } };
    case "metric-trend":
      return { ...base, title: "New Metric", data: { value: "0", label: "Metric", trend: 0, sparkData: [0, 0, 0, 0] } };
  }
}

/* ── Add Card Picker ── */

export function AddCardPicker({ onAdd }: { onAdd: (type: CardType) => void }) {
  const types: { type: CardType; label: string; icon: typeof Hash }[] = [
    { type: "stat", label: "Stat", icon: Hash },
    { type: "bar", label: "Bar", icon: BarChart3 },
    { type: "line", label: "Line", icon: TrendingUp },
    { type: "pie", label: "Pie", icon: PieChartIcon },
    { type: "progress", label: "Progress", icon: Target },
    { type: "markdown", label: "Markdown", icon: FileText },
    { type: "ai-insight", label: "AI Insight", icon: Sparkles },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.type}
            onClick={() => onAdd(t.type)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus className="h-2.5 w-2.5" />
            <Icon className="h-2.5 w-2.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── useAutoRefresh hook ── */

export function useAutoRefresh(
  cards: CardConfig[],
  onRefresh: (cardId: string) => void
) {
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const current = intervalsRef.current;
    for (const [id, timer] of current) {
      const card = cards.find((c) => c.id === id);
      if (!card || !card.refreshInterval || card.refreshInterval <= 0) {
        clearInterval(timer);
        current.delete(id);
      }
    }
    for (const card of cards) {
      if (card.refreshInterval && card.refreshInterval > 0 && !current.has(card.id)) {
        const timer = setInterval(() => onRefresh(card.id), card.refreshInterval * 1000);
        current.set(card.id, timer);
      }
    }
    return () => {
      for (const timer of current.values()) clearInterval(timer);
      current.clear();
    };
  }, [cards, onRefresh]);
}

/* ── Fullscreen Modal ── */

export function FullscreenModal({
  children,
  title,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[90vw] h-[85vh] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-secondary)] shrink-0">
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</span>
          <button
            onClick={onClose}
            className="px-2 py-0.5 text-[11px] rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
          >
            Close
          </button>
        </div>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
