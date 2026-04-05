import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageSkeleton } from "@/components/ui/skeleton";
import { api, apiPost } from "@/lib/api";

interface CampaignDetail {
  id: number;
  name: string;
  objective: string;
  platform: string;
  status: "active" | "paused" | "draft" | "completed";
  budget: number;
  budgetType: string;
  startDate: string;
  endDate?: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  creatives: Creative[];
  dailyMetrics: DailyMetric[];
  suggestions: string[];
}

interface Creative {
  id: number;
  name: string;
  type: string;
  status: "active" | "paused" | "rejected";
  impressions: number;
  clicks: number;
}

interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  active: "success",
  paused: "warning",
  draft: "default",
  completed: "info",
  rejected: "error",
};

function fmt(n: number, style: "currency" | "number" | "percent" = "number") {
  if (style === "currency") return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (style === "percent") return `${(n * 100).toFixed(2)}%`;
  return n.toLocaleString();
}

export default function AdsCampaignDetailPage() {
  const [, params] = useRoute("/ads/campaigns/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  const [publishing, setPublishing] = useState(false);

  const { data: campaign, isLoading } = useQuery<CampaignDetail>({
    queryKey: ["ads", "campaign", id],
    queryFn: () => api<CampaignDetail>(`/ads/campaigns/${id}`),
    enabled: !!id,
  });

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await apiPost(`/ads/campaigns/${id}/publish`, {});
      toast.success("Campaign published");
    } catch {
      toast.error("Failed to publish campaign");
    } finally {
      setPublishing(false);
    }
  };

  const handleAISuggestions = async () => {
    try {
      await apiPost(`/ads/campaigns/${id}/optimize`, {});
      toast.success("AI suggestions requested");
    } catch {
      toast.error("Failed to request suggestions");
    }
  };

  if (isLoading || !campaign) {
    return (
      <Page title="Campaign" subtitle="Loading...">
        <PageSkeleton />
      </Page>
    );
  }

  const summaryCards = [
    { label: "Spend", value: fmt(campaign.spend, "currency") },
    { label: "Impressions", value: fmt(campaign.impressions) },
    { label: "Clicks", value: fmt(campaign.clicks) },
    { label: "Conversions", value: fmt(campaign.conversions) },
    { label: "CTR", value: fmt(campaign.ctr, "percent") },
    { label: "ROAS", value: `${campaign.roas.toFixed(2)}x` },
  ];

  return (
    <Page
      title={campaign.name}
      subtitle={`${campaign.platform} \u00B7 ${campaign.objective}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleAISuggestions}>
            AI Suggestions
          </Button>
          {campaign.status === "draft" && (
            <Button onClick={handlePublish} loading={publishing}>
              Publish
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/ads")}>
            Back
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 mb-6">
        <Badge variant={STATUS_VARIANT[campaign.status]}>{campaign.status}</Badge>
        <span className="text-xs text-[#9CA3AF]">
          {fmt(campaign.budget, "currency")} {campaign.budgetType} budget
        </span>
        <span className="text-xs text-[#9CA3AF]">
          {campaign.startDate}{campaign.endDate ? ` \u2013 ${campaign.endDate}` : ""}
        </span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="optimize">Optimize</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {summaryCards.map((m) => (
              <Card key={m.label} className="p-4">
                <p className="text-xs text-[#9CA3AF] mb-1">{m.label}</p>
                <p className="text-lg font-semibold text-[#0A0A0A]">{m.value}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="creatives">
          {!campaign.creatives?.length ? (
            <Card className="flex items-center justify-center h-32">
              <p className="text-sm text-[#9CA3AF]">No creatives uploaded yet</p>
            </Card>
          ) : (
            <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Impressions</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.creatives.map((c) => (
                    <tr key={c.id} className="border-b border-[#E5E5E3] last:border-0">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{c.name}</td>
                      <td className="px-4 py-3 text-[#404040]">{c.type}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(c.impressions)}</td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(c.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics">
          {!campaign.dailyMetrics?.length ? (
            <Card className="flex items-center justify-center h-32">
              <p className="text-sm text-[#9CA3AF]">No metrics data available yet</p>
            </Card>
          ) : (
            <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                    <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Spend</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Impressions</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Clicks</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.dailyMetrics.map((d) => (
                    <tr key={d.date} className="border-b border-[#E5E5E3] last:border-0">
                      <td className="px-4 py-3 text-[#0A0A0A]">{d.date}</td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(d.spend, "currency")}</td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(d.impressions)}</td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(d.clicks)}</td>
                      <td className="px-4 py-3 text-right text-[#404040]">{fmt(d.conversions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="optimize">
          <Card>
            <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">AI Optimization Suggestions</h3>
            {!campaign.suggestions?.length ? (
              <div className="flex flex-col items-center justify-center h-24">
                <p className="text-sm text-[#9CA3AF] mb-2">No suggestions available</p>
                <Button size="sm" variant="secondary" onClick={handleAISuggestions}>
                  Generate Suggestions
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {campaign.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#404040]">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#0A0A0A] shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
