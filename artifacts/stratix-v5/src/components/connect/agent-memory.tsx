import { useState, useEffect } from "react";
import {
  Brain, X, Plus, Trash2, Loader2, CheckCircle, Clock, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */

export interface AgentMemoryProps {
  agentId: string;
  open: boolean;
  onClose: () => void;
}

type MemoryItem = {
  id: string;
  text: string;
  source: "auto-learned" | "user-corrected" | "manual";
  createdAt: string;
  original?: string;
};

/* ── Inline date format helper ── */
function formatDate(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(dateStr);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sourceLabel(source: string): { text: string; cls: string } {
  if (source === "auto-learned") return { text: "Auto-learned", cls: "bg-[#D5DDE8] text-[#3C5E8B]" };
  if (source === "user-corrected") return { text: "User corrected", cls: "bg-[#E8E0D5] text-[#8B7A3C]" };
  return { text: "Manual", cls: "bg-[#D5E8D8] text-[#3C8B4E]" };
}

/* ── Component ── */

export function AgentMemory({ agentId, open, onClose }: AgentMemoryProps) {
  const { toast } = useToast();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingMemory, setAddingMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open || !agentId) return;
    setLoading(true);
    fetch(`/api/agents/${agentId}/memory`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { memories: [] }))
      .then((data) => {
        const items: MemoryItem[] = Array.isArray(data) ? data : data?.memories || data?.items || [];
        setMemories(items);
      })
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  }, [open, agentId]);

  if (!open) return null;

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/memory`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMemoryText.trim(), source: "manual" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newItem: MemoryItem = data.memory || {
          id: data.id || crypto.randomUUID(),
          text: newMemoryText.trim(),
          source: "manual",
          createdAt: new Date().toISOString(),
        };
        setMemories((prev) => [newItem, ...prev]);
        setNewMemoryText("");
        setAddingMemory(false);
        toast({ title: "Memory added", duration: 2000 });
      } else {
        toast({ title: "Failed to add memory", description: res.statusText, duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Could not add memory.", duration: 2000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    setDeletingId(memoryId);
    try {
      const res = await fetch(`/api/agents/${agentId}/memory/${memoryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== memoryId));
        toast({ title: "Memory removed", duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Could not delete memory.", duration: 2000 });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/memory`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMemories([]);
        setConfirmClear(false);
        toast({ title: "All memories cleared", duration: 2000 });
      }
    } catch {
      toast({ title: "Error", description: "Could not clear memories.", duration: 2000 });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[560px] max-h-[80vh] flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center">
              <Brain className="h-4.5 w-4.5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="font-editorial text-[17px] text-[var(--text-primary)]">Agent Memory</h3>
              <p className="text-caption text-[var(--text-secondary)]">{memories.length} learned patterns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 text-[var(--text-muted)] animate-spin" />
              <span className="ml-2 text-body-sm text-[var(--text-muted)]">Loading memories...</span>
            </div>
          ) : memories.length === 0 && !addingMemory ? (
            <div className="text-center py-10">
              <Brain className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-body-sm text-[var(--text-muted)] mb-1">No memories yet</p>
              <p className="text-caption text-[var(--text-muted)]">This agent will learn from interactions, or you can teach it manually.</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Timeline list */}
              {memories.map((mem) => {
                const src = sourceLabel(mem.source);
                return (
                  <div
                    key={mem.id}
                    className="relative pl-5 pb-4 border-l-2 border-[var(--border)] last:border-l-transparent group"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-[var(--accent)]" />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-[var(--text-primary)] leading-relaxed">{mem.text}</p>
                        {mem.source === "user-corrected" && mem.original && (
                          <p className="text-[11px] text-[var(--text-muted)] mt-1 italic line-through">
                            {mem.original}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${src.cls}`}>
                            {src.text}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {formatDate(mem.createdAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        disabled={deletingId === mem.id}
                        className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--error,#c44)] transition-all disabled:opacity-50"
                        title="Remove memory"
                      >
                        {deletingId === mem.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add memory inline form */}
          {addingMemory && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--surface)] p-4">
              <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">Teach this agent</label>
              <textarea
                rows={2}
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="e.g. Company fiscal year starts April 1"
                className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAddMemory}
                  disabled={submitting || !newMemoryText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-caption font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Save
                </button>
                <button
                  onClick={() => { setAddingMemory(false); setNewMemoryText(""); }}
                  className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] text-caption font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => setAddingMemory(true)}
            disabled={addingMemory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-caption font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-50"
          >
            <Plus className="h-3 w-3" /> Add Memory
          </button>

          {memories.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-caption text-[var(--text-muted)]">Clear all?</span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--error,#c44)] text-white text-[11px] font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] text-caption text-[var(--text-muted)] hover:text-[var(--error,#c44)] transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear Memory
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
