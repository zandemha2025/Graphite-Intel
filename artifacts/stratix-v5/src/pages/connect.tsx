import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetCompanyProfile, getGetCompanyProfileQueryKey,
  useListDocuments, getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useTabParam } from "@/hooks/use-tab-param";
import {
  Database, Upload, Tag, Zap, Bot, Search, Plus, Trash2,
  FileText, Settings, CheckCircle, Circle, Play, Clock,
  AlertCircle, Edit2, X, ChevronRight, Eye,
} from "lucide-react";

type Tab = "sources" | "knowledge" | "definitions" | "workflows" | "agents";

/* ── Types ── */

type Connection = {
  id: number;
  name: string;
  status: string;
  category: string;
};

type Definition = {
  id: string;
  term: string;
  value: string;
  category: "market" | "metric" | "customer" | "competitor";
};

type WorkflowTemplate = {
  key: string;
  name: string;
  description: string;
  icon?: string;
};

type WorkflowRun = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
};

/* ── Default definitions ── */

const DEFAULT_DEFINITIONS: Definition[] = [
  { id: "def-1", term: "TAM", value: "Total Addressable Market - the total revenue opportunity available for a product or service", category: "market" },
  { id: "def-2", term: "ARR", value: "Annual Recurring Revenue - the annualized value of subscription contracts", category: "metric" },
  { id: "def-3", term: "ICP", value: "Ideal Customer Profile - the description of the company that would benefit most from your product", category: "customer" },
];

const CATEGORY_OPTIONS = [
  { value: "market", label: "Market" },
  { value: "metric", label: "Metric" },
  { value: "customer", label: "Customer" },
  { value: "competitor", label: "Competitor" },
] as const;

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    market: "bg-[#D5DDE8] text-[#3C5E8B]",
    metric: "bg-[#E8E0D5] text-[#8B7A3C]",
    customer: "bg-[#D5E8D8] text-[#3C8B4E]",
    competitor: "bg-[#E8D5C8] text-[#8B5E3C]",
  };
  return map[cat] || "bg-[var(--surface-secondary)] text-[var(--text-secondary)]";
}

function runStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "complete" || s === "completed") return { cls: "bg-[#D5E8D8] text-[#3C8B4E]", icon: CheckCircle };
  if (s === "generating" || s === "running") return { cls: "bg-[#D5DDE8] text-[#3C5E8B]", icon: Clock };
  if (s === "failed") return { cls: "bg-[#E8D5D5] text-[var(--error)]", icon: AlertCircle };
  return { cls: "bg-[var(--surface-secondary)] text-[var(--text-muted)]", icon: Circle };
}

/* ── Main ── */

