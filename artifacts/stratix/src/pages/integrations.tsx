import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  HardDrive,
  Cloud,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Folder,
  ChevronRight,
  Settings2,
  FileText,
  Clock,
} from "lucide-react";

interface ApiIntegration {
  id: number;
  type: string;
  name: string | null;
  isActive: boolean;
  syncStatus?: string;
  lastSyncAt: string | null;
  lastError?: string | null;
  totalFilesSynced?: number;
  metadata?: { email?: string; displayName?: string; picture?: string };
  syncConfig?: { folderIds?: string[]; direction?: string; intervalMinutes?: number };
  createdAt: string;
}

interface SyncStatus {
  integration: { syncStatus: string; lastSyncAt: string | null; lastError: string | null; totalFilesSynced: number };
  syncProgress: { totalFiles: number; syncedCount: number; pendingCount: number; failedCount: number };
}

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

type AvailableIntegration = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isAvailable: boolean;
  oauthType: string;
};

export function Integrations() {
  const { toast } = useToast();
  const [connected, setConnected] = useState<ApiIntegration[]>([]);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [syncStatusMap, setSyncStatusMap] = useState<Record<number, SyncStatus>>({});
  const [folderBrowser, setFolderBrowser] = useState<{ integrationId: number; folders: DriveFolder[]; loading: boolean } | null>(null);

  const availableIntegrations: AvailableIntegration[] = [
    {
      id: "google-drive",
      name: "Google Drive",
      icon: <HardDrive className="h-5 w-5" />,
      description: "Sync documents from Google Drive into your vault",
      isAvailable: true,
      oauthType: "google",
    },
    {
      id: "sharepoint",
      name: "SharePoint",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync files from SharePoint",
      isAvailable: false,
      oauthType: "sharepoint",
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync files from Dropbox",
      isAvailable: false,
      oauthType: "dropbox",
    },
    {
      id: "slack",
      name: "Slack",
      icon: <Cloud className="h-5 w-5" />,
      description: "Import messages and files from Slack channels",
      isAvailable: false,
      oauthType: "slack",
    },
    {
      id: "salesforce",
      name: "Salesforce",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync CRM data, opportunities, and account intel",
      isAvailable: false,
      oauthType: "salesforce",
    },
    {
      id: "hubspot",
      name: "HubSpot",
      icon: <Cloud className="h-5 w-5" />,
      description: "Import contacts, deals, and marketing analytics",
      isAvailable: false,
      oauthType: "hubspot",
    },
  ];

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load integrations");
      const data = await res.json();
      setConnected(Array.isArray(data) ? data.filter((d: ApiIntegration) => d.isActive) : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();

    // Check URL for post-OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google_drive") {
      toast({ title: "Google Drive connected successfully" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchIntegrations, toast]);

  const handleConnect = async (oauthType: string) => {
    try {
      const res = await fetch(`/api/integrations/oauth/${oauthType}/start`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to start OAuth flow");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (id: number) => {
    try {
      setSyncing(id);
      const res = await fetch(`/api/integrations/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullSync: false }),
      });
      if (!res.ok) throw new Error("Sync failed");
      toast({ title: "Sync started" });
      await fetchIntegrations();
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

  const handleDisconnect = async (id: number) => {
    if (!confirm("Disconnect this integration? Synced documents will remain in your vault.")) return;
    try {
      setDisconnecting(id);
      const res = await fetch(`/api/integrations/${id}/disconnect`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast({ title: "Integration disconnected" });
      await fetchIntegrations();
    } catch (err) {
      toast({
        title: "Disconnection failed",
        description: err instanceof Error ? err.message : "Failed to disconnect",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const fetchSyncStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/integrations/${id}/sync-status`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSyncStatusMap((prev) => ({ ...prev, [id]: data }));
      }
    } catch {}
  };

  const fetchFolders = async (integrationId: number, parentId?: string) => {
    setFolderBrowser({ integrationId, folders: [], loading: true });
    try {
      const url = parentId
        ? `/api/integrations/${integrationId}/drive/folders?parentId=${parentId}`
        : `/api/integrations/${integrationId}/drive/folders`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFolderBrowser({ integrationId, folders: data.folders || [], loading: false });
      } else {
        setFolderBrowser(null);
        toast({ title: "Failed to load folders", variant: "destructive" });
      }
    } catch {
      setFolderBrowser(null);
    }
  };

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchSyncStatus(id);
    }
  };

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
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <div>
        <h1
          className="font-sans text-2xl font-light mb-2"
          style={{ color: "var(--workspace-fg)" }}
        >
          Integrations
        </h1>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
          Connect third-party services to sync documents into your vault
        </p>
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

      {/* Available Integrations */}
      <div>
        <div className="mb-4">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--workspace-muted)" }}
          >
            Available Integrations
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableIntegrations.map((integration) => (
            <div
              key={integration.id}
              className="px-4 py-4 border transition-all"
              style={{
                borderColor: "var(--workspace-border)",
                background: "#FFFFFF",
                opacity: integration.isAvailable ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (integration.isAvailable) {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-fg)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--workspace-border)";
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className="text-sm"
                  style={{
                    color: integration.isAvailable ? "var(--workspace-fg)" : "var(--workspace-muted)",
                  }}
                >
                  {integration.icon}
                </div>
                {!integration.isAvailable && (
                  <span
                    className="text-[9px] px-2 py-0.5"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: "var(--workspace-muted)",
                    }}
                  >
                    Coming Soon
                  </span>
                )}
              </div>
              <h3
                className="text-sm font-medium mb-1"
                style={{ color: integration.isAvailable ? "var(--workspace-fg)" : "var(--workspace-muted)" }}
              >
                {integration.name}
              </h3>
              <p
                className="text-xs mb-4"
                style={{ color: "var(--workspace-muted)" }}
              >
                {integration.description}
              </p>
              {integration.isAvailable && (
                <button
                  onClick={() => handleConnect(integration.oauthType)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: "var(--workspace-muted)",
                    background: "#FFFFFF",
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Connected Integrations */}
      {connected.length > 0 && (
        <div>
          <div className="mb-4">
            <p
              className="text-xs font-medium"
              style={{ color: "var(--workspace-muted)" }}
            >
              Connected Integrations
            </p>
          </div>
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            <div
              className="px-5 py-3"
              style={{
                background: "var(--workspace-muted-bg)",
                borderBottom: "1px solid var(--workspace-border)",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "var(--workspace-muted)" }}
              >
                {connected.length} Connected
              </span>
            </div>
            {connected.map((integration, i) => {
              const status = syncStatusMap[integration.id];
              const isExpanded = expandedId === integration.id;
              const syncStatusLabel = integration.syncStatus ?? "idle";

              return (
                <div
                  key={integration.id}
                  style={{
                    background: "#FFFFFF",
                    borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className="text-sm font-medium"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {integration.name ?? integration.type}
                          </h3>
                          {syncStatusLabel === "idle" && (
                            <CheckCircle className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
                          )}
                          {syncStatusLabel === "syncing" && (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--workspace-fg)" }} />
                          )}
                          {syncStatusLabel === "error" && (
                            <AlertCircle className="h-3.5 w-3.5" style={{ color: "#ef4444" }} />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                          {integration.metadata?.email && (
                            <span>{integration.metadata.email}</span>
                          )}
                          {integration.lastSyncAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last synced {new Date(integration.lastSyncAt).toLocaleDateString()}
                            </span>
                          )}
                          {(integration.totalFilesSynced ?? 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {integration.totalFilesSynced} files
                            </span>
                          )}
                        </div>

                        {integration.lastError && (
                          <div className="mt-2 text-[10px] px-2 py-1" style={{ color: "#ef4444", background: "#fef2f2" }}>
                            {integration.lastError}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleExpand(integration.id)}
                          className="p-1.5 transition-colors"
                          style={{ color: "var(--workspace-muted)" }}
                          title="Settings"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleSync(integration.id)}
                          disabled={syncing === integration.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                          style={{
                            border: "1px solid var(--workspace-border)",
                            color: "var(--workspace-muted)",
                            background: "#FFFFFF",
                            opacity: syncing === integration.id ? 0.5 : 1,
                          }}
                          title="Sync now"
                        >
                          <RefreshCw className={`h-3 w-3 ${syncing === integration.id ? "animate-spin" : ""}`} />
                          Sync
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          disabled={disconnecting === integration.id}
                          className="p-1.5 transition-colors"
                          style={{ color: "var(--workspace-muted)" }}
                          title="Disconnect"
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details panel */}
                  {isExpanded && (
                    <div
                      className="px-5 py-4"
                      style={{ borderTop: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
                    >
                      {/* Sync progress */}
                      {status && (
                        <div className="mb-4">
                          <p className="text-xs font-medium mb-2" style={{ color: "var(--workspace-muted)" }}>
                            Sync Progress
                          </p>
                          <div className="flex gap-4 text-xs" style={{ color: "var(--workspace-fg)" }}>
                            <span>{status.syncProgress.syncedCount} synced</span>
                            <span>{status.syncProgress.pendingCount} pending</span>
                            {status.syncProgress.failedCount > 0 && (
                              <span style={{ color: "#ef4444" }}>{status.syncProgress.failedCount} failed</span>
                            )}
                          </div>
                          {status.syncProgress.totalFiles > 0 && (
                            <div className="mt-2 h-1" style={{ background: "var(--workspace-border)" }}>
                              <div
                                className="h-1 transition-all"
                                style={{
                                  width: `${(status.syncProgress.syncedCount / status.syncProgress.totalFiles) * 100}%`,
                                  background: "#10b981",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Folder browser */}
                      {integration.type === "google_drive" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
                              Drive Folders
                            </p>
                            <button
                              onClick={() => fetchFolders(integration.id)}
                              className="text-xs font-medium px-2 py-0.5"
                              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}
                            >
                              Browse
                            </button>
                          </div>

                          {folderBrowser?.integrationId === integration.id && (
                            <div className="mt-2">
                              {folderBrowser.loading ? (
                                <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>Loading folders...</p>
                              ) : folderBrowser.folders.length === 0 ? (
                                <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>No folders found</p>
                              ) : (
                                <div className="space-y-1">
                                  {folderBrowser.folders.map((folder) => (
                                    <div
                                      key={folder.id}
                                      className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer transition-colors"
                                      style={{ color: "var(--workspace-fg)" }}
                                      onClick={() => fetchFolders(integration.id, folder.id)}
                                    >
                                      <Folder className="h-3.5 w-3.5" style={{ color: "var(--workspace-muted)" }} />
                                      <span className="flex-1 truncate">{folder.name}</span>
                                      <ChevronRight className="h-3 w-3" style={{ color: "var(--workspace-muted)" }} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {connected.length === 0 && (
        <div
          className="p-8 text-center border border-dashed"
          style={{
            borderColor: "var(--workspace-border)",
            background: "#FFFFFF",
          }}
        >
          <Link2 className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--workspace-fg)" }}>
            No integrations connected yet
          </p>
          <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>
            Connect a service to start syncing your documents
          </p>
        </div>
      )}
    </div>
  );
}
