/**
 * Ads Dashboard — Overview of all ad campaigns, accounts, and performance metrics.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AdAccount {
  id: number;
  platform: string;
  accountName: string;
  status: string;
  lastSyncAt: string | null;
}

interface AdCampaign {
  id: number;
  name: string;
  objective: string;
  status: string;
  platforms: string[];
  budgetDaily: string | null;
  budgetTotal: string | null;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
}

interface MetricsOverview {
  totalSpend: number;
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;
  avgROAS: number;
  dailyMetrics: Array<{
    date: string;
    totalSpend: number;
    totalClicks: number;
    totalImpressions: number;
    totalConversions: number;
  }>;
}

const platformLabels: Record<string, string> = {
  google_ads: "Google Ads",
  meta: "Meta (Facebook/Instagram)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-300",
  pending_review: "bg-yellow-500/20 text-yellow-300",
  active: "bg-green-500/20 text-green-300",
  paused: "bg-orange-500/20 text-orange-300",
  completed: "bg-blue-500/20 text-blue-300",
  archived: "bg-gray-500/20 text-gray-400",
};

export function AdsDashboard() {
  const [, setLocation] = useLocation();
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const [accRes, campRes, metRes] = await Promise.all([
        fetch("/api/ads/accounts", { credentials: "include" }),
        fetch("/api/ads/campaigns", { credentials: "include" }),
        fetch(`/api/ads/metrics/overview?days=${days}`, { credentials: "include" }),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
      if (metRes.ok) setOverview(await metRes.json());
    } catch (err) {
      console.error("Failed to load ads data", err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  function formatNumber(n: number) {
    return new Intl.NumberFormat("en-US").format(Math.round(n));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border border-[#E8E4DC]/20 border-t-[#E8E4DC]/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8E4DC]">Paid Ads</h1>
          <p className="text-sm text-[#E8E4DC]/50 mt-1">
            Manage campaigns, track performance, and optimize with AI.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setLocation("/ads/campaigns/new")}
            className="px-4 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition"
          >
            New Campaign
          </button>
          <button
            onClick={() => setLocation("/ads/reports")}
            className="px-4 py-2 border border-[#E8E4DC]/20 text-[#E8E4DC]/70 text-sm hover:border-[#E8E4DC]/40 transition"
          >
            Reports
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      {overview && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#E8E4DC]/60 uppercase tracking-wider">
              Performance Overview
            </h2>
            <div className="flex gap-2">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 text-xs transition ${
                    days === d
                      ? "bg-[#C9A55A]/20 text-[#C9A55A] border border-[#C9A55A]/40"
                      : "text-[#E8E4DC]/40 border border-[#E8E4DC]/10 hover:border-[#E8E4DC]/30"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: "Spend", value: formatCurrency(overview.totalSpend) },
              { label: "Revenue", value: formatCurrency(overview.totalRevenue) },
              { label: "ROAS", value: `${overview.avgROAS.toFixed(2)}x` },
              { label: "Impressions", value: formatNumber(overview.totalImpressions) },
              { label: "Clicks", value: formatNumber(overview.totalClicks) },
              { label: "Conversions", value: formatNumber(overview.totalConversions) },
              { label: "CTR", value: `${(overview.avgCTR * 100).toFixed(2)}%` },
            ].map((stat) => (
              <div key={stat.label} className="p-4 border border-[#E8E4DC]/10 bg-[#0D0C0B]">
                <div className="text-xs text-[#E8E4DC]/40 mb-1">{stat.label}</div>
                <div className="text-lg font-semibold text-[#E8E4DC]">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#E8E4DC]/60 uppercase tracking-wider">
            Ad Accounts ({accounts.length})
          </h2>
          <button className="text-xs text-[#C9A55A] hover:text-[#C9A55A]/80 transition">
            + Connect Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
            <p className="text-[#E8E4DC]/40 text-sm">No ad accounts connected yet.</p>
            <p className="text-[#E8E4DC]/30 text-xs mt-1">
              Connect Google Ads, Meta, LinkedIn, or TikTok to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 border border-[#E8E4DC]/10 bg-[#0D0C0B] flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-[#E8E4DC]">{acc.accountName}</div>
                  <div className="text-xs text-[#E8E4DC]/40 mt-0.5">
                    {platformLabels[acc.platform] ?? acc.platform}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 ${
                    acc.status === "active" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {acc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#E8E4DC]/60 uppercase tracking-wider">
            Campaigns ({campaigns.length})
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
            <p className="text-[#E8E4DC]/40 text-sm">No campaigns yet.</p>
            <button
              onClick={() => setLocation("/ads/campaigns/new")}
              className="mt-3 text-sm text-[#C9A55A] hover:text-[#C9A55A]/80 transition"
            >
              Create your first campaign
            </button>
          </div>
        ) : (
          <div className="border border-[#E8E4DC]/10 divide-y divide-[#E8E4DC]/10">
            {campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => setLocation(`/ads/campaigns/${c.id}`)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#E8E4DC]/5 transition"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#E8E4DC]">{c.name}</div>
                  <div className="text-xs text-[#E8E4DC]/40 mt-0.5 flex gap-3">
                    <span>{c.objective}</span>
                    {c.budgetDaily && <span>${c.budgetDaily}/day</span>}
                    {(c.platforms as string[])?.length > 0 && (
                      <span>{(c.platforms as string[]).map((p) => platformLabels[p] ?? p).join(", ")}</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 ${statusColors[c.status] ?? statusColors.draft}`}>
                  {c.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
