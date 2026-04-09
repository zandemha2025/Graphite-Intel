import { useState, useEffect, useCallback } from "react";
import {
  Server, Key, Code2, ChevronRight, Activity, CheckCircle,
  Clock, Copy, X, Eye, EyeOff, Play, Loader2, AlertCircle,
  RefreshCw, Shield, Plus, Trash2,
} from "lucide-react";

export interface MCPConfigProps {
  open: boolean;
  onClose: () => void;
}

type MCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type MCPKey = {
  id: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
};

type MCPUsageEntry = {
  id: string;
  timestamp: string;
  tool: string;
  caller: string;
  status: "success" | "error";
  durationMs?: number;
};

const MCP_TOOLS: MCPTool[] = [
  {
    name: "query_data",
    description: "Run a natural language query against connected data sources",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Natural language query" }, sources: { type: "array", items: { type: "string" }, description: "Optional list of source IDs to query" } }, required: ["query"] },
  },
  {
    name: "generate_report",
    description: "Generate a strategy report on a given topic",
    inputSchema: { type: "object", properties: { topic: { type: "string", description: "Report topic" }, format: { type: "string", enum: ["brief", "detailed", "executive"], description: "Output format" } }, required: ["topic"] },
  },
  {
    name: "monitor_competitor",
    description: "Get latest intelligence on a competitor",
    inputSchema: { type: "object", properties: { competitor: { type: "string", description: "Competitor name or domain" }, signals: { type: "array", items: { type: "string" }, description: "Signal types: pricing, hiring, product, press" } }, required: ["competitor"] },
  },
  {
    name: "analyze_campaign",
    description: "Analyze campaign performance metrics",
    inputSchema: { type: "object", properties: { campaignId: { type: "string", description: "Campaign identifier" }, dateRange: { type: "object", properties: { start: { type: "string" }, end: { type: "string" } } } }, required: ["campaignId"] },
  },
  {
    name: "search_knowledge",
    description: "Search uploaded documents and knowledge base",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, limit: { type: "number", description: "Max results (default 10)" } }, required: ["query"] },
  },
  {
    name: "create_notebook",
    description: "Create a new notebook with specified content",
    inputSchema: { type: "object", properties: { title: { type: "string", description: "Notebook title" }, content: { type: "string", description: "Initial content in markdown" }, tags: { type: "array", items: { type: "string" } } }, required: ["title"] },
  },
];

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MCPConfig({ open, onClose }: MCPConfigProps) {
  const [serverEnabled, setServerEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [section, setSection] = useState<"tools" | "auth" | "usage" | "integrate">("tools");

  // Auth state
  const [keys, setKeys] = useState<MCPKey[]>([]);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  // Usage state
  const [usage, setUsage] = useState<MCPUsageEntry[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Copied state
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/mcp/config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((data) => {
        setServerEnabled(data.enabled ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/mcp/keys", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setKeys(Array.isArray(data) ? data : data?.keys || []))
      .catch(() => {});
  }, [open]);

  const toggleServer = useCallback(async () => {
    const next = !serverEnabled;
    setServerEnabled(next);
    try {
      await fetch("/api/mcp/config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      setServerEnabled(!next);
    }
  }, [serverEnabled]);

  const handleTestTool = useCallback(async (toolName: string) => {
    setTestingTool(toolName);
    try {
      await fetch(`/api/mcp/tools/${toolName}/test`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setTimeout(() => setTestingTool(null), 1500);
  }, []);

  const handleGenerateKey = useCallback(async () => {
    setGeneratingKey(true);
    setNewKeyValue(null);
    try {
      const res = await fetch("/api/mcp/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKeyValue(data.key || data.apiKey || null);
        setKeys((prev) => [
          { id: data.id || crypto.randomUUID(), prefix: (data.key || data.apiKey || "").slice(0, 12) + "...", createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
    } catch {}
    setGeneratingKey(false);
  }, []);

  const handleRevokeKey = useCallback(async (keyId: string) => {
    try {
      await fetch(`/api/mcp/keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch {}
  }, []);

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch("/api/mcp/usage", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsage(Array.isArray(data) ? data : data?.usage || data?.data || []);
      }
    } catch {}
    setLoadingUsage(false);
  }, []);

  useEffect(() => {
    if (open && section === "usage") {
      loadUsage();
    }
  }, [open, section, loadUsage]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  if (!open) return null;

  const serverUrl = "https://stratix-v5.vercel.app/api/mcp";
  const integrationSnippet = JSON.stringify(
    {
      mcpServers: {
        stratix: {
          url: serverUrl,
          apiKey: newKeyValue || "sk-...",
        },
      },
    },
    null,
    2,
  );

  const sections = [
    { id: "tools" as const, label: "Available Tools", icon: Server },
    { id: "auth" as const, label: "Authentication", icon: Key },
    { id: "usage" as const, label: "Usage Stats", icon: Activity },
    { id: "integrate" as const, label: "Integration", icon: Code2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center">
              <Server className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-editorial text-[18px] text-[var(--text-primary)]">MCP Server</h2>
              <p className="text-caption text-[var(--text-secondary)]">Model Context Protocol configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Server Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
            <div>
              <p className="text-body-sm font-medium text-[var(--text-primary)]">Server Status</p>
              <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                {serverEnabled ? "Stratix is accepting MCP connections" : "MCP server is disabled"}
              </p>
              {serverEnabled && (
                <p className="text-caption text-[var(--text-muted)] mt-1 font-mono">{serverUrl}</p>
              )}
            </div>
            <button
              onClick={toggleServer}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                serverEnabled ? "bg-[var(--accent)]" : "bg-[var(--surface-secondary)]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                  serverEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--surface-secondary)]">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-caption font-medium transition-colors ${
                    section === s.id
                      ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Tools Section */}
          {section === "tools" && (
            <div className="space-y-2">
              {MCP_TOOLS.map((tool) => {
                const isExpanded = expandedTool === tool.name;
                const isTesting = testingTool === tool.name;
                return (
                  <div
                    key={tool.name}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors"
                      onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                    >
                      <code className="text-body-sm font-medium text-[var(--accent)]">{tool.name}</code>
                      <span className="flex-1 text-caption text-[var(--text-secondary)] truncate">{tool.description}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestTool(tool.name);
                        }}
                        disabled={isTesting}
                        className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors disabled:opacity-50"
                      >
                        {isTesting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Test
                      </button>
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0">
                        <p className="text-caption text-[var(--text-muted)] mb-2">Input Schema</p>
                        <pre className="bg-[var(--surface-secondary)] font-mono text-[13px] rounded-lg p-4 overflow-x-auto text-[var(--text-primary)]">
                          {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Auth Section */}
          {section === "auth" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">API Keys</p>
                  <p className="text-caption text-[var(--text-secondary)]">Manage keys for MCP access</p>
                </div>
                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {generatingKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Generate Key
                </button>
              </div>

              {newKeyValue && (
                <div className="p-4 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-[var(--accent)]/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-[var(--accent)]" />
                    <p className="text-body-sm font-medium text-[var(--text-primary)]">New API Key Created</p>
                  </div>
                  <p className="text-caption text-[var(--text-secondary)] mb-2">
                    Copy this key now. It will not be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[var(--surface-secondary)] font-mono text-[13px] rounded-lg px-3 py-2 text-[var(--text-primary)] break-all">
                      {revealedKey === "new" ? newKeyValue : newKeyValue.slice(0, 12) + "..." + newKeyValue.slice(-4)}
                    </code>
                    <button
                      onClick={() => setRevealedKey(revealedKey === "new" ? null : "new")}
                      className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                    >
                      {revealedKey === "new" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(newKeyValue, "new-key")}
                      className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                    >
                      {copied === "new-key" ? <CheckCircle className="h-3.5 w-3.5 text-[#3C8B4E]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {keys.length === 0 && !newKeyValue ? (
                <p className="text-body-sm text-[var(--text-muted)] py-6 text-center">
                  No API keys. Generate one to allow MCP access.
                </p>
              ) : (
                <div className="space-y-2">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <Key className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                      <code className="text-caption font-mono text-[var(--text-primary)]">{k.prefix}</code>
                      <span className="flex-1 text-caption text-[var(--text-muted)]">
                        Created {formatDate(new Date(k.createdAt))}
                      </span>
                      {k.lastUsedAt && (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Last used {formatDate(new Date(k.lastUsedAt))}
                        </span>
                      )}
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage Section */}
          {section === "usage" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium text-[var(--text-primary)]">Recent MCP Calls</p>
                <button
                  onClick={loadUsage}
                  disabled={loadingUsage}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingUsage ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingUsage ? (
                <div className="flex items-center justify-center gap-2 py-8 text-caption text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading usage data...
                </div>
              ) : usage.length === 0 ? (
                <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No MCP calls recorded yet.</p>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="bg-[var(--surface-secondary)]">
                        <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Time</th>
                        <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Tool</th>
                        <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Caller</th>
                        <th className="text-left px-3 py-2 text-[var(--text-secondary)] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map((entry) => (
                        <tr key={entry.id} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap">
                            {formatTime(new Date(entry.timestamp))}
                          </td>
                          <td className="px-3 py-2">
                            <code className="text-[var(--accent)]">{entry.tool}</code>
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{entry.caller}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                entry.status === "success"
                                  ? "bg-[#D5E8D8] text-[#3C8B4E]"
                                  : "bg-[#E8D5D5] text-[var(--error)]"
                              }`}
                            >
                              {entry.status === "success" ? (
                                <CheckCircle className="h-2.5 w-2.5" />
                              ) : (
                                <AlertCircle className="h-2.5 w-2.5" />
                              )}
                              {entry.status}
                            </span>
                            {entry.durationMs != null && (
                              <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">{entry.durationMs}ms</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Integration Section */}
          {section === "integrate" && (
            <div className="space-y-4">
              <div>
                <p className="text-body-sm font-medium text-[var(--text-primary)] mb-1">Connect from Claude or other LLMs</p>
                <p className="text-caption text-[var(--text-secondary)]">
                  Add this configuration to your MCP client settings to connect to Stratix.
                </p>
              </div>
              <div className="relative">
                <pre className="bg-[var(--surface-secondary)] font-mono text-[13px] rounded-lg p-4 overflow-x-auto text-[var(--text-primary)]">
                  {integrationSnippet}
                </pre>
                <button
                  onClick={() => copyToClipboard(integrationSnippet, "snippet")}
                  className="absolute top-3 right-3 p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                >
                  {copied === "snippet" ? <CheckCircle className="h-3.5 w-3.5 text-[#3C8B4E]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] space-y-3">
                <p className="text-body-sm font-medium text-[var(--text-primary)]">Server Details</p>
                <div className="grid grid-cols-[100px_1fr] gap-y-2 text-caption">
                  <span className="text-[var(--text-secondary)]">Endpoint</span>
                  <code className="text-[var(--text-primary)] font-mono">{serverUrl}</code>
                  <span className="text-[var(--text-secondary)]">Protocol</span>
                  <span className="text-[var(--text-primary)]">MCP v1 (HTTP+SSE)</span>
                  <span className="text-[var(--text-secondary)]">Auth</span>
                  <span className="text-[var(--text-primary)]">Bearer token (API key)</span>
                  <span className="text-[var(--text-secondary)]">Tools</span>
                  <span className="text-[var(--text-primary)]">{MCP_TOOLS.length} available</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
