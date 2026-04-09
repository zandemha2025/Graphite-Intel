import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, Copy, CheckCircle, Loader2, Play,
  Clock, ChevronRight, AlertCircle, Link2,
} from "lucide-react";

export interface WebhookConfigProps {
  open: boolean;
  onClose: () => void;
}

type Webhook = {
  id: string;
  name: string;
  url: string;
  workflowId?: string;
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
};

type WebhookPayload = {
  id: string;
  receivedAt: string;
  body: Record<string, unknown>;
};

type WorkflowOption = {
  id: string;
  name: string;
};

function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

const BASE_URL = "https://stratix-v5.vercel.app/api/webhooks";

export function WebhookConfig({ open, onClose }: WebhookConfigProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWorkflowId, setNewWorkflowId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [payloads, setPayloads] = useState<WebhookPayload[]>([]);
  const [loadingPayloads, setLoadingPayloads] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.allSettled([
      fetch("/api/webhooks", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/pipedream/workflows", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([whResult, wfResult]) => {
      if (whResult.status === "fulfilled") {
        const raw = whResult.value;
        setWebhooks(Array.isArray(raw) ? raw : raw?.webhooks || raw?.data || []);
      }
      if (wfResult.status === "fulfilled") {
        const raw = wfResult.value;
        const arr = Array.isArray(raw) ? raw : raw?.workflows || raw?.data || [];
        setWorkflows(arr.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })));
      }
    }).finally(() => setLoading(false));
  }, [open]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          workflowId: newWorkflowId || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const webhook: Webhook = {
          id: data.id || crypto.randomUUID(),
          name: newName.trim(),
          url: data.url || `${BASE_URL}/${data.id || "new"}`,
          workflowId: newWorkflowId || undefined,
          createdAt: new Date().toISOString(),
          triggerCount: 0,
        };
        setWebhooks((prev) => [webhook, ...prev]);
        setNewName("");
        setNewWorkflowId("");
        setShowCreateForm(false);
      }
    } catch {}
    setCreating(false);
  }, [newName, newWorkflowId]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingWebhook(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        if (expandedWebhook === id) setExpandedWebhook(null);
      }
    } catch {}
    setDeletingWebhook(null);
  }, [expandedWebhook]);

  const handleTest = useCallback(async (id: string) => {
    setTestingWebhook(id);
    try {
      await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
    } catch {}
    setTimeout(() => setTestingWebhook(null), 1500);
  }, []);

  const handleExpand = useCallback(async (id: string) => {
    if (expandedWebhook === id) {
      setExpandedWebhook(null);
      setPayloads([]);
      return;
    }
    setExpandedWebhook(id);
    setLoadingPayloads(true);
    try {
      const res = await fetch(`/api/webhooks/${id}/payloads`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPayloads(Array.isArray(data) ? data.slice(0, 5) : (data?.payloads || []).slice(0, 5));
      }
    } catch {
      setPayloads([]);
    }
    setLoadingPayloads(false);
  }, [expandedWebhook]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center">
              <Link2 className="h-4.5 w-4.5 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="font-editorial text-[18px] text-[var(--text-primary)]">Webhooks</h2>
              <p className="text-caption text-[var(--text-secondary)]">Incoming webhook endpoints for triggering workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Create Button / Form */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Webhook
            </button>
          ) : (
            <div className="p-4 rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--surface)] space-y-3">
              <p className="text-body-sm font-medium text-[var(--text-primary)]">New Webhook</p>
              <input
                type="text"
                placeholder="Webhook name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
              <div>
                <label className="text-caption text-[var(--text-secondary)] mb-1 block">Link to workflow (optional)</label>
                <select
                  value={newWorkflowId}
                  onChange={(e) => setNewWorkflowId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                >
                  <option value="">No workflow</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName("");
                    setNewWorkflowId("");
                  }}
                  className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-caption font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Webhook List */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-caption text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading webhooks...
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-body-sm text-[var(--text-muted)] py-12 text-center">
              No webhooks configured. Create one to start receiving events.
            </p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((wh) => {
                const isExpanded = expandedWebhook === wh.id;
                return (
                  <div key={wh.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Link2 className="h-4 w-4 text-[var(--accent)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-[var(--text-primary)]">{wh.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[280px]">{wh.url}</code>
                          <button
                            onClick={() => copyToClipboard(wh.url, wh.id)}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
                          >
                            {copied === wh.id ? (
                              <CheckCircle className="h-3 w-3 text-[#3C8B4E]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-caption text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {wh.lastTriggeredAt
                            ? formatDate(new Date(wh.lastTriggeredAt))
                            : "Never triggered"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[11px] font-medium">
                          {wh.triggerCount} calls
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTest(wh.id)}
                          disabled={testingWebhook === wh.id}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                          title="Send test payload"
                        >
                          {testingWebhook === wh.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleExpand(wh.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                          title="View payloads"
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(wh.id)}
                          disabled={deletingWebhook === wh.id}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingWebhook === wh.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Payload Inspector */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0 border-t border-[var(--border)]">
                        <p className="text-caption text-[var(--text-secondary)] font-medium mt-3 mb-2">Recent Payloads</p>
                        {loadingPayloads ? (
                          <div className="flex items-center gap-2 py-3 text-caption text-[var(--text-muted)]">
                            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                          </div>
                        ) : payloads.length === 0 ? (
                          <p className="text-caption text-[var(--text-muted)] py-3">No payloads received yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {payloads.map((p) => (
                              <div key={p.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-secondary)] overflow-hidden">
                                <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)] border-b border-[var(--border)]">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDate(new Date(p.receivedAt))}
                                </div>
                                <pre className="font-mono text-[12px] p-3 overflow-x-auto text-[var(--text-primary)] max-h-24 overflow-y-auto">
                                  {JSON.stringify(p.body, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
