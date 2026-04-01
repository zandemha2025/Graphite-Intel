import { useState, useEffect } from "react";
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
} from "lucide-react";

type Integration = {
  id: string;
  name: string;
  icon: string;
  description: string;
  isConnected: boolean;
  lastSync?: string;
  syncStatus?: "syncing" | "synced" | "error";
  connectionDate?: string;
};

type AvailableIntegration = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isAvailable: boolean;
};

export function Integrations() {
  const { toast } = useToast();
  const [connected, setConnected] = useState<Integration[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableIntegrations: AvailableIntegration[] = [
    {
      id: "google-drive",
      name: "Google Drive",
      icon: <HardDrive className="h-5 w-5" />,
      description: "Sync documents from Google Drive",
      isAvailable: true,
    },
    {
      id: "sharepoint",
      name: "SharePoint",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync files from SharePoint",
      isAvailable: false,
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync files from Dropbox",
      isAvailable: false,
    },
    {
      id: "onedrive",
      name: "OneDrive",
      icon: <Cloud className="h-5 w-5" />,
      description: "Sync files from OneDrive",
      isAvailable: false,
    },
  ];

  // Load connected integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/integrations", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to load integrations");
        const data = await res.json();
        setConnected(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load integrations");
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleConnect = async (integrationId: string) => {
    try {
      const res = await fetch(
        `/api/integrations/oauth/google/start`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error("Failed to start OAuth flow");

      // OAuth flow will redirect
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      const res = await fetch(`/api/integrations/${id}/sync`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Sync failed");

      // Refresh integrations list
      const listRes = await fetch("/api/integrations", {
        credentials: "include",
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setConnected(data || []);
      }

      toast({ title: "Sync started successfully" });
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

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?"))
      return;

    try {
      setDisconnecting(id);
      const res = await fetch(`/api/integrations/${id}/disconnect`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to disconnect");

      // Refresh integrations list
      const listRes = await fetch("/api/integrations", {
        credentials: "include",
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setConnected(data || []);
      }

      toast({ title: "Integration disconnected" });
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
          className="font-serif text-2xl font-light mb-2"
          style={{ color: "var(--workspace-fg)" }}
        >
          Integrations
        </h1>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>
          Connect third-party services to your workspace
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
            className="text-[10px] uppercase tracking-[0.2em]"
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
                borderColor: integration.isAvailable
                  ? "var(--workspace-border)"
                  : "var(--workspace-border)",
                background: "#FFFFFF",
                opacity: integration.isAvailable ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                if (integration.isAvailable) {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--workspace-fg)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--workspace-border)";
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div
                  className="text-sm"
                  style={{
                    color: integration.isAvailable
                      ? "var(--workspace-fg)"
                      : "var(--workspace-muted)",
                  }}
                >
                  {integration.icon}
                </div>
                {!integration.isAvailable && (
                  <span
                    className="text-[9px] uppercase tracking-wider px-2 py-0.5"
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
                style={{
                  color: integration.isAvailable
                    ? "var(--workspace-fg)"
                    : "var(--workspace-muted)",
                }}
              >
                {integration.name}
              </h3>
              <p
                className="text-xs mb-4"
                style={{
                  color: integration.isAvailable
                    ? "var(--workspace-muted)"
                    : "var(--workspace-muted)",
                }}
              >
                {integration.description}
              </p>
              {integration.isAvailable && (
                <button
                  onClick={() => handleConnect(integration.id)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors"
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
              className="text-[10px] uppercase tracking-[0.2em]"
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
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "var(--workspace-muted)" }}
              >
                {connected.length} Connected
              </span>
            </div>
            {connected.map((integration, i) => (
              <div
                key={integration.id}
                className="px-5 py-4"
                style={{
                  background: "#FFFFFF",
                  borderTop:
                    i > 0 ? `1px solid var(--workspace-border)` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3
                        className="text-sm font-medium"
                        style={{ color: "var(--workspace-fg)" }}
                      >
                        {integration.name}
                      </h3>
                      {integration.syncStatus === "synced" && (
                        <CheckCircle className="h-4 w-4" style={{ color: "#10b981" }} />
                      )}
                      {integration.syncStatus === "syncing" && (
                        <RefreshCw className="h-4 w-4 animate-spin" style={{ color: "var(--workspace-fg)" }} />
                      )}
                      {integration.syncStatus === "error" && (
                        <AlertCircle className="h-4 w-4" style={{ color: "#ef4444" }} />
                      )}
                    </div>
                    {integration.connectionDate && (
                      <div
                        className="text-[10px] mb-1"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        Connected{" "}
                        {new Date(integration.connectionDate).toLocaleDateString()}
                      </div>
                    )}
                    {integration.lastSync && (
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        Last synced{" "}
                        {new Date(integration.lastSync).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncing === integration.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest transition-colors"
                      style={{
                        border: "1px solid var(--workspace-border)",
                        color: "var(--workspace-muted)",
                        background: "#FFFFFF",
                        opacity: syncing === integration.id ? 0.5 : 1,
                      }}
                      title="Sync now"
                    >
                      <RefreshCw className="h-3 w-3" />
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
            ))}
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
