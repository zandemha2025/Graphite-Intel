/**
 * Ads Dashboard — Overview of all ad campaigns, accounts, and performance metrics.
 */
import { useState, useEffect, useCallback } from "react";
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
  const [syncingAccountId, setSyncingAccountId] = useState<number | null>(null);

  // Connect Account dialog state
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState("google_ads");
  const [connectAccountName, setConnectAccountName] = useState("");
  const [connectExternalId, setConnectExternalId] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [days]);

  const syncMetrics = useCallback(async (accountId: number) => {
    setSyncingAccountId(accountId);
    try {
      await fetch(`/api/ads/accounts/${accountId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("Failed to sync metrics", err);
    } finally {
      setSyncingAccountId(null);
    }
  }, []);

  const connectAccount = useCallback(async () => {
    if (!connectAccountName || !connectExternalId) return;
    setConnectLoading(true);
    try {
      const res = await fetch("/api/ads/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform: connectPlatform,
          accountName: connectAccountName,
          externalAccountId: connectExternalId,
        }),
      });
      if (res.ok) {
        setShowConnectDialog(false);
        setConnectPlatform("google_ads");
        setConnectAccountName("");
        setConnectExternalId("");
        loadData();
      }
    } catch (err) {
      console.error("Failed to connect account", err);
    } finally {
      setConnectLoading(false);
    }
  }, [connectPlatform, connectAccountName, connectExternalId]);

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
          <button
            onClick={() => setShowConnectDialog(true)}
            className="text-xs text-[#C9A55A] hover:text-[#C9A55A]/80 transition"
          >
            + Connect Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-10 border border-dashed border-[#E8E4DC]/10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-[#E8E4DC]/15">
              <svg className="w-5 h-5 text-[#E8E4DC]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.343l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
              </svg>
            </div>
            <p className="text-[#E8E4DC]/60 text-sm font-medium mb-1">Connect an ad account to get started</p>
            <p className="text-[#E8E4DC]/30 text-xs max-w-sm mx-auto mb-5">
              Link Google Ads, Meta, LinkedIn, or TikTok to track performance and optimize campaigns with AI.
            </p>
            <button
              onClick={() => setShowConnectDialog(true)}
              className="px-4 py-2 text-xs text-[#C9A55A] border border-[#C9A55A]/40 hover:bg-[#C9A55A]/10 transition-colors uppercase tracking-widest"
            >
              + Connect Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 border border-[#E8E4DC]/10 bg-[#0D0C0B] flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#E8E4DC]">{acc.accountName}</div>
                  <div className="text-xs text-[#E8E4DC]/40 mt-0.5">
                    {platformLabels[acc.platform] ?? acc.platform}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => syncMetrics(acc.id)}
                    disabled={syncingAccountId === acc.id}
                    className="text-[10px] px-2 py-1 border border-[#E8E4DC]/20 text-[#E8E4DC]/60 hover:border-[#E8E4DC]/40 hover:text-[#E8E4DC]/80 transition disabled:opacity-40"
                  >
                    {syncingAccountId === acc.id ? "Syncing..." : "Sync Metrics"}
                  </button>
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      acc.status === "active" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>
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

      {/* Connect Account Dialog */}
      {showConnectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0D0C0B] border border-[#E8E4DC]/20 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-[#E8E4DC] mb-4">Connect Ad Account</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#E8E4DC]/50 block mb-1">Platform</label>
                <select
                  value={connectPlatform}
                  onChange={(e) => setConnectPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm focus:outline-none focus:border-[#C9A55A]/60"
                >
                  <option value="google_ads">Google Ads</option>
                  <option value="meta">Meta (Facebook/Instagram)</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#E8E4DC]/50 block mb-1">Account Name</label>
                <input
                  type="text"
                  value={connectAccountName}
                  onChange={(e) => setConnectAccountName(e.target.value)}
                  placeholder="My Google Ads Account"
                  className="w-full px-3 py-2 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm placeholder-[#E8E4DC]/20 focus:outline-none focus:border-[#C9A55A]/60"
                />
              </div>

              <div>
                <label className="text-xs text-[#E8E4DC]/50 block mb-1">External Account ID</label>
                <input
                  type="text"
                  value={connectExternalId}
                  onChange={(e) => setConnectExternalId(e.target.value)}
                  placeholder="e.g. 123-456-7890"
                  className="w-full px-3 py-2 bg-[#0D0C0B] border border-[#E8E4DC]/20 text-[#E8E4DC] text-sm placeholder-[#E8E4DC]/20 focus:outline-none focus:border-[#C9A55A]/60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConnectDialog(false)}
                className="px-4 py-2 text-sm text-[#E8E4DC]/60 border border-[#E8E4DC]/20 hover:border-[#E8E4DC]/40 transition"
              >
                Cancel
              </button>
              <button
                onClick={connectAccount}
                disabled={connectLoading || !connectAccountName || !connectExternalId}
                className="px-4 py-2 text-sm bg-[#C9A55A] text-[#0D0C0B] font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-40"
              >
                {connectLoading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
