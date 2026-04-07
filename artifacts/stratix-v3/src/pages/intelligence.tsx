import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, apiPost, apiDelete } from "@/lib/api";
import {
  Radar,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Compass,
  AlertTriangle,
  Eye,
  TrendingUp,
  Newspaper,
  Globe,
  Users,
  UserPlus,
  MessageCircle,
} from "lucide-react";

/* ---------- Types ---------- */

interface CompetitorSignal {
  competitor: string;
  category: "news" | "website" | "customer" | "people" | "social";
  title: string;
  summary: string;
  source: string;
  url?: string;
  severity: "info" | "watch" | "alert";
  detectedAt: string;
}

interface CompetitorBrief {
  competitor: string;
  signals: CompetitorSignal[];
  synthesis: string;
  recommendedAction: string;
}

interface BriefResponse {
  briefs: CompetitorBrief[];
  message?: string;
}

/* ---------- Constants ---------- */

type CategoryId = "all" | "news" | "website" | "customer" | "people" | "social";

const CATEGORY_TABS: { id: CategoryId; label: string; icon: typeof Newspaper }[] = [
  { id: "all", label: "All", icon: Eye },
  { id: "news", label: "News", icon: Newspaper },
  { id: "website", label: "Website", icon: Globe },
  { id: "customer", label: "Customer", icon: Users },
  { id: "people", label: "People", icon: UserPlus },
  { id: "social", label: "Social", icon: MessageCircle },
];

const CATEGORY_COLORS: Record<string, string> = {
  news: "bg-blue-50 text-blue-700",
  website: "bg-green-50 text-green-700",
  customer: "bg-purple-50 text-purple-700",
  people: "bg-orange-50 text-orange-700",
  social: "bg-cyan-50 text-cyan-700",
};

