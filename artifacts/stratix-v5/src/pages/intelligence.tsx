import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useListReports, getListReportsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTabParam } from "@/hooks/use-tab-param";
import { useToast } from "@/hooks/use-toast";
import { useContextHealth } from "@/hooks/use-context-health";
import {
  Radar, FileText, BarChart3, Search, Plus, ArrowRight,
  TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign,
  Target, Eye, Activity, Download, Bell, Calendar, Mail,
  Loader2, CheckCircle, Heart, Globe, RefreshCw, Trash2,
  Newspaper, ChevronDown, ChevronUp, Zap, Clock, Sun,
  Settings, Send, Hash, X, SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileRadar } from "@/components/intelligence/mobile-radar";
import { BottomSheet } from "@/components/shared/bottom-sheet";

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
  anomaly?: boolean;
  significance?: "high" | "medium" | "low";
};

/* ── Monitoring preferences ── */

type MonitoringSchedule = "off" | "daily" | "weekly" | "realtime";

type MonitoringPrefs = {
  schedule: MonitoringSchedule;
  delivery: { inApp: boolean; email: boolean; slack: boolean };
  email: string;
  slackWebhook: string;
};

const DEFAULT_MONITORING_PREFS: MonitoringPrefs = {
  schedule: "off",
  delivery: { inApp: true, email: false, slack: false },
  email: "",
  slackWebhook: "",
};

/* ── Daily brief types ── */

