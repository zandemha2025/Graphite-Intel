import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bookmark,
  Share2,
  RefreshCw,
  Copy,
  Check,
  Lightbulb,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { MetricCard } from "./metric-card";
import { SourceBadge, type Source } from "./source-badge";
import { ReasoningChain, type ReasoningStep } from "./reasoning-chain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsightCellProps {
  question: string;
  content: string;
  sources?: Source[];
  timestamp?: string;
  isStreaming?: boolean;
  onSaveToBoard?: () => void;
  onShare?: () => void;
  onRefresh?: () => void;
}

interface ParsedMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  change?: string;
}

interface ParsedChart {
  chartType: "bar" | "line" | "area" | "pie";
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}

interface ParsedContent {
  metrics: ParsedMetric[];
  charts: ParsedChart[];
  findings: string[];
  recommendation: string | null;
  reasoning: ReasoningStep[];
  tables: { columns: string[]; rows: Record<string, string>[] }[];
  remainingMarkdown: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHART_PALETTE = ["#4F46E5", "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E5E7EB",
  borderRadius: "6px",
  color: "#374151",
  fontSize: "13px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

// ---------------------------------------------------------------------------
// Markdown parser — extracts structured sections from AI output
// ---------------------------------------------------------------------------

function parseContent(raw: string): ParsedContent {
  const metrics: ParsedMetric[] = [];
  const charts: ParsedChart[] = [];
  const findings: string[] = [];
  const reasoning: ReasoningStep[] = [];
  const tables: { columns: string[]; rows: Record<string, string>[] }[] = [];
  let recommendation: string | null = null;
  const consumedRanges: [number, number][] = [];

  // --- 1. Extract JSON code blocks (charts) ---
  const jsonBlockRe = /```(?:json)?\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = jsonBlockRe.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
        const chartType = detectChartType(parsed);
        const keys = Object.keys(parsed.data[0]);
        charts.push({
          chartType: parsed.chartType ?? chartType,
          data: parsed.data,
          xKey: parsed.xKey ?? keys[0] ?? "name",
          yKey: parsed.yKey ?? keys[1] ?? "value",
        });
        consumedRanges.push([match.index, match.index + match[0].length]);
      }
    } catch {
      // Not valid chart JSON — leave as markdown
    }
  }

  // --- 2. Extract metrics (lines with $, %, or numeric values) ---
  const metricLineRe =
    /^[\s>*-]*(?:\*\*)?([A-Za-z\s/&]+?)(?:\*\*)?:\s*(?:\*\*)?(\$[\d,.]+[KMBT]?|[\d,.]+%|[\d,.]+[KMBT]?)(?:\*\*)?\s*(?:\(([+-][\d,.]+%?)\))?/gm;
  while ((match = metricLineRe.exec(raw)) !== null) {
    const changeStr = match[3]?.trim();
    let trend: "up" | "down" | "flat" = "flat";
    if (changeStr) {
      trend = changeStr.startsWith("+") ? "up" : changeStr.startsWith("-") ? "down" : "flat";
    }
    metrics.push({
      label: match[1].trim(),
      value: match[2].trim(),
      trend,
      change: changeStr ?? undefined,
    });
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  // --- 3. Extract findings (bullet points under Key/Finding headings) ---
  const findingsSectionRe =
    /(?:^|\n)#+?\s*(?:Key\s+Findings?|Findings?|Key\s+Insights?|Highlights?)\s*\n((?:[\s]*[-*]\s+.+\n?)+)/gi;
  while ((match = findingsSectionRe.exec(raw)) !== null) {
    const bullets = match[1].match(/[-*]\s+(.+)/g);
    if (bullets) {
      bullets.forEach((b) => findings.push(b.replace(/^[-*]\s+/, "").trim()));
    }
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  // --- 4. Extract recommendation ---
  const recoRe =
    /(?:^|\n)#+?\s*(?:Recommendations?|Suggested\s+Actions?)\s*\n([\s\S]*?)(?=\n#+?\s|\n{3,}|$)/gi;
  while ((match = recoRe.exec(raw)) !== null) {
    recommendation = match[1].trim();
    consumedRanges.push([match.index, match.index + match[0].length]);
  }
  // Also match inline emoji-based recommendation
  if (!recommendation) {
    const emojiRecoRe = /(?:^|\n)\s*(?:>)?\s*(?:\uD83D\uDCA1|\u2728)\s*(.*(?:\n(?!#|\n\n).+)*)/m;
    const emojiMatch = emojiRecoRe.exec(raw);
    if (emojiMatch) {
      recommendation = emojiMatch[1].trim();
      consumedRanges.push([emojiMatch.index, emojiMatch.index + emojiMatch[0].length]);
    }
  }

  // --- 5. Extract markdown tables ---
  const tableRe = /(?:^|\n)(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)+)/g;
  while ((match = tableRe.exec(raw)) !== null) {
    const headerLine = match[1];
    const bodyLines = match[3].trim().split("\n");
    const columns = headerLine
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    const rows = bodyLines.map((line) => {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      const row: Record<string, string> = {};
      columns.forEach((col, i) => {
        row[col] = cells[i] ?? "";
      });
      return row;
    });
    tables.push({ columns, rows });
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  // --- 6. Extract reasoning steps ---
  const reasoningRe =
    /(?:^|\n)#+?\s*(?:Reasoning|How\s+I\s+arrived|Thought\s+process)\s*\n((?:[\s]*\d+[.)]\s+.+\n?)+)/gi;
  while ((match = reasoningRe.exec(raw)) !== null) {
    const steps = match[1].match(/\d+[.)]\s+(.+)/g);
    if (steps) {
      steps.forEach((s) =>
        reasoning.push({ label: s.replace(/^\d+[.)]\s+/, "").trim() })
      );
    }
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  // --- Build remaining markdown from unconsumed content ---
  const sorted = [...consumedRanges].sort((a, b) => a[0] - b[0]);
  let remaining = "";
  let cursor = 0;
  for (const [start, end] of sorted) {
    if (start > cursor) remaining += raw.slice(cursor, start);
    cursor = end;
  }
  if (cursor < raw.length) remaining += raw.slice(cursor);
  // Clean up excessive whitespace
  const remainingMarkdown = remaining.replace(/\n{3,}/g, "\n\n").trim();

  return { metrics, charts, findings, recommendation, reasoning, tables, remainingMarkdown };
}

function detectChartType(parsed: { data: Record<string, unknown>[] }): "bar" | "line" | "area" | "pie" {
  const d = parsed.data;
  if (d.length <= 5) return "bar";
  const keys = Object.keys(d[0] ?? {});
  const firstKey = keys[0] ?? "";
  const firstVal = d[0]?.[firstKey];
  if (typeof firstVal === "string" && /\d{4}[-/]/.test(firstVal)) return "line";
  if (d.length > 12) return "area";
  return "bar";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InsightChart({ chart }: { chart: ParsedChart }) {
  const { chartType, data, xKey, yKey } = chart;

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--insight-card-bg, #FFFFFF)",
        border: "1px solid var(--insight-border, #E5E7EB)",
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        {chartType === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} label>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        ) : chartType === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Line type="monotone" dataKey={yKey} stroke="#4F46E5" strokeWidth={2} dot={false} />
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey={yKey} stroke="#4F46E5" fill="#EEF2FF" strokeWidth={2} />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
            <RechartsTooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey={yKey} fill="#4F46E5" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function InsightTable({ columns, rows }: { columns: string[]; rows: Record<string, string>[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--insight-border, #E5E7EB)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--insight-subtle-bg, #F9FAFB)" }}>
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-3 py-2 font-medium uppercase tracking-wider"
                  style={{ color: "var(--insight-muted, #6B7280)", fontSize: 10 }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: `1px solid var(--insight-border-light, #F3F4F6)`,
                  background: "var(--insight-card-bg, #FFFFFF)",
                }}
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2" style={{ color: "var(--insight-text, #374151)" }}>
                    {row[col] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionToolbar({
  onSaveToBoard,
  onShare,
  onRefresh,
  content,
}: {
  onSaveToBoard?: () => void;
  onShare?: () => void;
  onRefresh?: () => void;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const buttons = [
    { label: "Save to Board", Icon: Bookmark, onClick: onSaveToBoard },
    { label: "Share", Icon: Share2, onClick: onShare },
    { label: "Refresh", Icon: RefreshCw, onClick: onRefresh },
    { label: copied ? "Copied" : "Copy", Icon: copied ? Check : Copy, onClick: handleCopy },
  ].filter((b) => b.onClick);

  return (
    <div className="flex items-center gap-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
          style={{ color: "var(--insight-muted, #9CA3AF)" }}
          title={btn.label}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--insight-muted, #9CA3AF)")}
        >
          <btn.Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{btn.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main InsightCell component
// ---------------------------------------------------------------------------

export function InsightCell({
  question,
  content,
  sources,
  timestamp,
  isStreaming,
  onSaveToBoard,
  onShare,
  onRefresh,
}: InsightCellProps) {
  const parsed = useMemo(() => parseContent(content), [content]);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--insight-card-bg, #FFFFFF)",
        border: "1px solid var(--insight-border, #E5E7EB)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {/* --- Question header --- */}
      <div
        className="flex items-start justify-between px-5 py-3.5"
        style={{
          borderBottom: "1px solid var(--insight-border-light, #F3F4F6)",
          background: "var(--insight-subtle-bg, #F9FAFB)",
        }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: "var(--insight-text, #111827)" }}
          >
            {question}
          </p>
          {timestamp && (
            <p
              className="text-[10px] mt-1"
              style={{ color: "var(--insight-muted, #9CA3AF)" }}
            >
              {timestamp}
            </p>
          )}
        </div>
        <ActionToolbar
          onSaveToBoard={onSaveToBoard}
          onShare={onShare}
          onRefresh={onRefresh}
          content={content}
        />
      </div>

      {/* --- Body --- */}
      <div className="px-5 py-4 space-y-4">
        {/* Streaming indicator */}
        {isStreaming && !content && (
          <div className="flex items-center gap-2 py-4">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "#A5B4FC", animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <span className="text-xs" style={{ color: "var(--insight-muted, #9CA3AF)" }}>
              Analyzing...
            </span>
          </div>
        )}

        {/* Metric cards row */}
        {parsed.metrics.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {parsed.metrics.slice(0, 4).map((m, i) => (
              <MetricCard
                key={i}
                label={m.label}
                value={m.value}
                trend={m.trend}
                change={m.change}
              />
            ))}
          </div>
        )}

        {/* Charts */}
        {parsed.charts.map((chart, i) => (
          <InsightChart key={i} chart={chart} />
        ))}

        {/* Data tables */}
        {parsed.tables.map((table, i) => (
          <InsightTable key={i} columns={table.columns} rows={table.rows} />
        ))}

        {/* Key findings */}
        {parsed.findings.length > 0 && (
          <div className="space-y-1.5">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--insight-muted, #6B7280)" }}
            >
              Key Findings
            </p>
            <ul className="space-y-1">
              {parsed.findings.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                    style={{ background: "#4F46E5" }}
                  />
                  <span style={{ color: "var(--insight-text, #374151)" }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation callout */}
        {parsed.recommendation && (
          <div
            className="flex gap-3 rounded-lg px-4 py-3"
            style={{
              background: "var(--insight-accent-bg, #EEF2FF)",
              border: "1px solid var(--insight-accent-border, #C7D2FE)",
            }}
          >
            <Lightbulb
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "var(--insight-accent, #4F46E5)" }}
            />
            <div
              className="text-sm leading-relaxed prose prose-sm max-w-none"
              style={{
                color: "var(--insight-text, #1E1B4B)",
                "--tw-prose-body": "var(--insight-text, #1E1B4B)",
                "--tw-prose-bold": "var(--insight-text, #1E1B4B)",
              } as React.CSSProperties}
            >
              <ReactMarkdown>{parsed.recommendation}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Remaining markdown prose */}
        {parsed.remainingMarkdown && (
          <div
            className="prose prose-sm max-w-none"
            style={{
              "--tw-prose-body": "var(--insight-text, #1F2937)",
              "--tw-prose-headings": "var(--insight-heading, #111827)",
              "--tw-prose-links": "var(--insight-accent, #4F46E5)",
              "--tw-prose-bold": "var(--insight-heading, #111827)",
              "--tw-prose-counters": "var(--insight-muted, #6B7280)",
              "--tw-prose-bullets": "var(--insight-muted, #6B7280)",
              "--tw-prose-hr": "var(--insight-border, #E5E7EB)",
              "--tw-prose-quotes": "var(--insight-text, #1F2937)",
              "--tw-prose-quote-borders": "var(--insight-border, #E5E7EB)",
              "--tw-prose-code": "var(--insight-heading, #111827)",
              "--tw-prose-pre-bg": "var(--insight-subtle-bg, #F9FAFB)",
              "--tw-prose-th-borders": "var(--insight-border, #E5E7EB)",
              "--tw-prose-td-borders": "var(--insight-border-light, #F3F4F6)",
            } as React.CSSProperties}
          >
            <ReactMarkdown>{parsed.remainingMarkdown}</ReactMarkdown>
          </div>
        )}

        {/* Reasoning chain */}
        {parsed.reasoning.length > 0 && (
          <ReasoningChain steps={parsed.reasoning} />
        )}
      </div>

      {/* --- Footer: sources + streaming pulse --- */}
      {(sources && sources.length > 0) || isStreaming ? (
        <div
          className="flex items-center justify-between px-5 py-2.5 gap-3"
          style={{
            borderTop: "1px solid var(--insight-border-light, #F3F4F6)",
            background: "var(--insight-subtle-bg, #F9FAFB)",
          }}
        >
          {sources && sources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {sources.map((s, i) => (
                <SourceBadge key={i} source={s} />
              ))}
            </div>
          )}

          {isStreaming && (
            <span className="flex gap-1 ml-auto">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full animate-bounce"
                  style={{ background: "#A5B4FC", animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