export function Connect() {
  const [tab, setTab] = useTabParam<Tab>("sources", ["sources", "knowledge", "definitions", "workflows", "agents"]);

  return (
    <div>
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Connect</h1>

      <div className="flex items-center gap-1 mt-6 border-b border-[var(--border)] overflow-x-auto">
        {([
          { id: "sources" as Tab, label: "Data Sources", icon: Database },
          { id: "knowledge" as Tab, label: "Knowledge Base", icon: Upload },
          { id: "definitions" as Tab, label: "Definitions", icon: Tag },
          { id: "workflows" as Tab, label: "Workflows", icon: Zap },
          { id: "agents" as Tab, label: "Agents", icon: Bot },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "sources" && <SourcesTab />}
        {tab === "knowledge" && <KnowledgeTab />}
        {tab === "definitions" && <DefinitionsTab />}
        {tab === "workflows" && <WorkflowsTab />}
        {tab === "agents" && <AgentsTab onSwitchTab={() => setTab("workflows")} />}
      </div>
    </div>
  );
}

/* ── Data Sources ── */

function SourcesTab() {
  const [, setLocation] = useLocation();
  const { data: profile } = useGetCompanyProfile({ query: { queryKey: getGetCompanyProfileQueryKey() } });
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    fetch("/api/connectors/accounts/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setConnections(d.accounts || []))
      .catch(() => {});
  }, []);

  const p = profile as unknown as Record<string, string> | undefined;

  return (
    <div className="space-y-6">
      {/* Company profile card */}
      {p && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-heading-sm text-[var(--text-primary)]">Company Profile</h3>
            <button
              onClick={() => setLocation("/settings")}
              className="flex items-center gap-1.5 text-caption text-[var(--accent)] font-medium hover:underline"
            >
              <Settings className="h-3 w-3" />
              Edit in Settings
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            {p.companyName && (
              <div>
                <span className="text-[var(--text-muted)]">Company:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.companyName}</span>
              </div>
            )}
            {p.industry && (
              <div>
                <span className="text-[var(--text-muted)]">Industry:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.industry}</span>
              </div>
            )}
            {p.stage && (
              <div>
                <span className="text-[var(--text-muted)]">Stage:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.stage}</span>
              </div>
            )}
            {p.revenueRange && (
              <div>
                <span className="text-[var(--text-muted)]">Revenue:</span>{" "}
                <span className="text-[var(--text-primary)]">{p.revenueRange}</span>
              </div>
            )}
          </div>
          {!p.companyName && (
            <p className="text-caption text-[var(--text-muted)] mt-2">
              No company profile set up yet.{" "}
              <button onClick={() => setLocation("/settings")} className="text-[var(--accent)] hover:underline">
                Configure now
              </button>
            </p>
          )}
        </div>
      )}

      {/* Integrations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-sm text-[var(--text-primary)]">Integrations</h3>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Connection
          </button>
        </div>
        {connections.length === 0 ? (
          <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">
            No connections yet. Connect Salesforce, Gong, HubSpot, and more.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                  {c.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                  <p className="text-caption text-[var(--text-muted)]">{c.category}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      c.status === "active" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
                    }`}
                  />
                  <span
                    className={`text-caption ${
                      c.status === "active" ? "text-[var(--success)]" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Knowledge Base ── */

function KnowledgeTab() {
  const { data: docs = [], refetch } = useListDocuments({ query: { queryKey: getListDocumentsQueryKey() } });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setUploadProgress(`Uploading ${file.name}...`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.ok) {
          setUploadProgress("Upload complete. Processing...");
          await refetch();
          setUploadProgress(null);
        } else {
          setUploadProgress(`Upload failed: ${res.statusText}`);
          setTimeout(() => setUploadProgress(null), 3000);
        }
      } catch {
        setUploadProgress("Upload failed. Please try again.");
        setTimeout(() => setUploadProgress(null), 3000);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [refetch]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-[var(--text-secondary)]">
          Upload documents to build your knowledge base.
        </p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-body-sm text-[var(--accent)]">
          <div className="h-3 w-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          {uploadProgress}
        </div>
      )}

      {/* Document list */}
      {(docs as Array<{ id: number; title: string; chunkCount?: number }>).length === 0 ? (
        <p className="text-body-sm text-[var(--text-muted)] py-12 text-center">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {(docs as Array<{ id: number; title: string; chunkCount?: number }>).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <FileText className="h-4 w-4 text-[var(--accent)] shrink-0" />
              <p className="text-body-sm font-medium text-[var(--text-primary)] truncate flex-1">
                {d.title}
              </p>
              {d.chunkCount != null && (
                <span className="text-caption text-[var(--text-muted)] shrink-0">
                  {d.chunkCount} chunks
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Definitions ── */

const DEFINITIONS_STORAGE_KEY = "stratix:definitions";

function loadDefinitions(): Definition[] {
  try {
    const raw = localStorage.getItem(DEFINITIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore parse errors */ }
  return DEFAULT_DEFINITIONS;
}

function persistDefinitions(defs: Definition[]) {
  try { localStorage.setItem(DEFINITIONS_STORAGE_KEY, JSON.stringify(defs)); } catch { /* quota errors */ }
}

function DefinitionsTab() {
  const [definitions, setDefinitions] = useState<Definition[]>(loadDefinitions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ term: "", value: "", category: "market" as Definition["category"] });

  const resetForm = () => {
    setForm({ term: "", value: "", category: "market" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.term.trim() || !form.value.trim()) return;
    if (editingId) {
      setDefinitions((prev) => {
        const next = prev.map((d) => (d.id === editingId ? { ...d, ...form } : d));
        persistDefinitions(next);
        return next;
      });
    } else {
      setDefinitions((prev) => {
        const next = [...prev, { id: `def-${Date.now()}`, ...form }];
        persistDefinitions(next);
        return next;
      });
    }
    resetForm();
  };

  const handleEdit = (def: Definition) => {
    setForm({ term: def.term, value: def.value, category: def.category });
    setEditingId(def.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDefinitions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persistDefinitions(next);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-[var(--text-secondary)]">
          Define terms, metrics, and competitors so AI understands your business language.
        </p>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Definition
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/30 bg-[var(--surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-body-sm font-medium text-[var(--text-primary)]">
              {editingId ? "Edit Definition" : "New Definition"}
            </h4>
            <button onClick={resetForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Term (e.g. CAC, LTV)"
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            placeholder="Definition or value..."
            rows={2}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Definition["category"] }))}
              className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={resetForm}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] text-body-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.term.trim() || !form.value.trim()}
              className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Definition list */}
      {definitions.length === 0 ? (
        <p className="text-body-sm text-[var(--text-muted)] py-12 text-center">No definitions yet.</p>
      ) : (
        <div className="space-y-2">
          {definitions.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-body-sm font-medium text-[var(--text-primary)]">{d.term}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${categoryColor(d.category)}`}>
                    {d.category}
                  </span>
                </div>
                <p className="text-caption text-[var(--text-secondary)]">{d.value}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(d)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Workflows ── */

function WorkflowsTab() {
  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/workflows/templates", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/workflows", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([tplResult, runsResult]) => {
      if (tplResult.status === "fulfilled") {
        const raw = tplResult.value;
        setTemplates(Array.isArray(raw) ? raw : raw?.templates || []);
      }
      if (runsResult.status === "fulfilled") {
        const raw = runsResult.value;
        setRuns(Array.isArray(raw) ? raw : raw?.workflows || []);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Templates</h3>
        {templates.length === 0 ? (
          <p className="text-body-sm text-[var(--text-muted)] py-8 text-center">No workflow templates available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div
                key={t.key}
                onClick={() => setLocation(`/connect/workflows/${t.key}`)}
                className="p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-body-sm font-medium text-[var(--text-primary)]">{t.name}</h4>
                    <p className="text-caption text-[var(--text-secondary)] mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setLocation(`/connect/workflows/${t.key}`); }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors w-full justify-center"
                >
                  <Play className="h-3 w-3" />
                  Run
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run history */}
      {runs.length > 0 && (
        <div>
          <h3 className="text-heading-sm text-[var(--text-primary)] mb-3">Run History</h3>
          <div className="space-y-2">
            {runs.map((r) => {
              const badge = runStatusBadge(r.status);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <badge.icon className="h-4 w-4 shrink-0" style={{ color: "currentColor" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{r.title}</p>
                    <p className="text-caption text-[var(--text-muted)]">
                      {r.createdAt && format(new Date(r.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.cls}`}>
                    {r.status}
                  </span>
                  <button
                    onClick={() => setLocation(`/connect/workflows/${r.id}`)}
                    className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-caption text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
                    title="View run"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Agents ── */

function AgentsTab({ onSwitchTab }: { onSwitchTab: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bot className="h-10 w-10 text-[var(--text-muted)] mb-4" />
      <h3 className="font-editorial text-[22px] text-[var(--text-primary)]">Agents Coming Soon</h3>
      <p className="text-body text-[var(--text-secondary)] mt-1 max-w-md">
        Autonomous agents will continuously monitor your market, track competitors, generate reports,
        and execute workflows on your behalf -- all powered by the data you connect.
      </p>
      <button
        onClick={onSwitchTab}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
      >
        <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
        Use Workflows Instead
        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>
    </div>
  );
}

/* ── format helper (inline to avoid extra import in workflows) ── */
function format(date: Date, fmt: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return fmt
    .replace("MMM", months[date.getMonth()])
    .replace("d", String(date.getDate()))
    .replace("yyyy", String(date.getFullYear()));
}
