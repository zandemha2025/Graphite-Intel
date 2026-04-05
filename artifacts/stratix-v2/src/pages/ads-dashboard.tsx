import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { api, apiPost } from "@/lib/api";

interface AdsMetrics {
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

interface AdAccount {
  id: number;
  platform: string;
  name: string;
  status: "connected" | "disconnected" | "syncing";
  lastSync?: string;
}

interface Campaign {
  id: number;
  name: string;
  platform: string;
  status: "active" | "paused" | "draft" | "completed";
  spend: number;
  conversions: number;
}

const DAY_RANGES = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  active: "success",
  paused: "warning",
  draft: "default",
  completed: "info",
  connected: "success",
  disconnected: "error",
  syncing: "info",
};

function fmt(n: number, style: "currency" | "number" | "percent" = "number") {
  if (style === "currency") return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (style === "percent") return `${(n * 100).toFixed(2)}%`;
  return n.toLocaleString();
}

export default function AdsDashboardPage() {
  const [, navigate] = useLocation();
  const [days, setDays] = useState("30");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState("");

  const { data: metrics, isLoading: metricsLoading } = useQuery<AdsMetrics>({
    queryKey: ["ads", "metrics", days],
    queryFn: () => api<AdsMetrics>(`/ads/metrics?days=${days}`),
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<AdAccount[]>({
    queryKey: ["ads", "accounts"],
    queryFn: () => api<AdAccount[]>("/ads/accounts"),
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["ads", "campaigns"],
    queryFn: () => api<Campaign[]>("/ads/campaigns"),
  });

  const handleSync = async (accountId: number) => {
    try {
      await apiPost(`/ads/accounts/${accountId}/sync`, {});
      toast.success("Sync started");
    } catch {
      toast.error("Failed to start sync");
    }
  };

  const handleConnect = async () => {
    if (!connectPlatform) return;
    try {
      await apiPost("/ads/accounts/connect", { platform: connectPlatform });
      toast.success("Account connected");
      setConnectOpen(false);
      setConnectPlatform("");
    } catch {
      toast.error("Failed to connect account");
    }
  };

  const metricCards = metrics
    ? [
        { label: "Spend", value: fmt(metrics.spend, "currency") },
        { label: "Revenue", value: fmt(metrics.revenue, "currency") },
        { label: "ROAS", value: `${metrics.roas.toFixed(2)}x` },
        { label: "Impressions", value: fmt(metrics.impressions) },
        { label: "Clicks", value: fmt(metrics.clicks) },
        { label: "Conversions", value: fmt(metrics.conversions) },
        { label: "CTR", value: fmt(metrics.ctr, "percent") },
      ]
    : [];

  return (
    <Page
      title="Ads"
      subtitle="Advertising campaign management"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/reports")}>
            Reports
          </Button>
          <Button onClick={() => navigate("/ads/campaigns/new")}>
            New Campaign
          </Button>
        </div>
      }
    >
      {/* Day range toggle */}
      <div className="flex items-center gap-1 mb-6 bg-[#F6F5F4] rounded-lg p-1 w-fit">
        {DAY_RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setDays(r.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              days === r.value
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#9CA3AF] hover:text-[#404040]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Metrics overview */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {metricCards.map((m) => (
            <Card key={m.label} className="p-4">
              <p className="text-xs text-[#9CA3AF] mb-1">{m.label}</p>
              <p className="text-lg font-semibold text-[#0A0A0A]">{m.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Ad Accounts */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0A0A0A]">Ad Accounts</h2>
          <Button size="sm" variant="secondary" onClick={() => setConnectOpen(true)}>
            Connect Account
          </Button>
        </div>
        {accountsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !accounts?.length ? (
          <Card className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">No ad accounts connected</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc) => (
              <Card key={acc.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{acc.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{acc.platform}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[acc.status]}>{acc.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleSync(acc.id)}>
                    Sync
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns */}
      <div>
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Campaigns</h2>
        {campaignsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !campaigns?.length ? (
          <Card className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">No campaigns yet</p>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Platform</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Spend</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#E5E5E3] last:border-0 hover:bg-[#F6F5F4] cursor-pointer transition-colors"
                    onClick={() => navigate(`/ads/campaigns/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{c.name}</td>
                    <td className="px-4 py-3 text-[#404040]">{c.platform}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-[#404040]">{fmt(c.spend, "currency")}</td>
                    <td className="px-4 py-3 text-right text-[#404040]">{c.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connect dialog */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent>
          <DialogTitle>Connect Ad Account</DialogTitle>
          <DialogDescription>Choose a platform to connect your advertising account.</DialogDescription>
          <div className="mt-4 space-y-4">
            <Select
              value={connectPlatform}
              onChange={(e) => setConnectPlatform(e.target.value)}
              placeholder="Select platform"
              options={[
                { value: "google", label: "Google Ads" },
                { value: "meta", label: "Meta Ads" },
                { value: "tiktok", label: "TikTok Ads" },
                { value: "linkedin", label: "LinkedIn Ads" },
              ]}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConnectOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={!connectPlatform}>
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
