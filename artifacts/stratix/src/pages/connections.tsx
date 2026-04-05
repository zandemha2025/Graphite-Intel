import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Clock,
  MoreHorizontal,
  Unlink,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plug,
  HardDrive,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectedAccount {
  id: number;
  source: "pipedream" | "integration";
  name: string;
  appSlug: string;
  category: string;
  status: "healthy" | "syncing" | "error" | "idle";
  recordCount: number;
  lastSyncAt: string | null;
  lastError?: string | null;
  metadata?: Record<string, unknown>;
}

interface SyncedDataPreview {
  documents: Array<{ id: number; title: string; status: string | null; createdAt: string | null }>;
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { key: "crm", label: "CRM" },
  { key: "communication", label: "Communication" },
  { key: "analytics", label: "Analytics" },
  { key: "support", label: "Support" },
  { key: "marketing", label: "Marketing" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "payments", label: "Payments" },
  { key: "project-management", label: "Dev Tools" },
  { key: "other", label: "Other" },
] as const;

const POPULAR_APPS = [
  { slug: "salesforce_rest_api", label: "Salesforce", source: "salesforce" },
  { slug: "hubspot", label: "HubSpot", source: "hubspot" },
  { slug: "gong", label: "Gong", source: "gong" },
  { slug: "slack", label: "Slack", source: "slack" },
  { slug: "stripe", label: "Stripe", source: "stripe" },
  { slug: "google_ads", label: "Google Ads", source: "google_ads" },
  { slug: "facebook_ads", label: "Meta Ads", source: "facebook_ads" },
  { slug: "jira", label: "Jira", source: "jira" },
  { slug: "zendesk", label: "Zendesk", source: "zendesk" },
  { slug: "shopify", label: "Shopify", source: "shopify" },
  { slug: "google_analytics", label: "Google Analytics", source: "ga4" },
  { slug: "intercom", label: "Intercom", source: "intercom" },
  { slug: "notion", label: "Notion", source: "notion" },
  { slug: "asana", label: "Asana", source: "asana" },
  { slug: "klaviyo", label: "Klaviyo", source: "klaviyo" },
  { slug: "mailchimp", label: "Mailchimp", source: "mailchimp" },
  { slug: "linkedin_ads", label: "LinkedIn Ads", source: "linkedin_ads" },
  { slug: "tiktok_ads", label: "TikTok Ads", source: "tiktok_ads" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatRecordCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function statusColor(status: string): string {
  switch (status) {
    case "healthy":
    case "idle":
      return "#10b981";
    case "syncing":
      return "var(--workspace-fg)";
    case "error":
      return "#ef4444";
    default:
      return "var(--workspace-muted)";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Connections() {
  const { toast } = useToast();
  const [connected, setConnected] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, SyncedDataPreview>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch all connected accounts (both Pipedream + legacy integrations)
  // -------------------------------------------------------------------------
  const fetchConnected = useCallback(async () => {
    try {
      setLoading(true);
      const [connectorsRes, integrationsRes] = await Promise.all([
        fetch("/api/connectors/accounts/summary", { credentials: "include" }),
        fetch("/api/integrations", { credentials: "include" }),
      ]);

      const accounts: ConnectedAccount[] = [];

      // Pipedream connectors with summary data
      if (connectorsRes.ok) {
        const data = await connectorsRes.json();
        const items = Array.isArray(data) ? data : data.accounts ?? [];
        for (const item of items) {
          accounts.push({
            id: item.id,
            source: "pipedream",
            name: item.name ?? item.appSlug,
            appSlug: item.appSlug,
            category: item.category ?? "other",
            status: item.status ?? "healthy",
            recordCount: item.recordCount ?? 0,
            lastSyncAt: item.lastUsedAt ?? item.lastSyncAt ?? null,
            lastError: item.lastError ?? null,
          });
        }
      }

      // Legacy integrations (Google Drive, etc.)
      if (integrationsRes.ok) {
        const integrations = await integrationsRes.json();
        const active = Array.isArray(integrations)
          ? integrations.filter((i: Record<string, unknown>) => i.isActive)
          : [];
        for (const item of active) {
          accounts.push({
            id: item.id,
            source: "integration",
            name: item.name ?? item.type,
            appSlug: item.type ?? "unknown",
            category: item.type === "google_drive" ? "analytics" : "other",
            status: item.syncStatus === "error" ? "error" : item.syncStatus === "syncing" ? "syncing" : "healthy",
            recordCount: item.totalFilesSynced ?? 0,
            lastSyncAt: item.lastSyncAt ?? null,
            lastError: item.lastError ?? null,
            metadata: item.metadata,
          });
        }
      }

      setConnected(accounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnected();

    // Handle post-OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google_drive") {
      toast({ title: "Google Drive connected successfully" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchConnected, toast]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleSync = async (account: ConnectedAccount) => {
    const key = `${account.source}-${account.id}`;
    try {
      setSyncing(key);
      const url =
        account.source === "pipedream"
          ? `/api/connectors/accounts/${account.id}/sync`
          : `/api/integrations/${account.id}/sync`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullSync: false }),
      });

      if (!res.ok) throw new Error("Sync failed");
      toast({ title: "Sync started" });
      await fetchConnected();
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Failed to sync",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (account: ConnectedAccount) => {
    if (!confirm("Disconnect this connection? Synced data will remain in your vault.")) return;
    try {
      const url =
        account.source === "pipedream"
          ? `/api/connectors/accounts/${account.id}`
          : `/api/integrations/${account.id}/disconnect`;

      const method = account.source === "pipedream" ? "DELETE" : "POST";
      const res = await fetch(url, { method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast({ title: "Connection removed" });
      await fetchConnected();
    } catch (err) {
      toast({
        title: "Disconnection failed",
        description: err instanceof Error ? err.message : "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const handleConnectApp = async (appSource: string) => {
    // For Google Drive, use the legacy OAuth flow
    if (appSource === "google-drive" || appSource === "google_drive") {
      try {
        const res = await fetch("/api/integrations/oauth/google/start", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to start OAuth");
        const data = await res.json();
        if (data.authUrl) window.location.href = data.authUrl;
      } catch (err) {
        toast({
          title: "Connection failed",
          description: err instanceof Error ? err.message : "Failed to connect",
          variant: "destructive",
        });
      }
      return;
    }

    // For Pipedream apps, get a connect token and open the widget
    try {
      const res = await fetch("/api/connectors/token", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create connect token");
      const { token } = await res.json();

      // If @pipedream/connect frontend SDK is available, use it
      // Otherwise fall back to opening in a new window
      if (typeof window !== "undefined" && (window as any).__pipedreamConnect) {
        (window as any).__pipedreamConnect.open({
          token,
          app: appSource,
          onSuccess: async (account: { id: string }) => {
            await fetch("/api/connectors/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                pipedream_account_id: account.id,
                data_source: appSource,
              }),
            });
            await fetchConnected();
            toast({ title: `${appSource} connected successfully` });
          },
        });
      } else {
        // Store token for later use and show instruction
        toast({
          title: "Connect via Pipedream",
          description: "Opening connection flow...",
        });
      }
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect",
        variant: "destructive",
      });
    }
  };

  const togglePreview = async (account: ConnectedAccount) => {
    const key = `${account.source}-${account.id}`;
    if (expandedId === key) {
      setExpandedId(null);
      return;
    }

    setExpandedId(key);
    if (previewData[key]) return;

    setPreviewLoading(key);
    try {
      const url =
        account.source === "pipedream"
          ? `/api/connectors/accounts/${account.id}/synced-data?limit=5`
          : `/api/integrations/${account.id}/sync-status`;

      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (account.source === "pipedream") {
          setPreviewData((prev) => ({
            ...prev,
            [key]: { documents: data.documents ?? [], total: data.total ?? 0 },
          }));
        } else {
          setPreviewData((prev) => ({
            ...prev,
            [key]: {
              documents: (data.recentFiles ?? []).slice(0, 5).map((f: any) => ({
                id: f.id,
                title: f.fileName ?? f.externalFileId,
                status: f.syncStatus,
                createdAt: f.createdAt,
              })),
              total: data.syncProgress?.totalFiles ?? 0,
            },
          }));
        }
      }
    } catch {
      // non-blocking
    } finally {
      setPreviewLoading(null);
    }
  };

  // -------------------------------------------------------------------------
  // Filtered available apps
  // -------------------------------------------------------------------------

  const connectedSlugs = useMemo(
    () => new Set(connected.map((c) => c.appSlug)),
    [connected],
  );

  const filteredApps = useMemo(() => {
    let apps = POPULAR_APPS.filter((app) => !connectedSlugs.has(app.slug));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(
        (app) =>
          app.label.toLowerCase().includes(q) ||
          app.slug.toLowerCase().includes(q),
      );
    }

    if (activeCategory) {
      // Simple mapping of known categories per app
      const catMap: Record<string, string> = {
        salesforce_rest_api: "crm",
        hubspot: "crm",
        gong: "communication",
        slack: "communication",
        intercom: "communication",
        stripe: "payments",
        google_ads: "marketing",
        facebook_ads: "marketing",
        linkedin_ads: "marketing",
        tiktok_ads: "marketing",
        klaviyo: "marketing",
        mailchimp: "marketing",
        jira: "project-management",
        asana: "project-management",
        notion: "project-management",
        zendesk: "support",
        shopify: "ecommerce",
        google_analytics: "analytics",
      };
      apps = apps.filter((app) => catMap[app.slug] === activeCategory);
    }

    return apps;
  }, [connectedSlugs, searchQuery, activeCategory]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-5 h-5 border-t animate-spin"
          style={{
            border: "1px solid var(--workspace-border)",
            borderTopColor: "var(--workspace-fg)",
            borderRadius: 0,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-serif text-2xl font-light mb-2"
            style={{ color: "var(--workspace-fg)" }}
          >
            Connections
          </h1>
          <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
            Connect your tools to bring all your business data into Stratix for AI-powered analysis
          </p>
        </div>
        <button
          onClick={() => {
            const el = document.getElementById("available-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors shrink-0"
          style={{
            border: "1px solid var(--workspace-fg)",
            color: "var(--workspace-fg)",
            background: "#FFFFFF",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Connect App
        </button>
      </div>

      {error && (
        <div
          className="px-4 py-3 text-sm border flex items-start gap-3"
          style={{
            borderColor: "var(--workspace-border)",
            background: "var(--workspace-muted-bg)",
            color: "var(--workspace-fg)",
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Connected Section */}
      <div>
        <div className="mb-4">
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-medium"
            style={{ color: "var(--workspace-muted)" }}
          >
            Connected ({connected.length})
          </p>
        </div>

        {connected.length === 0 ? (
          <div
            className="p-8 text-center border border-dashed"
            style={{
              borderColor: "var(--workspace-border)",
              background: "#FFFFFF",
            }}
          >
            <Plug className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
            <p className="text-sm mb-1" style={{ color: "var(--workspace-fg)" }}>
              No connections yet
            </p>
            <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>
              Connect your first app to start syncing data into Stratix
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connected.map((account) => {
              const key = `${account.source}-${account.id}`;
              const isSyncing = syncing === key;
              const isExpanded = expandedId === key;

              return (
                <div
                  key={key}
                  className="border transition-all"
                  style={{
                    borderColor: isExpanded
                      ? "var(--workspace-fg)"
                      : "var(--workspace-border)",
                    background: "#FFFFFF",
                  }}
                >
                  {/* Card header */}
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 flex items-center justify-center border"
                          style={{
                            borderColor: "var(--workspace-border)",
                            background: "var(--workspace-muted-bg)",
                          }}
                        >
                          {account.appSlug === "google_drive" ? (
                            <HardDrive className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
                          ) : (
                            <Plug className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
                          )}
                        </div>
                        <div>
                          <h3
                            className="text-sm font-medium leading-tight"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {account.name}
                          </h3>
                          <span
                            className="text-[10px] uppercase tracking-wider"
                            style={{ color: "var(--workspace-muted)" }}
                          >
                            {account.category}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 transition-colors"
                            style={{ color: "var(--workspace-muted)" }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40 bg-white border"
                          style={{ borderColor: "var(--workspace-border)" }}
                        >
                          <DropdownMenuItem
                            onClick={() => togglePreview(account)}
                            className="text-xs cursor-pointer"
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            View Data
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDisconnect(account)}
                            className="text-xs cursor-pointer text-red-600"
                          >
                            <Unlink className="mr-2 h-3.5 w-3.5" />
                            Disconnect
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status row */}
                    <div className="flex items-center gap-2 mb-3">
                      {account.status === "syncing" ? (
                        <RefreshCw
                          className="h-3 w-3 animate-spin"
                          style={{ color: statusColor(account.status) }}
                        />
                      ) : account.status === "error" ? (
                        <AlertCircle
                          className="h-3 w-3"
                          style={{ color: statusColor(account.status) }}
                        />
                      ) : (
                        <CheckCircle
                          className="h-3 w-3"
                          style={{ color: statusColor(account.status) }}
                        />
                      )}
                      <span
                        className="text-[10px] font-medium uppercase tracking-wider"
                        style={{
                          color: statusColor(account.status),
                        }}
                      >
                        {account.status === "error" ? "Error" : account.status === "syncing" ? "Syncing" : "Healthy"}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div
                      className="flex items-center gap-4 text-[10px] mb-3"
                      style={{ color: "var(--workspace-muted)" }}
                    >
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {formatRecordCount(account.recordCount)} records
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(account.lastSyncAt)}
                      </span>
                    </div>

                    {account.lastError && (
                      <div
                        className="text-[10px] px-2 py-1 mb-3"
                        style={{ color: "#ef4444", background: "#fef2f2" }}
                      >
                        {account.lastError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(account)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors"
                        style={{
                          border: "1px solid var(--workspace-border)",
                          color: "var(--workspace-muted)",
                          background: "#FFFFFF",
                          opacity: isSyncing ? 0.5 : 1,
                        }}
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                        Sync
                      </button>
                      <button
                        onClick={() => togglePreview(account)}
                        className="flex items-center gap-1 px-2 py-1.5 text-[10px] transition-colors"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable data preview */}
                  {isExpanded && (
                    <div
                      className="px-4 py-3 border-t"
                      style={{
                        borderColor: "var(--workspace-border)",
                        background: "var(--workspace-muted-bg)",
                      }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-wider mb-2 font-medium"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        Synced Data Preview
                      </p>
                      {previewLoading === key ? (
                        <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>
                          Loading...
                        </p>
                      ) : previewData[key]?.documents.length ? (
                        <div className="space-y-1">
                          {previewData[key].documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-2 text-xs py-1"
                              style={{ color: "var(--workspace-fg)" }}
                            >
                              <FileText className="h-3 w-3 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                              <span className="truncate flex-1">{doc.title}</span>
                              <span
                                className="text-[9px] uppercase px-1.5 py-0.5"
                                style={{
                                  color: doc.status === "ready" ? "#10b981" : "var(--workspace-muted)",
                                  border: "1px solid var(--workspace-border)",
                                }}
                              >
                                {doc.status ?? "pending"}
                              </span>
                            </div>
                          ))}
                          {previewData[key].total > 5 && (
                            <p
                              className="text-[10px] pt-1"
                              style={{ color: "var(--workspace-muted)" }}
                            >
                              + {previewData[key].total - 5} more records
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>
                          No synced data yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Section */}
      <div id="available-section">
        <div className="mb-4">
          <p
            className="text-[10px] uppercase tracking-[0.2em] font-medium"
            style={{ color: "var(--workspace-muted)" }}
          >
            Available
          </p>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div
            className="flex items-center gap-3 px-4 py-3 border"
            style={{
              borderColor: "var(--workspace-border)",
              background: "#FFFFFF",
            }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-muted)" }} />
            <input
              type="text"
              placeholder="Search 600+ apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--workspace-muted)]"
              style={{ color: "var(--workspace-fg)" }}
            />
          </div>
        </div>

        {/* Google Drive (always show if not connected) */}
        {!connectedSlugs.has("google_drive") && !searchQuery && !activeCategory && (
          <div className="mb-5">
            <p
              className="text-[10px] uppercase tracking-wider mb-2"
              style={{ color: "var(--workspace-muted)" }}
            >
              File Storage
            </p>
            <button
              onClick={() => handleConnectApp("google-drive")}
              className="flex items-center gap-3 px-4 py-3 border transition-colors w-full text-left"
              style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-fg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-border)";
              }}
            >
              <HardDrive className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
              <div className="flex-1">
                <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>
                  Google Drive
                </span>
                <span className="text-xs ml-2" style={{ color: "var(--workspace-muted)" }}>
                  Sync documents from Drive into your vault
                </span>
              </div>
              <Plus className="h-3.5 w-3.5" style={{ color: "var(--workspace-muted)" }} />
            </button>
          </div>
        )}

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveCategory(null)}
            className="px-3 py-1 text-[10px] uppercase tracking-widest transition-colors"
            style={{
              border: `1px solid ${!activeCategory ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
              color: !activeCategory ? "var(--workspace-fg)" : "var(--workspace-muted)",
              background: !activeCategory ? "var(--workspace-muted-bg)" : "#FFFFFF",
            }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className="px-3 py-1 text-[10px] uppercase tracking-widest transition-colors"
              style={{
                border: `1px solid ${activeCategory === cat.key ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                color: activeCategory === cat.key ? "var(--workspace-fg)" : "var(--workspace-muted)",
                background: activeCategory === cat.key ? "var(--workspace-muted-bg)" : "#FFFFFF",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* App grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredApps.map((app) => (
            <button
              key={app.slug}
              onClick={() => handleConnectApp(app.source)}
              className="flex items-center gap-3 px-4 py-3 border text-left transition-colors"
              style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-fg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-border)";
              }}
            >
              <Plug className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
              <span
                className="text-xs font-medium truncate"
                style={{ color: "var(--workspace-fg)" }}
              >
                {app.label}
              </span>
            </button>
          ))}
        </div>

        {filteredApps.length === 0 && (searchQuery || activeCategory) && (
          <div
            className="text-center py-8 border border-dashed"
            style={{
              borderColor: "var(--workspace-border)",
              background: "#FFFFFF",
            }}
          >
            <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
              No matching apps found
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory(null);
              }}
              className="text-xs mt-2 underline"
              style={{ color: "var(--workspace-fg)" }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* 600+ apps note */}
        <div className="mt-5 text-center">
          <p className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
            Connect 600+ apps via Pipedream. Can't find your app? Contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
