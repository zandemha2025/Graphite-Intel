import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  RefreshCw,
  MoreHorizontal,
  Plug,
  Unplug,
  Activity,
  Database,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { api, apiPost, apiDelete } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ConnectedAccount {
  id: string;
  name: string;
  app: string;
  icon?: string;
  recordCount: number;
  health: "healthy" | "degraded" | "error";
  lastSyncAt: string | null;
}

interface AccountsSummary {
  accounts: ConnectedAccount[];
  totalRecords: number;
}

/* ------------------------------------------------------------------ */
/*  Available apps catalog                                             */
/* ------------------------------------------------------------------ */

type AppCategory = "CRM" | "Communication" | "Analytics" | "Advertising" | "Payments" | "Dev Tools" | "Support" | "Commerce";

interface AvailableApp {
  key: string;
  name: string;
  category: AppCategory;
  description: string;
  color: string;
  initials: string;
  popular?: boolean;
}

const AVAILABLE_APPS: AvailableApp[] = [
  { key: "salesforce", name: "Salesforce", category: "CRM", description: "CRM and sales data", color: "#00A1E0", initials: "SF", popular: true },
  { key: "hubspot", name: "HubSpot", category: "CRM", description: "Marketing, sales, and service", color: "#FF7A59", initials: "HS", popular: true },
  { key: "gong", name: "Gong", category: "Communication", description: "Revenue intelligence calls", color: "#7C3AED", initials: "GG", popular: true },
  { key: "slack", name: "Slack", category: "Communication", description: "Team messaging and channels", color: "#4A154B", initials: "SL", popular: true },
  { key: "google_ads", name: "Google Ads", category: "Advertising", description: "Search and display campaigns", color: "#4285F4", initials: "GA", popular: true },
  { key: "meta", name: "Meta Ads", category: "Advertising", description: "Facebook and Instagram ads", color: "#1877F2", initials: "MA", popular: true },
  { key: "stripe", name: "Stripe", category: "Payments", description: "Payments and subscriptions", color: "#635BFF", initials: "ST", popular: true },
  { key: "jira", name: "Jira", category: "Dev Tools", description: "Project and issue tracking", color: "#0052CC", initials: "JR", popular: true },
  { key: "zendesk", name: "Zendesk", category: "Support", description: "Customer support tickets", color: "#03363D", initials: "ZD", popular: true },
  { key: "shopify", name: "Shopify", category: "Commerce", description: "E-commerce platform", color: "#96BF48", initials: "SH", popular: true },
  { key: "google_drive", name: "Google Drive", category: "Communication", description: "Documents and files", color: "#0F9D58", initials: "GD" },
  { key: "intercom", name: "Intercom", category: "Support", description: "Customer messaging", color: "#1F8DED", initials: "IC" },
  { key: "mixpanel", name: "Mixpanel", category: "Analytics", description: "Product analytics", color: "#7856FF", initials: "MP" },
  { key: "amplitude", name: "Amplitude", category: "Analytics", description: "Digital analytics", color: "#1D71FF", initials: "AM" },
  { key: "segment", name: "Segment", category: "Analytics", description: "Customer data platform", color: "#52BD95", initials: "SG" },
  { key: "linkedin_ads", name: "LinkedIn Ads", category: "Advertising", description: "Professional advertising", color: "#0077B5", initials: "LI" },
  { key: "notion", name: "Notion", category: "Communication", description: "Workspace and docs", color: "#000000", initials: "NO" },
  { key: "github", name: "GitHub", category: "Dev Tools", description: "Code repositories", color: "#24292E", initials: "GH" },
];

const ALL_CATEGORIES: AppCategory[] = ["CRM", "Communication", "Analytics", "Advertising", "Payments", "Dev Tools", "Support", "Commerce"];

/* ------------------------------------------------------------------ */
/*  Health badge helper                                                */
/* ------------------------------------------------------------------ */

function healthVariant(h: string): "success" | "warning" | "error" {
  if (h === "healthy") return "success";
  if (h === "degraded") return "warning";
  return "error";
}

function healthLabel(h: string): string {
  if (h === "healthy") return "Healthy";
  if (h === "degraded") return "Degraded";
  return "Error";
}

/* ------------------------------------------------------------------ */
/*  Connected account card                                             */
/* ------------------------------------------------------------------ */

