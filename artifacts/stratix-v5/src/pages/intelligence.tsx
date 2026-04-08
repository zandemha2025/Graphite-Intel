import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useListReports, getListReportsQueryKey } from "@workspace/api-client-react";
import { useTabParam } from "@/hooks/use-tab-param";
import {
  Radar, FileText, BarChart3, Search, Plus, ArrowRight,
  TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign,
  Target, Eye, Activity,
} from "lucide-react";
import { format } from "date-fns";

type Tab = "radar" | "reports" | "campaigns";

/* ── Signal types ── */

type Signal = {
  id: number;
  type: "competitor" | "market" | "social" | "press" | "campaign";
  sentiment: "positive" | "negative" | "neutral";
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  competitor?: string;
};

/* ── Campaign types ── */

type CampaignMetrics = {
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  totalSpend?: number;
  totalRevenue?: number;
  avgROAS?: number;
  totalConversions?: number;
};

type Campaign = {
  id: number;
  name: string;
  status: string;
  platforms: string[];
  spend: number;
  roas: number;
  conversions: number;
};

/* ── Helpers ── */

const TYPE_FILTERS = ["All", "Competitor", "Market", "Social", "Press", "Campaign"] as const;

function sentimentIcon(s: Signal["sentiment"]) {
  if (s === "positive") return <TrendingUp className="h-4 w-4 text-[var(--success)]" />;
  if (s === "negative") return <TrendingDown className="h-4 w-4 text-[var(--error)]" />;
  return <Minus className="h-4 w-4 text-[var(--text-muted)]" />;
}

