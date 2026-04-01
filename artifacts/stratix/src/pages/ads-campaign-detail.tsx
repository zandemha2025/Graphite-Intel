/**
 * Campaign Detail — View and manage a single ad campaign with metrics,
 * creatives, and AI optimization.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";

interface Campaign {
  id: number;
  name: string;
  objective: string;
  status: string;
  platforms: string[];
  budgetDaily: string | null;
  budgetTotal: string | null;
  startDate: string | null;
  endDate: string | null;
  targeting: Record<string, unknown> | null;
  aiSuggestions: {
    headlines?: string[];
    descriptions?: string[];
    targetingTips?: string[];
    budgetRecommendation?: { daily: number; reason: string };
  } | null;
}

interface Creative {
  id: number;
  name: string;
  type: string;
  headline: string | null;
  description: string | null;
  status: string;
  isAiGenerated: boolean;
}

interface Metric {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: string;
  revenue: string;
  ctr: string;
  roas: string;
}

interface OptimizationLog {
  id: number;
  type: string;
  mode: string;
  recommendation: string;
  status: string;
  createdAt: string;
  details: Record<string, unknown>;
}

export function AdsCampaignDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [optimizations, setOptimizations] = useState<OptimizationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "creatives" | "metrics" | "optimize">("overview");

  useEffect(() => {
    loadCampaign();
  }, [params.id]);

  async function loadCampaign() {
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/campaigns/${params.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
        setCreatives(data.creatives ?? []);
        setMetrics(data.metrics ?? []);
        setOptimizations(data.optimizations ?? []);
      }
    } catch (err) {
      console.error("Failed to load campaign", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateSuggestions() {
    setAiLoading(true);
    try {
      const res = await fetch(`/api/ads/campaigns/${params.id}/ai-suggestions`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const suggestions = await res.json();
        setCampaign((c) => c ? { ...c, aiSuggestions: suggestions } : c);
      }
    } catch (err) {
      console.error("Failed to generate suggestions", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function triggerOptimize(mode: "recommend" | "auto") {
    setOptimizeLoading(true);
    try {
      await fetch(`/api/ads/campaigns/${params.id}/optimize`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      // Reload after a short delay to see new optimizations
      setTimeout(loadCampaign, 3000);
    } catch (err) {
      console.error("Failed to trigger optimization", err);
    } finally {
      setOptimizeLoading(false);
    }
  }

  async function publishCampaign() {
    if (!campaign) return;
    try {
      await fetch(`/api/ads/campaigns/${params.id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: campaign.platforms }),
      });
      loadCampaign();
    } catch (err) {
      console.error("Failed to publish", err);
    }
  }

  function formatCurrency(n: string | number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
  }

  if (loading || !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border border-[#E8E4DC]/20 border-t-[#E8E4DC]/60 animate-spin" />
      </div>
    );
  }

  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0);
  const totalRevenue = metrics.reduce((s, m) => s + Number(m.revenue), 0);
  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setLocation("/ads")}
            className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/60 mb-2 block"
          >
            &larr; Back to Ads
          </button>
          <h1 className="text-2xl font-semibold text-[#E8E4DC]">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-[#E8E4DC]/50">
            <span>{campaign.objective}</span>
            <span className={`text-xs px-2 py-0.5 ${
              campaign.status === "active" ? "bg-green-500/20 text-green-300" :
              campaign.status === "draft" ? "bg-gray-500/20 text-gray-300" :
              "bg-yellow-500/20 text-yellow-300"
            }`}>
              {campaign.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {campaign.status === "draft" && (
            <button
              onClick={publishCampaign}
              className="px-4 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E8E4DC]/10">
        {(["overview", "creatives", "metrics", "optimize"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition ${
              activeTab === tab
                ? "text-[#C9A55A] border-b-2 border-[#C9A55A]"
                : "text-[#E8E4DC]/40 hover:text-[#E8E4DC]/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Spend", value: formatCurrency(totalSpend) },
              { label: "Revenue", value: formatCurrency(totalRevenue) },
              { label: "Clicks", value: totalClicks.toLocaleString() },
              { label: "Conversions", value: totalConversions.toLocaleString() },
              { label: "CTR", value: `${((totalClicks / (totalImpressions || 1)) * 100).toFixed(2)}%` },
            ].map((s) => (
              <div key={s.label} className="p-4 border border-[#E8E4DC]/10">
                <div className="text-xs text-[#E8E4DC]/40">{s.label}</div>
                <div className="text-lg font-semibold text-[#E8E4DC] mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Campaign Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#E8E4DC]/10">
              <h3 className="text-xs font-medium text-[#E8E4DC]/40 uppercase mb-3">Budget</h3>
              <div className="space-y-2 text-sm text-[#E8E4DC]/70">
                {campaign.budgetDaily && <div>Daily: {formatCurrency(campaign.budgetDaily)}</div>}
                {campaign.budgetTotal && <div>Total: {formatCurrency(campaign.budgetTotal)}</div>}
                {campaign.startDate && <div>Start: {new Date(campaign.startDate).toLocaleDateString()}</div>}
                {campaign.endDate && <div>End: {new Date(campaign.endDate).toLocaleDateString()}</div>}
              </div>
            </div>

            <div className="p-4 border border-[#E8E4DC]/10">
              <h3 className="text-xs font-medium text-[#E8E4DC]/40 uppercase mb-3">Targeting</h3>
              {campaign.targeting ? (
                <div className="space-y-1 text-sm text-[#E8E4DC]/70">
                  {(campaign.targeting as any).locations && (
                    <div>Locations: {((campaign.targeting as any).locations as string[]).join(", ")}</div>
                  )}
                  {(campaign.targeting as any).keywords && (
                    <div>Keywords: {((campaign.targeting as any).keywords as string[]).join(", ")}</div>
                  )}
                  {(campaign.targeting as any).interests && (
                    <div>Interests: {((campaign.targeting as any).interests as string[]).join(", ")}</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#E8E4DC]/30">No targeting configured</p>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="p-4 border border-[#E8E4DC]/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-[#E8E4DC]/40 uppercase">AI Suggestions</h3>
              <button
                onClick={generateSuggestions}
                disabled={aiLoading}
                className="text-xs text-[#C9A55A] hover:text-[#C9A55A]/80 transition disabled:opacity-50"
              >
                {aiLoading ? "Generating..." : "Generate Suggestions"}
              </button>
            </div>
            {campaign.aiSuggestions ? (
              <div className="space-y-4">
                {campaign.aiSuggestions.headlines && (
                  <div>
                    <div className="text-xs text-[#E8E4DC]/50 mb-1">Headlines</div>
                    <div className="space-y-1">
                      {campaign.aiSuggestions.headlines.map((h, i) => (
                        <div key={i} className="text-sm text-[#E8E4DC]/70 pl-3 border-l border-[#C9A55A]/30">
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.aiSuggestions.budgetRecommendation && (
                  <div>
                    <div className="text-xs text-[#E8E4DC]/50 mb-1">Budget Recommendation</div>
                    <div className="text-sm text-[#E8E4DC]/70">
                      {formatCurrency(campaign.aiSuggestions.budgetRecommendation.daily)}/day — {campaign.aiSuggestions.budgetRecommendation.reason}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#E8E4DC]/30">Click "Generate Suggestions" to get AI-powered campaign recommendations.</p>
            )}
          </div>
        </div>
      )}

      {/* Creatives Tab */}
      {activeTab === "creatives" && (
        <div className="space-y-4">
          {creatives.length === 0 ? (
            <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
              <p className="text-[#E8E4DC]/40 text-sm">No creatives yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatives.map((c) => (
                <div key={c.id} className="p-4 border border-[#E8E4DC]/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#E8E4DC]">{c.name}</span>
                    <span className="text-xs text-[#E8E4DC]/40">{c.type}</span>
                  </div>
                  {c.headline && <div className="text-sm text-[#E8E4DC]/70 mb-1">{c.headline}</div>}
                  {c.description && <div className="text-xs text-[#E8E4DC]/50">{c.description}</div>}
                  {c.isAiGenerated && (
                    <span className="inline-block mt-2 text-xs bg-[#C9A55A]/10 text-[#C9A55A] px-2 py-0.5">
                      AI Generated
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="space-y-4">
          {metrics.length === 0 ? (
            <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
              <p className="text-[#E8E4DC]/40 text-sm">No metrics data yet. Sync your ad account to pull in performance data.</p>
            </div>
          ) : (
            <div className="border border-[#E8E4DC]/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E4DC]/10 text-[#E8E4DC]/40 text-xs">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Impressions</th>
                    <th className="text-right p-3">Clicks</th>
                    <th className="text-right p-3">CTR</th>
                    <th className="text-right p-3">Conversions</th>
                    <th className="text-right p-3">Spend</th>
                    <th className="text-right p-3">Revenue</th>
                    <th className="text-right p-3">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 30).map((m, i) => (
                    <tr key={i} className="border-b border-[#E8E4DC]/5 text-[#E8E4DC]/70">
                      <td className="p-3">{new Date(m.date).toLocaleDateString()}</td>
                      <td className="text-right p-3">{m.impressions.toLocaleString()}</td>
                      <td className="text-right p-3">{m.clicks.toLocaleString()}</td>
                      <td className="text-right p-3">{(Number(m.ctr) * 100).toFixed(2)}%</td>
                      <td className="text-right p-3">{m.conversions}</td>
                      <td className="text-right p-3">{formatCurrency(m.spend)}</td>
                      <td className="text-right p-3">{formatCurrency(m.revenue)}</td>
                      <td className="text-right p-3">{Number(m.roas).toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Optimize Tab */}
      {activeTab === "optimize" && (
        <div className="space-y-6">
          <div className="flex gap-3">
            <button
              onClick={() => triggerOptimize("recommend")}
              disabled={optimizeLoading}
              className="px-4 py-2 border border-[#C9A55A]/40 text-[#C9A55A] text-sm hover:bg-[#C9A55A]/10 transition disabled:opacity-50"
            >
              {optimizeLoading ? "Analyzing..." : "Get Recommendations"}
            </button>
            <button
              onClick={() => triggerOptimize("auto")}
              disabled={optimizeLoading}
              className="px-4 py-2 bg-[#C9A55A] text-[#0D0C0B] text-sm font-medium hover:bg-[#C9A55A]/90 transition disabled:opacity-50"
            >
              Auto-Optimize
            </button>
          </div>

          {optimizations.length === 0 ? (
            <div className="p-8 border border-dashed border-[#E8E4DC]/10 text-center">
              <p className="text-[#E8E4DC]/40 text-sm">No optimizations yet. Click above to analyze your campaign.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {optimizations.map((opt) => (
                <div key={opt.id} className="p-4 border border-[#E8E4DC]/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#E8E4DC]/10 text-[#E8E4DC]/50 px-2 py-0.5">
                        {opt.type}
                      </span>
                      <span className={`text-xs px-2 py-0.5 ${
                        opt.status === "applied" ? "bg-green-500/20 text-green-300" :
                        opt.status === "pending" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {opt.status}
                      </span>
                    </div>
                    <span className="text-xs text-[#E8E4DC]/30">
                      {new Date(opt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-[#E8E4DC]/70">{opt.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
