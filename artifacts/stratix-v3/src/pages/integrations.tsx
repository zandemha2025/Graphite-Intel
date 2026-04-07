import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPost, apiDelete } from "@/lib/api";
import {
  Cable,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  Link2,
  Search,
  Zap,
  Globe,
  BarChart3,
  MessageSquare,
  CreditCard,
  Code2,
  ShoppingCart,
  HardDrive,
  Headphones,
  Megaphone,
} from "lucide-react";

/* ---------- Types ---------- */

interface DataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "configured" | "not_configured";
}

interface ConnectedAccount {
  id: string;
  appName: string;
  accountLabel: string;
  lastSyncAt?: string;
  syncStatus: "synced" | "syncing" | "error" | "never";
}

interface AccountsSummary {
  accounts: ConnectedAccount[];
}

interface AppCatalogItem {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  icon: React.ReactNode;
  connected: boolean;
}

type AppCategory =
  | "all"
  | "crm"
  | "communication"
  | "analytics"
  | "advertising"
  | "dev_tools"
  | "storage"
  | "support";

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Data Sources (Backend Services) ---------- */

const DATA_SOURCES: DataSource[] = [
  {
    id: "perplexity",
    name: "Perplexity",
    description:
      "Deep research engine with web-sourced, cited answers for comprehensive intelligence.",
    icon: <Search className="h-5 w-5" />,
    status: "configured",
  },
  {
    id: "serpapi",
    name: "SerpAPI",
    description:
      "Real-time search data, news, trends, and competitive monitoring signals.",
    icon: <Globe className="h-5 w-5" />,
    status: "configured",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description:
      "Web scraping and structured extraction for competitor analysis and URL research.",
    icon: <Zap className="h-5 w-5" />,
    status: "configured",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description:
      "AI model routing for synthesis, reasoning, and report generation across providers.",
    icon: <Cable className="h-5 w-5" />,
    status: "configured",
  },
];

function DataSourcesSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#111827]">
          Intelligence Data Sources
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Backend services that power the Data Fusion Engine. Configured by your
          admin.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {DATA_SOURCES.map((source) => (
          <Card key={source.id} className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280]">
              {source.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[#111827]">
                  {source.name}
                </p>
                {source.status === "configured" ? (
                  <Badge variant="default">
                    Backend Service
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not configured
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-[#6B7280]">
                {source.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- App Catalog ---------- */

const APP_CATALOG: Omit<AppCatalogItem, "connected">[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM data, pipeline, and account intelligence",
    category: "crm",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Marketing, sales, and service hub data",
    category: "crm",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "gong",
    name: "Gong",
    description: "Conversation intelligence and deal insights",
    category: "crm",
    icon: <Headphones className="h-5 w-5" />,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team messaging and notifications",
    category: "communication",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    id: "google-ads",
    name: "Google Ads",
    description: "Search and display campaign performance",
    category: "advertising",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    description: "Facebook and Instagram ad performance",
    category: "advertising",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment data, subscriptions, and revenue metrics",
    category: "analytics",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project tracking and engineering velocity",
    category: "dev_tools",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Support tickets and customer satisfaction data",
    category: "support",
    icon: <Headphones className="h-5 w-5" />,
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce orders, products, and customer data",
    category: "analytics",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Sync documents, sheets, and slides to your knowledge base",
    category: "storage",
    icon: <HardDrive className="h-5 w-5" />,
  },
  {
    id: "intercom",
    name: "Intercom",
    description: "Customer messaging and engagement data",
    category: "support",
    icon: <MessageSquare className="h-5 w-5" />,
  },
];

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "crm", label: "CRM" },
  { id: "communication", label: "Communication" },
  { id: "analytics", label: "Analytics" },
  { id: "advertising", label: "Advertising" },
  { id: "dev_tools", label: "Dev Tools" },
  { id: "storage", label: "Storage" },
  { id: "support", label: "Support" },
];

function ConnectedAppsSection() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: summary, isLoading } = useQuery<AccountsSummary>({
    queryKey: ["connectors", "summary"],
    queryFn: () => api<AccountsSummary>("/connectors/accounts/summary"),
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiDelete(`/connectors/accounts/${accountId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connectors", "summary"] });
      toast.success("Account disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect account");
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiPost(`/connectors/accounts/${accountId}/sync`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connectors", "summary"] });
      toast.success("Sync triggered");
    },
    onError: () => {
      toast.error("Sync failed");
    },
  });

  const accounts = summary?.accounts ?? [];
  const connectedAppIds = new Set(
    accounts.map((a) => a.appName.toLowerCase().replace(/\s+/g, "-")),
  );

  const filteredCatalog = APP_CATALOG.filter(
    (app) => categoryFilter === "all" || app.category === categoryFilter,
  );

  async function handleConnect(appId: string) {
    if (appId === "google-drive") {
      window.location.href = "/api/integrations/oauth/google/start";
      return;
    }
    // All other apps use Pipedream Connect
    try {
      const token = await apiPost<{ token: string; connect_url?: string }>("/connectors/token", { appId });
      if (token.connect_url) {
        window.location.href = token.connect_url;
      } else {
        toast.info(`${appId} connection initiated via Pipedream. Check your email or return here to verify.`);
        queryClient.invalidateQueries({ queryKey: ["connectors", "summary"] });
      }
    } catch {
      toast.error("Connection failed. Please check Pipedream credentials in settings.");
    }
  }

  function getSyncBadge(status: ConnectedAccount["syncStatus"]) {
    switch (status) {
      case "synced":
        return (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Synced
          </Badge>
        );
      case "syncing":
        return (
          <Badge variant="info">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Syncing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="default">Never synced</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">
              Connected Accounts
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Active integrations syncing data into Stratix.
            </p>
          </div>
          <div className="space-y-2">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280]">
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      {account.appName}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {account.accountLabel}
                    </p>
                  </div>
                  {getSyncBadge(account.syncStatus)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => syncMutation.mutate(account.id)}
                    loading={syncMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => disconnectMutation.mutate(account.id)}
                  >
                    <Unplug className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* App catalog */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#111827]">
            Available Apps
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Connect apps via Pipedream to bring data into your intelligence
            workspace.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#111827]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* App grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.map((app) => {
            const isConnected = connectedAppIds.has(app.id);
            return (
              <Card
                key={app.id}
                className="flex flex-col justify-between"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280]">
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827]">
                      {app.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {app.description}
                    </p>
                  </div>
                </div>
                {isConnected ? (
                  <Badge variant="success" className="self-start">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => handleConnect(app.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Connect
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function IntegrationsPage() {
  return (
    <Page
      title="Integrations"
      subtitle="Connected data sources and services"
    >
      <div className="space-y-8">
        <DataSourcesSection />
        <div className="border-t border-[#E5E7EB]" />
        <ConnectedAppsSection />
      </div>
    </Page>
  );
}