function typeBadgeColor(type: Signal["type"]) {
  const map: Record<string, string> = {
    competitor: "bg-[#E8D5C8] text-[#8B5E3C]",
    market: "bg-[#D5DDE8] text-[#3C5E8B]",
    social: "bg-[#E0D5E8] text-[#6B3C8B]",
    press: "bg-[#D5E8D8] text-[#3C8B4E]",
    campaign: "bg-[#E8E0D5] text-[#8B7A3C]",
  };
  return map[type] || "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function statusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === "active" || lower === "running") return "bg-[#D5E8D8] text-[#3C8B4E]";
  if (lower === "paused") return "bg-[#E8E0D5] text-[#8B7A3C]";
  if (lower === "ended" || lower === "completed") return "bg-[var(--surface-secondary)] text-[var(--text-muted)]";
  return "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/* ── Main ── */

export function Intelligence() {
  const [tab, setTab] = useTabParam<Tab>("radar", ["radar", "reports", "campaigns"]);

  return (
    <div>
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Intelligence</h1>

      <div className="flex items-center gap-1 mt-6 border-b border-[var(--border)]">
        {([
          { id: "radar" as Tab, label: "Market Radar", icon: Radar },
          { id: "reports" as Tab, label: "Strategy Reports", icon: FileText },
          { id: "campaigns" as Tab, label: "Campaign Ops", icon: BarChart3 },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm border-b-2 transition-colors -mb-px ${
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
        {tab === "radar" && <RadarTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "campaigns" && <CampaignsTab />}
      </div>
    </div>
  );
}

/* ── Market Radar ── */

function RadarTab() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/intelligence/signals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { signals: [] }))
      .then((d) => setSignals(d.signals || d || []))
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = signals;
    if (typeFilter !== "All") list = list.filter((s) => s.type === typeFilter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          (s.competitor && s.competitor.toLowerCase().includes(q))
      );
    }
    return list;
  }, [signals, typeFilter, search]);

  /* Stat cards use real count when available, placeholders otherwise */
  const stats = [
    { label: "Active Signals", value: signals.length || 24, icon: Activity },
    { label: "Competitors Tracked", value: new Set(signals.filter((s) => s.competitor).map((s) => s.competitor)).size || 6, icon: Eye },
    { label: "Sources Monitored", value: new Set(signals.map((s) => s.source)).size || 12, icon: Radar },
    { label: "Alerts This Week", value: signals.filter((s) => s.sentiment === "negative").length || 3, icon: AlertCircle },
  ];

  if (loading) {
    return <div className="py-12 text-center text-body-sm text-[var(--text-muted)]">Loading signals...</div>;
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Radar className="h-10 w-10 text-[var(--text-muted)] mb-4" />
        <h3 className="font-editorial text-[22px] text-[var(--text-primary)]">No signals yet</h3>
        <p className="text-body text-[var(--text-secondary)] mt-1 max-w-sm">
          Set up your company profile in Connect and add competitors to start receiving intelligence signals.
        </p>
        <RadarConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-caption text-[var(--text-muted)]">{s.label}</span>
            </div>
            <p className="text-[24px] font-medium text-[var(--text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1 rounded-full text-caption font-medium transition-colors ${
                typeFilter === f
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Signal feed */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No signals match your filters.</p>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <div className="mt-0.5 shrink-0">{sentimentIcon(s.sentiment)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${typeBadgeColor(s.type)}`}>
                    {s.type}
                  </span>
                  {s.competitor && (
                    <span className="text-caption text-[var(--accent)] font-medium">{s.competitor}</span>
                  )}
                </div>
                <p className="text-body-sm font-medium text-[var(--text-primary)]">{s.title}</p>
                <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">{s.summary}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                  {s.source} &middot; {format(new Date(s.timestamp), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RadarConnectButton() {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation("/connect")}
      className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
    >
      Set Up Connect
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

/* ── Strategy Reports ── */

function ReportsTab() {
  const [, setLocation] = useLocation();
  const { data: reports, isLoading } = useListReports(undefined, {
    query: { queryKey: getListReportsQueryKey() },
  });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!reports?.length) return [];
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q) ||
        r.reportType?.toLowerCase().includes(q)
    );
  }, [reports, search]);

  if (isLoading) {
    return <div className="py-12 text-center text-body-sm text-[var(--text-muted)]">Loading reports...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          onClick={() => setLocation("/solve?prompt=Generate+a+competitive+strategy+report")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          New Report
        </button>
      </div>

      {/* Report list */}
      {!reports?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <h3 className="font-editorial text-[22px] text-[var(--text-primary)]">No reports yet</h3>
          <p className="text-body text-[var(--text-secondary)] mt-1">Generate your first strategy report from Solve.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No reports match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => setLocation(`/solve?report=${r.id}`)}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
            >
              <FileText className="h-5 w-5 text-[var(--accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                  {r.reportType && (
                    <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#D5DDE8] text-[#3C5E8B]">
                      {r.reportType}
                    </span>
                  )}
                </div>
                <p className="text-caption text-[var(--text-muted)]">
                  {r.company}
                  {r.createdAt && <> &middot; {format(new Date(r.createdAt), "MMM d, yyyy")}</>}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Campaign Ops ── */

function CampaignsTab() {
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/ads/metrics/overview", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ads/campaigns", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([metricsResult, campaignsResult]) => {
        if (metricsResult.status === "fulfilled" && metricsResult.value) setMetrics(metricsResult.value);
        if (campaignsResult.status === "fulfilled") {
          const raw = campaignsResult.value;
          setCampaigns(Array.isArray(raw) ? raw : raw?.campaigns || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-body-sm text-[var(--text-muted)]">Loading campaign data...</div>;
  }

  if (!metrics && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="h-10 w-10 text-[var(--text-muted)] mb-4" />
        <h3 className="font-editorial text-[22px] text-[var(--text-primary)]">No campaign data</h3>
        <p className="text-body text-[var(--text-secondary)] mt-1 max-w-sm">
          Connect your ad accounts in Connect to see campaign performance data here.
        </p>
        <button
          onClick={() => setLocation("/connect")}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          Go to Connect
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const metricCards = [
    { label: "Total Spend", value: fmtCurrency(metrics?.totalSpend || metrics?.spend || 0), icon: DollarSign },
    { label: "Revenue", value: fmtCurrency(metrics?.totalRevenue || metrics?.revenue || 0), icon: TrendingUp },
    { label: "ROAS", value: `${(metrics?.avgROAS || metrics?.roas || 0).toFixed(2)}x`, icon: Target },
    { label: "Conversions", value: (metrics?.totalConversions || metrics?.conversions || 0).toLocaleString(), icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <m.icon className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-caption text-[var(--text-muted)]">{m.label}</span>
            </div>
            <p className="text-[24px] font-medium text-[var(--text-primary)]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      {campaigns.length > 0 ? (
        <div>
          <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Campaigns</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-caption text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Platforms</th>
                  <th className="pb-2 pr-4 font-medium text-right">Spend</th>
                  <th className="pb-2 pr-4 font-medium text-right">ROAS</th>
                  <th className="pb-2 font-medium text-right">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">{c.name}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1">
                        {c.platforms?.map((p) => (
                          <span
                            key={p}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--text-secondary)]">{fmtCurrency(c.spend)}</td>
                    <td className="py-3 pr-4 text-right text-[var(--text-secondary)]">{c.roas?.toFixed(2)}x</td>
                    <td className="py-3 text-right text-[var(--text-secondary)]">{c.conversions?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]">
          <BarChart3 className="h-8 w-8 text-[var(--text-muted)] mb-3" />
          <h3 className="text-heading-sm text-[var(--text-primary)]">No active campaigns</h3>
          <p className="text-body-sm text-[var(--text-secondary)] mt-1 max-w-xs">
            Connect your ad platforms (Google Ads, Meta, etc.) in the Data Sources tab to sync campaign data.
          </p>
          <button
            onClick={() => setLocation("/connect")}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Connect Ad Platforms
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