function ConnectedCard({
  account,
  onSync,
  onDisconnect,
  syncing,
}: {
  account: ConnectedAccount;
  onSync: () => void;
  onDisconnect: () => void;
  syncing: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="relative flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-xs font-bold"
            style={{ backgroundColor: AVAILABLE_APPS.find((a) => a.key === account.app)?.color ?? "#404040" }}
          >
            {AVAILABLE_APPS.find((a) => a.key === account.app)?.initials ?? account.app.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-[#0A0A0A]">{account.name}</p>
            <p className="text-xs text-[#9CA3AF]">{AVAILABLE_APPS.find((a) => a.key === account.app)?.name ?? account.app}</p>
          </div>
        </div>

        <div className="relative">
          <button
            className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F6F5F4] hover:text-[#404040] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-[#E5E5E3] bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#404040] hover:bg-[#F6F5F4]"
                  onClick={() => {
                    setMenuOpen(false);
                    onDisconnect();
                  }}
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#9CA3AF]">
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          {Number(account.recordCount).toLocaleString()} records
        </span>
        {account.lastSyncAt && (
          <span>
            Synced {formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#F3F3F1]">
        <Badge variant={healthVariant(account.health)}>
          {healthLabel(account.health)}
        </Badge>
        <Button variant="ghost" size="sm" onClick={onSync} loading={syncing}>
          <RefreshCw className="h-3.5 w-3.5" />
          Sync
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Available app card                                                 */
/* ------------------------------------------------------------------ */

function AppCard({ app, onConnect }: { app: AvailableApp; onConnect: () => void }) {
  return (
    <Card hoverable clickable className="flex flex-col gap-3" onClick={onConnect}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold"
          style={{ backgroundColor: app.color }}
        >
          {app.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0A0A0A]">{app.name}</p>
          <p className="text-xs text-[#9CA3AF] truncate">{app.description}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF] flex-shrink-0" />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AppCategory | "All">("All");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: summary, isLoading } = useQuery<AccountsSummary>({
    queryKey: ["connectors", "summary"],
    queryFn: () => api<AccountsSummary>("/connectors/accounts/summary"),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/connectors/accounts/${id}/sync`, {}),
    onSuccess: () => {
      toast.success("Sync triggered");
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
      setSyncingId(null);
    },
    onError: () => {
      toast.error("Sync failed");
      setSyncingId(null);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/connectors/accounts/${id}`),
    onSuccess: () => {
      toast.success("Account disconnected");
      queryClient.invalidateQueries({ queryKey: ["connectors"] });
    },
    onError: () => toast.error("Failed to disconnect"),
  });

  const handleConnect = (app: AvailableApp) => {
    if (app.key === "google_drive") {
      window.location.href = "/api/integrations/oauth/google/start";
      return;
    }
    toast.info(`${app.name} integration coming soon`);
  };

  const connected = summary?.accounts ?? [];

  const filteredApps = AVAILABLE_APPS.filter((app) => {
    const connectedKeys = new Set(connected.map((a) => a.app));
    if (connectedKeys.has(app.key)) return false;
    if (categoryFilter !== "All" && app.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Page
      title="Connections"
      subtitle="Connect your tools and data sources"
      actions={
        <Badge variant="info" className="text-xs px-3 py-1">
          <Zap className="h-3 w-3 mr-1" />
          600+ integrations
        </Badge>
      }
    >
      {/* CONNECTED SECTION */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Plug className="h-4 w-4 text-[#0A0A0A]" />
          <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wide">
            Connected
          </h2>
          {connected.length > 0 && (
            <Badge variant="default" className="ml-1">{connected.length}</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : connected.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="h-8 w-8 text-[#9CA3AF] mb-3" />
            <p className="text-sm text-[#404040] font-medium">No connections yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Connect your first app below to start syncing data
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map((account) => (
              <ConnectedCard
                key={account.id}
                account={account}
                onSync={() => {
                  setSyncingId(account.id);
                  syncMutation.mutate(account.id);
                }}
                onDisconnect={() => disconnectMutation.mutate(account.id)}
                syncing={syncingId === account.id && syncMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* AVAILABLE SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-[#0A0A0A]" />
          <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wide">
            Available
          </h2>
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              className="pl-9"
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["All", ...ALL_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-[#F3F3F1] text-[#404040] hover:bg-[#E5E5E3]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* App grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredApps.map((app) => (
            <AppCard key={app.key} app={app} onConnect={() => handleConnect(app)} />
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-[#9CA3AF]">No matching apps found</p>
          </div>
        )}
      </section>
    </Page>
  );
}