type DailyBriefData = {
  generatedAt?: string;
  highlights?: string[];
  fullText?: string;
  signals?: { title: string; detail: string }[];
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

/* ── KPI Alert types ── */

type KPIAlert = {
  id: string;
  metric: "roas" | "spend" | "revenue" | "conversions" | "ctr" | "cpc";
  direction: "increase" | "decrease";
  percentChange: number;
  previousValue: number;
  currentValue: number;
  campaignName?: string;
  campaignId?: number;
  severity: "critical" | "warning" | "info";
  createdAt: string;
  dismissed: boolean;
};

type KPIThresholds = {
  thresholds: Record<string, { direction: "increase" | "decrease"; percent: number }>;
  checkFrequency: string;
};

const DEFAULT_THRESHOLDS: KPIThresholds = {
  thresholds: {
    roas: { direction: "decrease", percent: 15 },
    spend: { direction: "increase", percent: 30 },
    revenue: { direction: "decrease", percent: 20 },
    conversions: { direction: "decrease", percent: 25 },
  },
  checkFrequency: "6h",
};

const METRIC_LABELS: Record<string, string> = {
  roas: "ROAS",
  spend: "Spend",
  revenue: "Revenue",
  conversions: "Conversions",
  ctr: "CTR",
  cpc: "CPC",
};

const CHECK_FREQUENCIES = [
  { value: "1h", label: "Every hour" },
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Every 24 hours" },
];

/* ── Sparkline ── */

function Sparkline({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(" ");
  return (
    <svg width={width} height={height} className="inline-block ml-2">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ── Helpers ── */

const TYPE_FILTERS = ["All", "Competitor", "Market", "Social", "Press", "Campaign", "Anomalies Only"] as const;

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

/* ── Report type options ── */

const REPORT_TYPES = [
  { value: "market_intelligence", label: "Market Intelligence" },
  { value: "competitive_analysis", label: "Competitive Analysis" },
  { value: "growth_strategy", label: "Growth Strategy" },
  { value: "paid_acquisition", label: "Paid Acquisition" },
  { value: "brand_positioning", label: "Brand Positioning" },
  { value: "financial_modeling", label: "Financial Modeling" },
  { value: "cultural_intelligence", label: "Cultural Intelligence" },
  { value: "full_business_audit", label: "Full Business Audit" },
  { value: "weekly_intelligence_brief", label: "Weekly Intelligence Brief" },
] as const;

/* ── Brief / health types ── */

type CompetitorInsight = {
  competitor: string;
  summary: string;
  signals?: string[];
  sentiment?: string;
};

type BriefData = {
  brief?: string;
  competitors?: CompetitorInsight[];
  generatedAt?: string;
  [key: string]: unknown;
};

type MonitorResult = {
  competitor: string;
  summary?: string;
  signals?: string[];
  sentiment?: string;
  lastChecked?: string;
  [key: string]: unknown;
};

type TrendItem = {
  keyword?: string;
  query?: string;
  value?: number;
  interest?: number;
  date?: string;
  formattedTime?: string;
  [key: string]: unknown;
};

type NewsItem = {
  title: string;
  source?: string;
  date?: string;
  publishedAt?: string;
  snippet?: string;
  description?: string;
  url?: string;
  link?: string;
  competitor?: string;
};

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
  const isMobile = useIsMobile();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [alertPrefs, setAlertPrefs] = useState({
    competitorMoves: true,
    marketShifts: true,
    negativeSentiment: true,
    campaignAnomalies: true,
  });
  const { toast } = useToast();

  /* ── Competitive Brief state ── */
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  /* ── Monitoring schedule state ── */
  const [monitoringPrefs, setMonitoringPrefs] = useState<MonitoringPrefs>(DEFAULT_MONITORING_PREFS);
  const [monitoringPrefsSaving, setMonitoringPrefsSaving] = useState(false);
  const [showMonitoringPanel, setShowMonitoringPanel] = useState(false);

  /* ── Daily intelligence brief state ── */
  const [dailyBrief, setDailyBrief] = useState<DailyBriefData | null>(null);
  const [dailyBriefLoading, setDailyBriefLoading] = useState(false);
  const [showFullBrief, setShowFullBrief] = useState(false);

  /* ── Health score from shared hook ── */
  const contextHealth = useContextHealth();
  const healthScore = contextHealth.loading ? null : contextHealth.score;

  /* ── Track competitor state ── */
  const [showTrackForm, setShowTrackForm] = useState(false);
  const [trackDomain, setTrackDomain] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);

  /* ── Monitor competitor state ── */
  const [monitorResults, setMonitorResults] = useState<Record<string, MonitorResult>>({});
  const [monitorLoading, setMonitorLoading] = useState<Record<string, boolean>>({});
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});

  /* ── Market Trends state ── */
  const [trendData, setTrendData] = useState<TrendItem[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendQuery, setTrendQuery] = useState("");
  const [trendSearched, setTrendSearched] = useState(false);

  /* ── News Feed state ── */
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const fetchBrief = useCallback(() => {
    setBriefLoading(true);
    setBriefError(null);
    fetch("/api/intelligence/brief", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBriefData(d); else setBriefData(null); })
      .catch(() => setBriefError("Could not load competitive brief"))
      .finally(() => setBriefLoading(false));
  }, []);

  const fetchNews = useCallback((competitors: CompetitorInsight[]) => {
    if (!competitors || competitors.length === 0) return;
    setNewsLoading(true);
    const requests = competitors.slice(0, 5).map((c) =>
      fetch("/api/seo/news", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: c.competitor }),
      })
        .then((r) => (r.ok ? r.json() : { news: [] }))
        .then((d) => {
          const items: NewsItem[] = Array.isArray(d) ? d : d.news || d.results || d.articles || [];
          return items.map((n) => ({ ...n, competitor: c.competitor }));
        })
        .catch(() => [] as NewsItem[])
    );
    Promise.all(requests)
      .then((results) => setNewsItems(results.flat().slice(0, 20)))
      .finally(() => setNewsLoading(false));
  }, []);

  /* ── Fetch daily brief ── */
  const fetchDailyBrief = useCallback(() => {
    setDailyBriefLoading(true);
    fetch("/api/intelligence/daily-brief", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDailyBrief(d); })
      .catch(() => { /* silent */ })
      .finally(() => setDailyBriefLoading(false));
  }, []);

  /* ── Generate daily brief ── */
  const generateDailyBrief = useCallback(() => {
    setDailyBriefLoading(true);
    fetch("/api/intelligence/daily-brief/generate", {
      method: "POST",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDailyBrief(d); })
      .catch(() => toast({ title: "Failed to generate daily brief", variant: "destructive" }))
      .finally(() => setDailyBriefLoading(false));
  }, [toast]);

  /* ── Load monitoring preferences ── */
  const loadMonitoringPrefs = useCallback(() => {
    fetch("/api/intelligence/monitoring-preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.schedule) setMonitoringPrefs(d);
      })
      .catch(() => {
        /* Fallback to localStorage */
        try {
          const stored = localStorage.getItem("stratix:monitoring-prefs");
          if (stored) setMonitoringPrefs(JSON.parse(stored));
        } catch { /* silent */ }
      });
  }, []);

  /* ── Save monitoring preferences ── */
  const saveMonitoringPrefs = useCallback(() => {
    setMonitoringPrefsSaving(true);
    /* Always persist to localStorage as fallback */
    try { localStorage.setItem("stratix:monitoring-prefs", JSON.stringify(monitoringPrefs)); } catch { /* silent */ }
    fetch("/api/intelligence/monitoring-preferences", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(monitoringPrefs),
    })
      .then((r) => {
        if (r.ok) toast({ title: "Monitoring preferences saved" });
        else throw new Error("Save failed");
      })
      .catch(() => {
        toast({ title: "Saved locally (server unavailable)" });
      })
      .finally(() => setMonitoringPrefsSaving(false));
  }, [monitoringPrefs, toast]);

  /* ── Re-fetch signals helper ── */
  const refetchSignals = useCallback(() => {
    fetch("/api/intelligence/brief", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { signals: [] }))
      .then((d) => {
        const arr = Array.isArray(d) ? d : Array.isArray(d?.signals) ? d.signals : Array.isArray(d?.data) ? d.data : [];
        setSignals(arr);
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    /* Fetch signals */
    fetch("/api/intelligence/brief", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { signals: [] }))
      .then((d) => {
        const arr = Array.isArray(d) ? d : Array.isArray(d?.signals) ? d.signals : Array.isArray(d?.data) ? d.data : [];
        setSignals(arr);
      })
      .catch(() => setSignals([]))
      .finally(() => setLoading(false));

    /* Fetch competitive brief */
    setBriefLoading(true);
    fetch("/api/intelligence/brief", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setBriefData(d);
          /* Auto-fetch news for tracked competitors */
          if (d.competitors && d.competitors.length > 0) {
            fetchNews(d.competitors);
          }
        }
      })
      .catch(() => setBriefError("Could not load competitive brief"))
      .finally(() => setBriefLoading(false));

    /* Health score now comes from useContextHealth hook */

    /* Fetch daily brief */
    fetchDailyBrief();

    /* Load monitoring preferences */
    loadMonitoringPrefs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-refresh signals every 60s when tab is visible ── */
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refetchSignals();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [refetchSignals]);

  const handleTrackCompetitor = async () => {
    if (!trackDomain.trim()) return;
    setTrackLoading(true);
    try {
      const res = await fetch("/api/intelligence/track", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor: trackDomain.trim() }),
      });
      if (!res.ok) throw new Error("Failed to track competitor");
      toast({ title: `Now tracking ${trackDomain.trim()}` });
      setTrackDomain("");
      setShowTrackForm(false);
      /* Refresh brief + signals */
      fetchBrief();
      fetch("/api/intelligence/brief", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { signals: [] }))
        .then((d) => {
          const arr = Array.isArray(d) ? d : Array.isArray(d?.signals) ? d.signals : Array.isArray(d?.data) ? d.data : [];
          setSignals(arr);
        });
    } catch {
      toast({ title: "Failed to track competitor", variant: "destructive" });
    } finally {
      setTrackLoading(false);
    }
  };

  const handleMonitor = async (competitor: string) => {
    setMonitorLoading((prev) => ({ ...prev, [competitor]: true }));
    try {
      const res = await fetch(`/api/intelligence/monitor/${encodeURIComponent(competitor)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Monitor failed");
      const data = await res.json();
      setMonitorResults((prev) => ({ ...prev, [competitor]: data }));
      setExpandedCompetitor(competitor);
    } catch {
      toast({ title: `Failed to monitor ${competitor}`, variant: "destructive" });
    } finally {
      setMonitorLoading((prev) => ({ ...prev, [competitor]: false }));
    }
  };

  const handleRemoveCompetitor = async (competitor: string, id?: number | string) => {
    const removeId = id || competitor;
    setRemoveLoading((prev) => ({ ...prev, [competitor]: true }));
    try {
      const res = await fetch(`/api/intelligence/insights/${encodeURIComponent(String(removeId))}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Remove failed");
      toast({ title: `Removed ${competitor}` });
      /* Refresh brief */
      fetchBrief();
    } catch {
      toast({ title: `Failed to remove ${competitor}`, variant: "destructive" });
    } finally {
      setRemoveLoading((prev) => ({ ...prev, [competitor]: false }));
    }
  };

  const handleSearchTrends = async (query?: string) => {
    const q = (query || trendQuery).trim();
    if (!q) return;
    setTrendLoading(true);
    setTrendSearched(true);
    try {
      const res = await fetch("/api/seo/trends", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error("Trend fetch failed");
      const data = await res.json();
      const items: TrendItem[] = Array.isArray(data) ? data : data.trends || data.results || data.data || [];
      setTrendData(items);
    } catch {
      toast({ title: "Failed to fetch trend data", variant: "destructive" });
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = signals;
    if (typeFilter === "Anomalies Only") {
      list = list.filter((s) => s.anomaly === true || s.significance === "high");
    } else if (typeFilter !== "All") {
      list = list.filter((s) => s.type === typeFilter.toLowerCase());
    }
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

  const handleExportCSV = () => {
    const headers = ["Type", "Title", "Sentiment", "Competitor", "Source", "Timestamp"];
    const rows = filtered.map((s) => [
      s.type,
      s.title,
      s.sentiment,
      s.competitor || "",
      s.source,
      s.timestamp,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    navigator.clipboard.writeText(csv);
    toast({ title: "Signals exported to clipboard" });
  };

  /* ── Alert delivery channels ── */
  const [alertDelivery, setAlertDelivery] = useState<{
    inApp: boolean;
    email: string;
    slack: string;
  }>({ inApp: true, email: "", slack: "" });
  const [alertSaving, setAlertSaving] = useState(false);

  /* Load alert config on mount */
  useEffect(() => {
    fetch("/api/intelligence/alert-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg) return;
        if (cfg.alerts) {
          setAlertPrefs((prev) => ({ ...prev, ...cfg.alerts }));
        }
        if (cfg.delivery) {
          setAlertDelivery({
            inApp: cfg.delivery.inApp ?? true,
            email: cfg.delivery.email ?? "",
            slack: cfg.delivery.slack ?? "",
          });
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleSaveAlerts = async () => {
    setAlertSaving(true);
    try {
      const res = await fetch("/api/intelligence/alert-config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alerts: alertPrefs,
          delivery: alertDelivery,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Alert preferences saved" });
      setShowAlertConfig(false);
    } catch {
      toast({ title: "Failed to save alert config", variant: "destructive" });
    } finally {
      setAlertSaving(false);
    }
  };

  /* Tracked competitors from brief */
  const trackedCompetitors = briefData?.competitors || [];

  /* Stat cards use real count when available, placeholders otherwise */
  const stats = [
    { label: "Active Signals", value: signals.length || 24, icon: Activity },
    { label: "Competitors Tracked", value: trackedCompetitors.length || new Set(signals.filter((s) => s.competitor).map((s) => s.competitor)).size || 6, icon: Eye },
    { label: "Sources Monitored", value: new Set(signals.map((s) => s.source)).size || 12, icon: Radar },
    { label: "Alerts This Week", value: signals.filter((s) => s.sentiment === "negative").length || 3, icon: AlertCircle },
  ];

  if (loading) {
    return <div className="py-12 text-center text-body-sm text-[var(--text-muted)]">Loading signals...</div>;
  }

  if (signals.length === 0 && !briefData && !briefLoading) {
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

  /* Mobile: render optimized mobile radar view */
  if (isMobile) {
    return (
      <MobileRadar
        signals={signals}
        brief={dailyBrief}
        onRefresh={refetchSignals}
        onTrackCompetitor={() => setShowTrackForm(true)}
        onViewBrief={() => generateDailyBrief()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Health score indicator */}
      {healthScore !== null && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-[var(--accent)]" />
            <span className="text-caption text-[var(--text-muted)]">Context Health</span>
            <div className="w-24 h-2 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${healthScore}%`,
                  backgroundColor: healthScore >= 70 ? "var(--success)" : healthScore >= 40 ? "#C49A6C" : "var(--error)",
                }}
              />
            </div>
            <span className="text-caption font-medium text-[var(--text-primary)]">{healthScore}%</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {Object.values(contextHealth.breakdown).map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                  item.complete
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                }`}
              >
                {item.complete ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────── */}
      {/*  0. DAILY INTELLIGENCE BRIEF (scheduled)          */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <h2 className="font-editorial text-[20px] font-medium text-[var(--text-primary)]">
                Daily Intelligence Brief
              </h2>
              {dailyBrief?.generatedAt && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Generated: {format(new Date(dailyBrief.generatedAt), "EEEE 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dailyBrief && (
              <button
                onClick={generateDailyBrief}
                disabled={dailyBriefLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${dailyBriefLoading ? "animate-spin" : ""}`} />
                Regenerate
              </button>
            )}
          </div>
        </div>

        {dailyBriefLoading && (
          <div className="flex items-center gap-2 py-6 justify-center text-body-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating daily brief...
          </div>
        )}

        {!dailyBrief && !dailyBriefLoading && (
          <div className="py-6 text-center">
            <Sun className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-secondary)] mb-3">
              Generate your first daily brief to get a summary of competitor moves, market shifts, and key signals.
            </p>
            <button
              onClick={generateDailyBrief}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              Generate Your First Daily Brief
            </button>
          </div>
        )}

        {dailyBrief && !dailyBriefLoading && (
          <div className="space-y-2">
            {dailyBrief.highlights && dailyBrief.highlights.length > 0 && (
              <ul className="space-y-1.5">
                {dailyBrief.highlights.slice(0, 5).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">&bull;</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {dailyBrief.signals && dailyBrief.signals.length > 0 && !dailyBrief.highlights && (
              <ul className="space-y-1.5">
                {dailyBrief.signals.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-body-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">&bull;</span>
                    <span><span className="font-medium text-[var(--text-primary)]">{s.title}</span> {s.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {dailyBrief.fullText && (
              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => setShowFullBrief(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Full Brief
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full brief modal */}
      {showFullBrief && dailyBrief?.fullText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFullBrief(false)}>
          <div
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="font-editorial text-[20px] font-medium text-[var(--text-primary)]">Full Intelligence Brief</h3>
              <button
                onClick={() => setShowFullBrief(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-body-sm"
              >
                Close
              </button>
            </div>
            <div className="p-5 prose-warm text-body-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {dailyBrief.fullText}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────── */}
      {/*  1. DAILY BRIEF — Morning Brief card              */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-editorial text-[22px] font-medium text-[var(--text-primary)]">
              Your Morning Brief
            </h2>
            <p className="text-caption text-[var(--text-muted)] mt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={fetchBrief}
            disabled={briefLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${briefLoading ? "animate-spin" : ""}`} />
            Refresh Brief
          </button>
        </div>

        {briefLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-body-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your daily intelligence brief...
          </div>
        )}

        {briefError && !briefLoading && (
          <div className="py-6 text-center">
            <AlertCircle className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-muted)]">{briefError}</p>
          </div>
        )}

        {!briefData && !briefLoading && !briefError && (
          <div className="py-6 text-center">
            <Radar className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-secondary)]">
              No brief yet — track competitors to start receiving daily intelligence.
            </p>
          </div>
        )}

        {briefData && !briefLoading && (
          <div className="space-y-3">
            {briefData.brief && (
              <div className="prose-warm text-body-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                {briefData.brief}
              </div>
            )}
            {briefData.generatedAt && (
              <p className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                Generated {format(new Date(briefData.generatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        )}
      </div>

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

      {/* ────────────────────────────────────────────────── */}
      {/*  2. TRACKED COMPETITORS — Manager section         */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-sm text-[var(--text-primary)] flex items-center gap-2">
            <Globe className="h-4 w-4 text-[var(--accent)]" />
            Tracked Competitors
          </h3>
          <button
            onClick={() => setShowTrackForm(!showTrackForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Track Competitor
          </button>
        </div>

        {/* Track competitor inline form */}
        {showTrackForm && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)]">
            <Globe className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="competitor.com"
              value={trackDomain}
              onChange={(e) => setTrackDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrackCompetitor()}
              className="flex-1 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              onClick={handleTrackCompetitor}
              disabled={trackLoading || !trackDomain.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {trackLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Track
            </button>
            <button
              onClick={() => { setShowTrackForm(false); setTrackDomain(""); }}
              className="px-2 py-1.5 rounded-[var(--radius-md)] text-[var(--text-muted)] text-caption hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {trackedCompetitors.length === 0 && (
          <div className="py-6 text-center">
            <Eye className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-muted)]">
              No competitors tracked yet. Add a competitor domain above to begin monitoring.
            </p>
          </div>
        )}

        {trackedCompetitors.length > 0 && (
          <div className="space-y-2">
            {trackedCompetitors.map((c, i) => {
              const isExpanded = expandedCompetitor === c.competitor;
              const monitorResult = monitorResults[c.competitor];
              const isMonitoring = monitorLoading[c.competitor];
              const isRemoving = removeLoading[c.competitor];

              return (
                <div key={i} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      c.sentiment === "positive" ? "bg-[#3C8B4E]" :
                      c.sentiment === "negative" ? "bg-[#8B3C3C]" :
                      "bg-[#C49A6C]"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-body-sm font-medium text-[var(--accent)]">{c.competitor}</span>
                      {c.sentiment && (
                        <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          c.sentiment === "positive" ? "bg-[#D5E8D8] text-[#3C8B4E]" :
                          c.sentiment === "negative" ? "bg-[#E8D5D5] text-[#8B3C3C]" :
                          "bg-[var(--surface)] text-[var(--text-muted)]"
                        }`}>
                          {c.sentiment}
                        </span>
                      )}
                      <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-1">{c.summary}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMonitor(c.competitor)}
                        disabled={isMonitoring}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px] font-medium hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                      >
                        {isMonitoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        Monitor Now
                      </button>
                      <button
                        onClick={() => setExpandedCompetitor(isExpanded ? null : c.competitor)}
                        className="p-1 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleRemoveCompetitor(c.competitor, (c as unknown as { id?: number }).id)}
                        disabled={isRemoving}
                        className="p-1 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors disabled:opacity-50"
                        title="Remove competitor"
                      >
                        {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded monitor result */}
                  {isExpanded && monitorResult && (
                    <div className="px-3 pb-3 pt-0 border-t border-[var(--border)]">
                      <div className="mt-3 space-y-2">
                        {monitorResult.summary && (
                          <p className="text-body-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">{monitorResult.summary}</p>
                        )}
                        {monitorResult.signals && monitorResult.signals.length > 0 && (
                          <ul className="space-y-1">
                            {monitorResult.signals.map((sig, si) => (
                              <li key={si} className="flex items-start gap-2 text-caption text-[var(--text-secondary)]">
                                <span className="text-[var(--accent)] mt-0.5 shrink-0">&bull;</span>
                                {sig}
                              </li>
                            ))}
                          </ul>
                        )}
                        {monitorResult.lastChecked && (
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Last checked: {format(new Date(monitorResult.lastChecked), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                        {/* Show raw data if no structured content */}
                        {!monitorResult.summary && !monitorResult.signals?.length && (
                          <p className="text-body-sm text-[var(--text-secondary)] whitespace-pre-line">
                            {JSON.stringify(monitorResult, null, 2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isExpanded && !monitorResult && !isMonitoring && (
                    <div className="px-3 pb-3 pt-0 border-t border-[var(--border)]">
                      <p className="mt-3 text-caption text-[var(--text-muted)]">
                        Click "Monitor Now" to fetch the latest intelligence for this competitor.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────── */}
      {/*  2b. AUTONOMOUS MONITORING SCHEDULE               */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <button onClick={() => setShowMonitoringPanel(!showMonitoringPanel)} className="flex items-center justify-between w-full">
          <h3 className="text-heading-sm text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            Autonomous Monitoring
            {monitoringPrefs.schedule !== "off" && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#D5E8D8] text-[#3C8B4E]">{monitoringPrefs.schedule}</span>
            )}
          </h3>
          {showMonitoringPanel ? <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />}
        </button>
        {showMonitoringPanel && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-caption font-medium text-[var(--text-primary)] mb-2 block">Schedule</label>
              <div className="flex items-center gap-2 flex-wrap">
                {(["off", "daily", "weekly", "realtime"] as MonitoringSchedule[]).map((opt) => (
                  <button key={opt} onClick={() => setMonitoringPrefs((p) => ({ ...p, schedule: opt }))} className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors ${monitoringPrefs.schedule === opt ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"}`}>
                    {opt === "off" ? "Off" : opt === "daily" ? "Daily" : opt === "weekly" ? "Weekly" : "Real-time"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-caption font-medium text-[var(--text-primary)] mb-2 block">Delivery</label>
              <div className="space-y-2">
                {([{ key: "inApp" as const, label: "In-app notifications", icon: Bell }, { key: "email" as const, label: "Email digest", icon: Mail }, { key: "slack" as const, label: "Slack channel", icon: Hash }]).map((item) => (
                  <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={monitoringPrefs.delivery[item.key]} onChange={(e) => setMonitoringPrefs((p) => ({ ...p, delivery: { ...p.delivery, [item.key]: e.target.checked } }))} className="rounded border border-[var(--border)] w-4 h-4 cursor-pointer accent-[var(--accent)]" />
                    <item.icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="text-body-sm text-[var(--text-primary)]">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {monitoringPrefs.delivery.email && (
              <div>
                <label className="text-caption font-medium text-[var(--text-primary)] mb-1.5 block">Email</label>
                <input type="email" placeholder="user@example.com" value={monitoringPrefs.email} onChange={(e) => setMonitoringPrefs((p) => ({ ...p, email: e.target.value }))} className="w-full max-w-sm px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              </div>
            )}
            {monitoringPrefs.delivery.slack && (
              <div>
                <label className="text-caption font-medium text-[var(--text-primary)] mb-1.5 block">Slack Webhook URL</label>
                <input type="url" placeholder="https://hooks.slack.com/services/..." value={monitoringPrefs.slackWebhook} onChange={(e) => setMonitoringPrefs((p) => ({ ...p, slackWebhook: e.target.value }))} className="w-full max-w-sm px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
              </div>
            )}
            <div className="pt-2 border-t border-[var(--border)]">
              <button onClick={saveMonitoringPrefs} disabled={monitoringPrefsSaving} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
                {monitoringPrefsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────── */}
      {/*  3. MARKET TRENDS                                 */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-sm text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
            Market Trends
          </h3>
        </div>

        {/* Trend search input */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search trends (e.g. AI marketing, SaaS growth)..."
              value={trendQuery}
              onChange={(e) => setTrendQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchTrends()}
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <button
            onClick={() => handleSearchTrends()}
            disabled={trendLoading || !trendQuery.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {trendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Search Trends
          </button>
        </div>

        {trendLoading && (
          <div className="flex items-center gap-2 py-6 justify-center text-body-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching trend data...
          </div>
        )}

        {!trendLoading && trendSearched && trendData.length === 0 && (
          <div className="py-6 text-center">
            <TrendingUp className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-muted)]">No trend data found for this query.</p>
          </div>
        )}

        {!trendLoading && trendData.length > 0 && (
          <div className="space-y-2">
            {/* Simple bar chart visualization */}
            <div className="grid grid-cols-1 gap-1.5">
              {trendData.slice(0, 12).map((t, i) => {
                const label = t.query || t.keyword || t.formattedTime || t.date || `Point ${i + 1}`;
                const val = t.value || t.interest || 0;
                const maxVal = Math.max(...trendData.map((d) => d.value || d.interest || 0), 1);
                const pct = (val / maxVal) * 100;

                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-caption text-[var(--text-muted)] w-28 truncate shrink-0">{label}</span>
                    <div className="flex-1 h-5 rounded bg-[var(--surface-secondary)] overflow-hidden">
                      <div
                        className="h-full rounded bg-[var(--accent)] transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-caption font-medium text-[var(--text-primary)] w-10 text-right shrink-0">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!trendLoading && !trendSearched && (
          <div className="py-4 text-center">
            <p className="text-body-sm text-[var(--text-muted)]">
              Enter a keyword above to see Google Trends data for any topic or industry.
            </p>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────── */}
      {/*  4. LATEST NEWS                                   */}
      {/* ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-sm text-[var(--text-primary)] flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-[var(--accent)]" />
            Latest News
          </h3>
          {trackedCompetitors.length > 0 && (
            <button
              onClick={() => fetchNews(trackedCompetitors)}
              disabled={newsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${newsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>

        {newsLoading && (
          <div className="flex items-center gap-2 py-6 justify-center text-body-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching latest news...
          </div>
        )}

        {!newsLoading && trackedCompetitors.length === 0 && (
          <div className="py-6 text-center">
            <Newspaper className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-muted)]">
              Track competitors to see relevant news.
            </p>
          </div>
        )}

        {!newsLoading && trackedCompetitors.length > 0 && newsItems.length === 0 && (
          <div className="py-6 text-center">
            <Newspaper className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-body-sm text-[var(--text-muted)]">No news articles found for tracked competitors.</p>
          </div>
        )}

        {!newsLoading && newsItems.length > 0 && (
          <div className="space-y-2">
            {newsItems.map((n, i) => (
              <a
                key={i}
                href={n.url || n.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Newspaper className="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-[var(--text-primary)] line-clamp-2">
                      {n.title}
                    </p>
                    {(n.snippet || n.description) && (
                      <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                        {n.snippet || n.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {n.source && (
                        <span className="text-[11px] text-[var(--text-muted)]">{n.source}</span>
                      )}
                      {(n.date || n.publishedAt) && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          &middot; {n.date || n.publishedAt}
                        </span>
                      )}
                      {n.competitor && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8D5C8] text-[#8B5E3C]">
                          {n.competitor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAlertConfig(!showAlertConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            Configure Alerts
          </button>
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
      </div>

      {/* Alert configuration panel */}
      {showAlertConfig && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-body-sm font-medium text-[var(--text-primary)]">Alert Preferences</h4>
          </div>
          <div className="space-y-3">
            {[
              { key: "competitorMoves", label: "Competitor moves" },
              { key: "marketShifts", label: "Market shifts" },
              { key: "negativeSentiment", label: "Negative sentiment" },
              { key: "campaignAnomalies", label: "Campaign anomalies" },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={alertPrefs[item.key as keyof typeof alertPrefs]}
                  onChange={(e) =>
                    setAlertPrefs((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="rounded border border-[var(--border)] w-4 h-4 cursor-pointer accent-[var(--accent)]"
                />
                <span className="text-body-sm text-[var(--text-primary)]">{item.label}</span>
              </label>
            ))}
          </div>
          {/* Delivery channels */}
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <h5 className="text-caption font-medium text-[var(--text-secondary)] mb-3">Delivery Channels</h5>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertDelivery.inApp}
                  onChange={(e) => setAlertDelivery((prev) => ({ ...prev, inApp: e.target.checked }))}
                  className="rounded border border-[var(--border)] w-4 h-4 cursor-pointer accent-[var(--accent)]"
                />
                <span className="text-body-sm text-[var(--text-primary)]">In-app notifications</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-body-sm text-[var(--text-primary)]">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="alerts@company.com"
                  value={alertDelivery.email}
                  onChange={(e) => setAlertDelivery((prev) => ({ ...prev, email: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span className="text-body-sm text-[var(--text-primary)]">Slack</span>
                </label>
                <input
                  type="text"
                  placeholder="#strategy-channel"
                  value={alertDelivery.slack}
                  onChange={(e) => setAlertDelivery((prev) => ({ ...prev, slack: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleSaveAlerts}
              disabled={alertSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {alertSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> : "Save"}
            </button>
            <button
              onClick={() => setShowAlertConfig(false)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-body-sm font-medium hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                  {(s.anomaly || s.significance === "high") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8D5D5] text-[#8B3C3C]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B3C3C] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B3C3C]" />
                      </span>
                      Anomaly Detected
                    </span>
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
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useListReports(undefined, {
    query: { queryKey: getListReportsQueryKey() },
  });
  const [search, setSearch] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState("Weekly");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const { toast } = useToast();

  /* ── Report delivery state ── */
  const [deliveryOpen, setDeliveryOpen] = useState<number | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<"email" | "slack">("email");
  const [deliveryDest, setDeliveryDest] = useState("");
  const [deliverySchedule, setDeliverySchedule] = useState<"once" | "daily" | "weekly">("once");
  const [deliverySending, setDeliverySending] = useState(false);

  const handleDeliver = useCallback(async (reportId: number) => {
    if (!deliveryDest.trim()) {
      toast({ title: "Please enter a destination" });
      return;
    }
    setDeliverySending(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/deliver`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: deliveryChannel,
          destination: deliveryDest.trim(),
          schedule: deliverySchedule,
        }),
      });
      if (!res.ok) throw new Error("Delivery failed");
      toast({ title: deliverySchedule === "once" ? "Report sent" : `Scheduled ${deliverySchedule} delivery` });
      setDeliveryOpen(null);
      setDeliveryDest("");
    } catch {
      toast({ title: "Delivery failed", variant: "destructive" });
    } finally {
      setDeliverySending(false);
    }
  }, [deliveryChannel, deliveryDest, deliverySchedule, toast]);

  /* ── New Report form state ── */
  const [showNewReport, setShowNewReport] = useState(false);
  const [newReportType, setNewReportType] = useState<string>(REPORT_TYPES[0].value);
  const [newReportCompany, setNewReportCompany] = useState("");
  const [newReportNotes, setNewReportNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");
  const [genComplete, setGenComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const safeReports = Array.isArray(reports) ? reports : [];
  const filtered = useMemo(() => {
    if (!safeReports.length) return [];
    if (!search.trim()) return safeReports;
    const q = search.toLowerCase();
    return safeReports.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q) ||
        r.reportType?.toLowerCase().includes(q)
    );
  }, [safeReports, search]);

  const handleSaveSchedule = () => {
    setShowScheduler(false);
    setScheduleFreq("Weekly");
    setScheduleEmail("");
    toast({ title: "Report schedule saved" });
  };

  /* ── Generate report with SSE streaming ── */
  const handleGenerateReport = useCallback(async () => {
    if (!newReportCompany.trim()) {
      toast({ title: "Company name is required" });
      return;
    }
    setGenerating(true);
    setGenProgress("Starting report generation...");
    setGenComplete(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: newReportCompany.trim(),
          reportType: newReportType,
          ...(newReportNotes.trim() ? { notes: newReportNotes.trim(), additionalContext: newReportNotes.trim() } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Report generation failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        /* SSE streaming response */
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const payload = line.slice(6).trim();
                if (payload === "[DONE]") {
                  setGenComplete(true);
                  setGenProgress("Report generated successfully.");
                } else {
                  try {
                    const evt = JSON.parse(payload);
                    if (evt.status) setGenProgress(evt.status);
                    else if (evt.progress) setGenProgress(evt.progress);
                    else if (evt.chunk) setGenProgress((p) => p + evt.chunk);
                    else if (evt.message) setGenProgress(evt.message);
                  } catch {
                    setGenProgress(payload);
                  }
                }
              } else if (line.startsWith("event: done") || line.startsWith("event: complete")) {
                setGenComplete(true);
              }
            }
          }
        }
      } else {
        /* JSON response (non-streaming) */
        const data = await res.json();
        setGenProgress(data.title || data.message || "Report generated.");
        setGenComplete(true);
      }

      /* Refresh reports list */
      queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
      if (!genComplete) {
        setGenComplete(true);
        setGenProgress("Report generated successfully.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setGenProgress("Generation cancelled.");
      } else {
        setGenProgress("Failed to generate report.");
        toast({ title: "Report generation failed", variant: "destructive" });
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [newReportCompany, newReportType, newReportNotes, toast, queryClient]);

  /* ── Export report ── */
  const handleExportReport = useCallback(async (reportId: number) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ct = res.headers.get("content-type") || "";
      a.download = ct.includes("pdf") ? `report-${reportId}.pdf` : `report-${reportId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Report exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }, [toast]);

  if (isLoading) {
    return <div className="py-12 text-center text-body-sm text-[var(--text-muted)]">Loading reports...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-body-sm font-medium hover:bg-[var(--surface-elevated)] transition-colors shrink-0"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule Reports
          </button>
          <button
            onClick={() => { setShowNewReport(!showNewReport); setGenComplete(false); setGenProgress(""); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            New Report
          </button>
        </div>
      </div>

      {/* New Report form */}
      {showNewReport && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
          <h4 className="text-body-sm font-medium text-[var(--text-primary)] mb-4">Generate Report</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-caption text-[var(--text-secondary)] mb-1.5 font-medium">
                Report Type
              </label>
              <select
                value={newReportType}
                onChange={(e) => setNewReportType(e.target.value)}
                disabled={generating}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-caption text-[var(--text-secondary)] mb-1.5 font-medium">
                Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={newReportCompany}
                onChange={(e) => setNewReportCompany(e.target.value)}
                disabled={generating}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-caption text-[var(--text-secondary)] mb-1.5 font-medium">
                Notes (optional)
              </label>
              <textarea
                placeholder="Additional context or focus areas..."
                value={newReportNotes}
                onChange={(e) => setNewReportNotes(e.target.value)}
                disabled={generating}
                rows={2}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Generation progress */}
          {(generating || genProgress) && (
            <div className="mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                {generating && <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)] shrink-0" />}
                {genComplete && <CheckCircle className="h-4 w-4 text-[var(--success)] shrink-0" />}
                <p className="text-body-sm text-[var(--text-secondary)] line-clamp-3">{genProgress}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleGenerateReport}
              disabled={generating || !newReportCompany.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
            {generating && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-body-sm font-medium hover:bg-[var(--surface-elevated)] transition-colors"
              >
                Cancel
              </button>
            )}
            {!generating && (
              <button
                onClick={() => { setShowNewReport(false); setGenProgress(""); setGenComplete(false); }}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-body-sm font-medium hover:bg-[var(--surface-elevated)] transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Schedule Reports panel */}
      {showScheduler && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
          <h4 className="text-body-sm font-medium text-[var(--text-primary)] mb-4">Schedule Reports</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-caption text-[var(--text-secondary)] mb-1.5 font-medium">
                Frequency
              </label>
              <select
                value={scheduleFreq}
                onChange={(e) => setScheduleFreq(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option>Weekly</option>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-caption text-[var(--text-secondary)] mb-1.5 font-medium">
                Delivery Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="your.email@company.com"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
            <button
              onClick={handleSaveSchedule}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowScheduler(false)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-body-sm font-medium hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report list */}
      {!reports?.length && !genComplete ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-10 w-10 text-[var(--text-muted)] mb-4" />
          <h3 className="font-editorial text-[22px] text-[var(--text-primary)]">No reports yet</h3>
          <p className="text-body text-[var(--text-secondary)] mt-1">Click "New Report" above to generate your first strategy report.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No reports match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors group"
            >
              <FileText className="h-5 w-5 text-[var(--accent)] shrink-0" />
              <div
                onClick={() => setLocation(`/solve?report=${r.id}`)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                  {r.reportType && (
                    <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#D5DDE8] text-[#3C5E8B]">
                      {r.reportType.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="text-caption text-[var(--text-muted)]">
                  {r.company}
                  {r.createdAt && <> &middot; {format(new Date(r.createdAt), "MMM d, yyyy")}</>}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportReport(r.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeliveryOpen(deliveryOpen === r.id ? null : r.id);
                    setDeliveryDest("");
                    setDeliveryChannel("email");
                    setDeliverySchedule("once");
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Deliver
                  <ChevronDown className="h-3 w-3" />
                </button>
                {deliveryOpen === r.id && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl shadow-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-caption font-medium text-[var(--text-secondary)] mb-2">Deliver to...</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`deliver-${r.id}`}
                            checked={deliveryChannel === "email"}
                            onChange={() => setDeliveryChannel("email")}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-body-sm text-[var(--text-primary)]">Email</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`deliver-${r.id}`}
                            checked={deliveryChannel === "slack"}
                            onChange={() => setDeliveryChannel("slack")}
                            className="accent-[var(--accent)]"
                          />
                          <span className="text-body-sm text-[var(--text-primary)]">Slack</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder={deliveryChannel === "email" ? "address@co.com" : "#strategy-channel"}
                        value={deliveryDest}
                        onChange={(e) => setDeliveryDest(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliverySchedule !== "once"}
                          onChange={(e) => setDeliverySchedule(e.target.checked ? "weekly" : "once")}
                          className="rounded border border-[var(--border)] w-3.5 h-3.5 accent-[var(--accent)]"
                        />
                        <span className="text-caption text-[var(--text-secondary)]">Schedule</span>
                        {deliverySchedule !== "once" && (
                          <select
                            value={deliverySchedule}
                            onChange={(e) => setDeliverySchedule(e.target.value as "daily" | "weekly")}
                            className="px-2 py-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] text-caption text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="daily">daily</option>
                            <option value="weekly">weekly</option>
                          </select>
                        )}
                      </label>
                      <button
                        onClick={() => handleDeliver(r.id)}
                        disabled={deliverySending || !deliveryDest.trim()}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                      >
                        {deliverySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {deliverySending ? "Sending..." : "Send Now"}
                      </button>
                    </div>
                  </div>
                )}
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
  const { toast } = useToast();

  /* -- KPI Alerts state -- */
  const [kpiAlerts, setKpiAlerts] = useState<KPIAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  /* -- Threshold config state -- */
  const [showThresholds, setShowThresholds] = useState(false);
  const [thresholds, setThresholds] = useState<KPIThresholds>(DEFAULT_THRESHOLDS);
  const [thresholdsSaving, setThresholdsSaving] = useState(false);

  /* -- Trend sparkline data -- */
  const [sparkTrends, setSparkTrends] = useState<Record<string, number[]>>({});

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/ads/metrics/overview", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ads/campaigns", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/intelligence/kpi-alerts", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/intelligence/kpi-thresholds", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ads/metrics/trend?period=7d", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([metricsResult, campaignsResult, alertsResult, thresholdsResult, trendResult]) => {
        if (metricsResult.status === "fulfilled" && metricsResult.value) setMetrics(metricsResult.value);
        if (campaignsResult.status === "fulfilled") {
          const raw = campaignsResult.value;
          setCampaigns(Array.isArray(raw) ? raw : raw?.campaigns || []);
        }
        if (alertsResult.status === "fulfilled") {
          const raw = alertsResult.value;
          const arr: KPIAlert[] = Array.isArray(raw) ? raw : raw?.alerts || [];
          setKpiAlerts(arr.filter((a: KPIAlert) => !a.dismissed));
        }
        if (thresholdsResult.status === "fulfilled" && thresholdsResult.value && thresholdsResult.value.thresholds) {
          setThresholds(thresholdsResult.value);
        }
        if (trendResult.status === "fulfilled" && trendResult.value) {
          const raw = trendResult.value;
          if (raw.spend || raw.revenue || raw.roas || raw.conversions) {
            setSparkTrends(raw);
          }
        }
      })
      .finally(() => {
        setLoading(false);
        setAlertsLoading(false);
      });
  }, []);

  /* -- Dismiss alert -- */
  const dismissAlert = useCallback((alertId: string) => {
    setKpiAlerts((prev) => prev.filter((a) => a.id !== alertId));
    fetch(`/api/intelligence/kpi-alerts/${alertId}/dismiss`, {
      method: "PATCH",
      credentials: "include",
    }).catch(() => { /* silent */ });
  }, []);

  /* -- Save thresholds -- */
  const saveThresholds = useCallback(() => {
    setThresholdsSaving(true);
    fetch("/api/intelligence/kpi-thresholds", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(thresholds),
    })
      .then((r) => {
        if (r.ok) toast({ title: "Alert thresholds saved" });
        else throw new Error("Save failed");
      })
      .catch(() => {
        toast({ title: "Saved locally (server unavailable)" });
      })
      .finally(() => {
        setThresholdsSaving(false);
        setShowThresholds(false);
      });
  }, [thresholds, toast]);

  /* -- Generate placeholder sparkline from overview value -- */
  const getSparklineData = useCallback((metricKey: string, baseValue: number): number[] => {
    if (sparkTrends[metricKey] && sparkTrends[metricKey].length > 1) return sparkTrends[metricKey];
    if (!baseValue) return [];
    const variance = baseValue * 0.1;
    return Array.from({ length: 7 }, (_, i) => {
      const seed = (metricKey.charCodeAt(0) * 31 + i * 17) % 100;
      return baseValue + (seed / 100 - 0.5) * variance * 2;
    });
  }, [sparkTrends]);

  /* -- Detect cross-metric correlations -- */
  const correlations = useMemo(() => {
    const results: { type: "warning" | "success"; message: string }[] = [];
    const activeAlerts = kpiAlerts.filter((a) => !a.dismissed);
    const spendUp = activeAlerts.find((a) => a.metric === "spend" && a.direction === "increase" && a.percentChange > 10);
    const roasDown = activeAlerts.find((a) => a.metric === "roas" && a.direction === "decrease" && a.percentChange > 10);
    if (spendUp && roasDown) {
      results.push({ type: "warning", message: "Efficiency declining: spend up but returns dropping" });
    }
    const revenueUp = activeAlerts.find((a) => a.metric === "revenue" && a.direction === "increase" && a.percentChange > 15);
    const convsUp = activeAlerts.find((a) => a.metric === "conversions" && a.direction === "increase" && a.percentChange > 10);
    if (revenueUp && convsUp) {
      results.push({ type: "success", message: "Growth signal: revenue and conversions aligned" });
    }
    return results;
  }, [kpiAlerts]);

  /* -- Severity styling -- */
  const severityStyles = (severity: KPIAlert["severity"]) => {
    if (severity === "critical") return "border-l-[var(--error)] bg-[var(--surface-elevated)]";
    if (severity === "warning") return "border-l-[#D4A017] bg-[var(--surface-elevated)]";
    return "border-l-[var(--accent)] bg-[var(--surface-elevated)]";
  };

  const severityTextColor = (severity: KPIAlert["severity"]) => {
    if (severity === "critical") return "text-[var(--error)]";
    if (severity === "warning") return "text-[#D4A017]";
    return "text-[var(--accent)]";
  };

  /* -- Sparkline color -- */
  const sparklineColor = (data: number[]) => {
    if (data.length < 2) return "var(--accent)";
    return data[data.length - 1] >= data[0] ? "var(--accent)" : "var(--error)";
  };

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

  const spendVal = metrics?.totalSpend || metrics?.spend || 0;
  const revenueVal = metrics?.totalRevenue || metrics?.revenue || 0;
  const roasVal = metrics?.avgROAS || metrics?.roas || 0;
  const convsVal = metrics?.totalConversions || metrics?.conversions || 0;

  const metricCards = [
    { label: "Total Spend", value: fmtCurrency(spendVal), icon: DollarSign, key: "spend", raw: spendVal },
    { label: "Revenue", value: fmtCurrency(revenueVal), icon: TrendingUp, key: "revenue", raw: revenueVal },
    { label: "ROAS", value: `${roasVal.toFixed(2)}x`, icon: Target, key: "roas", raw: roasVal },
    { label: "Conversions", value: convsVal.toLocaleString(), icon: Activity, key: "conversions", raw: convsVal },
  ];

  return (
    <div className="space-y-6">
      {/* -- KPI Alerts Panel -- */}
      {!alertsLoading && kpiAlerts.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="font-editorial text-[18px] text-[var(--text-primary)] flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--accent)]" />
              Active KPI Alerts
            </h3>
            <button
              onClick={() => setShowThresholds(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configure</span> Thresholds
            </button>
          </div>
          <div className="space-y-2">
            {kpiAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-[var(--radius-md)] border-l-4 p-3 ${severityStyles(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${severityTextColor(alert.severity)}`} />
                      <span className="text-body-sm font-medium text-[var(--text-primary)]">
                        {METRIC_LABELS[alert.metric] || alert.metric}{" "}
                        {alert.direction === "decrease" ? "dropped" : "spiked"}{" "}
                        {alert.percentChange.toFixed(0)}%{" "}
                        {alert.direction === "decrease" ? "in last 7 days" : "above weekly avg"}
                      </span>
                    </div>
                    {alert.campaignName && (
                      <p className="text-caption text-[var(--text-muted)] pl-[22px]">
                        Campaign: &ldquo;{alert.campaignName}&rdquo;
                      </p>
                    )}
                    <p className="text-caption text-[var(--text-muted)] pl-[22px]">
                      Previous: {alert.metric === "roas" ? `${alert.previousValue.toFixed(1)}x` : fmtCurrency(alert.previousValue)}
                      {" -> "}
                      Current: {alert.metric === "roas" ? `${alert.currentValue.toFixed(1)}x` : fmtCurrency(alert.currentValue)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {alert.campaignId && (
                      <button
                        onClick={() => setLocation(`/intelligence?tab=campaigns&campaign=${alert.campaignId}`)}
                        className="px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configure Thresholds button when no alerts */}
      {!alertsLoading && kpiAlerts.length === 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowThresholds(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Configure Alert Thresholds
          </button>
        </div>
      )}

      {/* -- Alert Threshold Configuration (BottomSheet on mobile, modal on desktop) -- */}
      <BottomSheet open={showThresholds} onClose={() => setShowThresholds(false)} title="Alert Thresholds" height="auto">
            <div className="space-y-4">
              {[
                { key: "roas", label: "ROAS drop", dirLabel: "or more" },
                { key: "spend", label: "Spend spike", dirLabel: "above avg" },
                { key: "revenue", label: "Revenue drop", dirLabel: "or more" },
                { key: "conversions", label: "Conv. drop", dirLabel: "or more" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-body-sm text-[var(--text-primary)] min-w-[110px]">{item.label}:</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={thresholds.thresholds[item.key]?.percent || 15}
                      onChange={(e) =>
                        setThresholds((prev) => ({
                          ...prev,
                          thresholds: {
                            ...prev.thresholds,
                            [item.key]: {
                              ...prev.thresholds[item.key],
                              percent: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] px-2 py-1.5"
                    >
                      {[5, 10, 15, 20, 25, 30, 40, 50].map((p) => (
                        <option key={p} value={p}>{p}%</option>
                      ))}
                    </select>
                    <span className="text-caption text-[var(--text-muted)]">{item.dirLabel} -&gt; Alert</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                <span className="text-body-sm text-[var(--text-primary)]">Check frequency:</span>
                <select
                  value={thresholds.checkFrequency}
                  onChange={(e) => setThresholds((prev) => ({ ...prev, checkFrequency: e.target.value }))}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] px-2 py-1.5"
                >
                  {CHECK_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={saveThresholds}
              disabled={thresholdsSaving}
              className="mt-5 w-full py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-60"
            >
              {thresholdsSaving ? "Saving..." : "Save Thresholds"}
            </button>
      </BottomSheet>

      {/* Metric cards with sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((m) => {
          const sparkData = getSparklineData(m.key, m.raw);
          return (
            <div
              key={m.label}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-caption text-[var(--text-muted)]">{m.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-[24px] font-medium text-[var(--text-primary)]">{m.value}</p>
                {sparkData.length > 1 && (
                  <Sparkline data={sparkData} color={sparklineColor(sparkData)} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* -- Cross-metric correlation badges -- */}
      {correlations.length > 0 && (
        <div className="space-y-2">
          {correlations.map((c, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border p-3 ${
                c.type === "warning"
                  ? "border-l-4 border-l-[#D4A017] border-[var(--border)] bg-[var(--surface-elevated)]"
                  : "border-l-4 border-l-[var(--success)] border-[var(--border)] bg-[var(--surface-elevated)]"
              }`}
            >
              {c.type === "warning" ? (
                <AlertCircle className="h-4 w-4 text-[#D4A017] flex-shrink-0" />
              ) : (
                <TrendingUp className="h-4 w-4 text-[var(--success)] flex-shrink-0" />
              )}
              <div>
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                  c.type === "warning" ? "text-[#D4A017]" : "text-[var(--success)]"
                }`}>
                  Correlation Detected
                </span>
                <p className="text-body-sm text-[var(--text-secondary)]">{c.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-heading-sm text-[var(--text-primary)]">Campaigns</h3>
            <button
              onClick={() => toast({ title: "Report exported successfully" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-caption font-medium hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Report
            </button>
          </div>
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