const SEVERITY_DOT: Record<string, string> = {
  alert: "bg-red-500",
  watch: "bg-amber-500",
  info: "bg-gray-400",
};

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`} />
  );
}

/* ---------- Component ---------- */

export default function IntelligencePage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState("");

  /* --- Data fetching --- */

  const {
    data: briefData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<BriefResponse>({
    queryKey: ["intelligence-brief"],
    queryFn: () => api<BriefResponse>("/intelligence/brief"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const briefs = briefData?.briefs ?? [];

  /* --- Mutations --- */

  const trackMutation = useMutation({
    mutationFn: (name: string) =>
      apiPost<{ message: string; competitors: string[] }>(
        "/intelligence/track",
        { name },
      ),
    onSuccess: () => {
      toast.success("Competitor added. Refreshing intelligence...");
      setShowTrackDialog(false);
      setNewCompetitor("");
      queryClient.invalidateQueries({ queryKey: ["intelligence-brief"] });
    },
    onError: () => toast.error("Failed to track competitor"),
  });

  const untrackMutation = useMutation({
    mutationFn: (name: string) =>
      apiDelete<{ message: string }>(`/intelligence/track/${encodeURIComponent(name)}`),
    onSuccess: () => {
      toast.success("Competitor removed");
      queryClient.invalidateQueries({ queryKey: ["intelligence-brief"] });
    },
    onError: () => toast.error("Failed to remove competitor"),
  });

  /* --- Computed --- */

  const allSignals: CompetitorSignal[] = briefs.flatMap((b) => b.signals);

  const filteredSignals =
    activeCategory === "all"
      ? allSignals
      : allSignals.filter((s) => s.category === activeCategory);

  // Sort: alert first, then watch, then info
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    const order = { alert: 0, watch: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const categoryCounts: Record<CategoryId, number> = {
    all: allSignals.length,
    news: allSignals.filter((s) => s.category === "news").length,
    website: allSignals.filter((s) => s.category === "website").length,
    customer: allSignals.filter((s) => s.category === "customer").length,
    people: allSignals.filter((s) => s.category === "people").length,
    social: allSignals.filter((s) => s.category === "social").length,
  };

  const handleInvestigate = useCallback(
    (signal: CompetitorSignal) => {
      const query = encodeURIComponent(
        `${signal.competitor} ${signal.title}`,
      );
      navigate(`/explore?q=${query}`);
    },
    [navigate],
  );

  const handleTrack = useCallback(() => {
    const name = newCompetitor.trim();
    if (!name) return;
    trackMutation.mutate(name);
  }, [newCompetitor, trackMutation]);

  /* --- Has synthesis with alerts? --- */
  const topBrief = briefs.find((b) =>
    b.signals.some((s) => s.severity === "alert"),
  ) ?? briefs[0];

  const hasAlerts = briefs.some((b) => b.signals.some((s) => s.severity === "alert"));

  /* --- Render --- */

  return (
    <Page
      title="Intelligence"
      subtitle="Real-time competitive monitoring across 5 signal categories"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTrackDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Track Competitor
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      }
    >
      {/* Track competitor dialog */}
      {showTrackDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Track Competitor
              </h2>
              <button
                onClick={() => setShowTrackDialog(false)}
                className="rounded-md p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-4">
              Enter a competitor name to begin monitoring their news, website
              changes, hiring activity, reviews, and social presence.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Klue, Crayon, AlphaSense..."
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="flex-1"
              />
              <Button
                onClick={handleTrack}
                loading={trackMutation.isPending}
                disabled={!newCompetitor.trim()}
              >
                Track
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-20" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && briefs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Radar className="h-12 w-12 text-[#D1D5DB] mb-4" />
          <h2 className="text-[15px] font-semibold text-[#111827] mb-1">
            No competitors tracked
          </h2>
          <p className="text-[13px] text-[#6B7280] max-w-md mb-4">
            {briefData?.message ??
              "Add competitors from your Context page or use the Track button to start monitoring."}
          </p>
          <Button onClick={() => setShowTrackDialog(true)}>
            <Plus className="h-3.5 w-3.5" />
            Track Your First Competitor
          </Button>
        </div>
      )}

      {/* Main content */}
      {!isLoading && briefs.length > 0 && (
        <div className="space-y-6">
          {/* Synthesis card */}
          {topBrief && (
            <Card
              className={`p-5 border-l-4 ${
                hasAlerts
                  ? "bg-[#FEF3C7] border-l-[#F59E0B]"
                  : "bg-[#EEF2FF] border-l-[#4F46E5]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    hasAlerts
                      ? "bg-[#FDE68A] text-[#92400E]"
                      : "bg-[#C7D2FE] text-[#3730A3]"
                  }`}
                >
                  {hasAlerts ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-[#111827]">
                      Signal Synthesis
                    </span>
                    <Badge variant={hasAlerts ? "warning" : "info"}>
                      {topBrief.competitor}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-[#374151] leading-relaxed">
                    {topBrief.synthesis}
                  </p>
                  <p className="text-[13px] text-[#6B7280] mt-2">
                    <span className="font-medium text-[#111827]">
                      Recommended:
                    </span>{" "}
                    {topBrief.recommendedAction}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Additional briefs (collapsed) */}
          {briefs.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {briefs
                .filter((b) => b !== topBrief)
                .map((brief) => (
                  <Card key={brief.competitor} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-semibold text-[#111827]">
                        {brief.competitor}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="default">
                          {brief.signals.length} signals
                        </Badge>
                        <button
                          onClick={() => untrackMutation.mutate(brief.competitor)}
                          className="rounded p-1 text-[#9CA3AF] hover:text-red-500 hover:bg-red-50"
                          title="Stop tracking"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#6B7280] leading-relaxed line-clamp-2">
                      {brief.synthesis}
                    </p>
                  </Card>
                ))}
            </div>
          )}

          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TABS.map((tab) => {
              const active = activeCategory === tab.id;
              const count = categoryCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#4F46E5] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span
                    className={`ml-0.5 text-[11px] ${
                      active ? "text-white/80" : "text-[#9CA3AF]"
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Signal list */}
          <div className="space-y-1">
            {sortedSignals.length === 0 && (
              <p className="py-8 text-center text-[13px] text-[#6B7280]">
                No signals in this category.
              </p>
            )}
            {sortedSignals.map((signal, idx) => (
              <div
                key={`${signal.competitor}-${signal.category}-${idx}`}
                className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 hover:border-[#E5E7EB] hover:bg-[#FAFAFA] transition-colors"
              >
                {/* Severity dot */}
                <div className="mt-1.5 flex shrink-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      SEVERITY_DOT[signal.severity]
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#111827] leading-snug">
                        {signal.title}
                      </p>
                      <p className="text-[12px] text-[#6B7280] mt-0.5 line-clamp-2">
                        {signal.summary}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          CATEGORY_COLORS[signal.category] ?? ""
                        }`}
                      >
                        {signal.category}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[11px] text-[#9CA3AF]">
                      {signal.competitor}
                    </span>
                    <span className="text-[11px] text-[#D1D5DB]">|</span>
                    <span className="text-[11px] text-[#9CA3AF]">
                      {signal.source}
                    </span>
                    {signal.url && (
                      <>
                        <span className="text-[11px] text-[#D1D5DB]">|</span>
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[11px] text-[#4F46E5] hover:underline"
                        >
                          Source
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </>
                    )}
                    <span className="text-[11px] text-[#D1D5DB]">|</span>
                    <button
                      onClick={() => handleInvestigate(signal)}
                      className="inline-flex items-center gap-0.5 text-[11px] text-[#4F46E5] hover:underline"
                    >
                      <Compass className="h-2.5 w-2.5" />
                      Investigate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
