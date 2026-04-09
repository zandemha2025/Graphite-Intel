import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useReactiveCells } from "@/hooks/use-reactive-cells";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Save, Plus, Play, Trash2, Globe, Share2, Loader2,
  CheckCircle2, GripVertical, Sparkles, Database, ArrowDown,
  Link2, ChevronDown, AlertTriangle, RefreshCw, Zap,
} from "lucide-react";

/* -- Types -- */
type CellType = "markdown" | "code" | "sql" | "ai";
type CellStatus = "idle" | "running" | "done" | "error" | "stale";

interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
  aiGenerated?: string;
  status?: CellStatus;
  dependencies?: string[];
}

interface Notebook {
  id: number;
  title: string;
  description: string | null;
  cells: Cell[];
}

const CELL_TYPES: { value: CellType; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "code", label: "Code" },
  { value: "sql", label: "SQL" },
  { value: "ai", label: "AI" },
];

/* -- Helpers -- */
const setCellState = (
  setter: React.Dispatch<React.SetStateAction<Cell[]>>,
  cellId: string,
  patch: Partial<Cell>
) => setter((prev) => prev.map((c) => (c.id === cellId ? { ...c, ...patch } : c)));

/* -- NotebookEdit -- */
export function NotebookEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/build/notebooks/:id");
  const { toast } = useToast();

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [cells, setCells] = useState<Cell[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [autoRecompute, setAutoRecompute] = useState(false);
  const [recomputeProgress, setRecomputeProgress] = useState<string | null>(null);
  const [hoveredDepBadge, setHoveredDepBadge] = useState<string | null>(null);

  const patchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const addMenuRef = useRef<HTMLDivElement>(null);
  const id = params?.id;

  const { dependencyMap, upstreamMap, getDependencyChain, executionOrder } =
    useReactiveCells(cells);

  const cellIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    cells.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [cells]);

  const highlightedCellIds = useMemo(() => {
    if (!hoveredDepBadge) return new Set<string>();
    return new Set(upstreamMap.get(hoveredDepBadge) || []);
  }, [hoveredDepBadge, upstreamMap]);

  /* Fetch notebook */
  useEffect(() => {
    if (!id) return;
    fetch(`/api/notebooks/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNotebook(data);
          setTitle(data.title);
          setCells((data.cells ?? []).map((c: Cell) => ({ ...c, status: "idle" as const })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  /* Close add-cell menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "s") { e.preventDefault(); handleSave(); return; }
      if (meta && e.shiftKey && e.key === "Enter") { e.preventDefault(); runAll(); return; }
      if (meta && !e.shiftKey && e.key === "Enter") {
        const active = document.activeElement;
        if (active && active.getAttribute("data-cell-id")) {
          e.preventDefault();
          runCell(active.getAttribute("data-cell-id")!);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [id, cells, toast]);

  /* -- Core cell execution (no cascade) -- */
  const executeSingleCell = useCallback(
    async (cellId: string): Promise<void> => {
      if (!id) return;
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) return;
      setCellState(setCells, cellId, { status: "running" });

      if (cell.type === "ai") {
        const res = await fetch(`/api/notebooks/${id}/cells/${cellId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ prompt: cell.content }),
        });
        if (!res.ok) {
          setCellState(setCells, cellId, { output: "Execution failed", status: "error" });
          throw new Error("AI generation failed");
        }
        const data = await res.json();
        setCellState(setCells, cellId, {
          aiGenerated: data.code ?? "",
          output: `[${data.language ?? "code"}]\n${data.code ?? ""}`,
          status: "done",
        });
      } else {
        const res = await fetch(`/api/notebooks/${id}/cells/${cellId}/execute`, {
          method: "POST", credentials: "include",
        });
        if (!res.ok) {
          setCellState(setCells, cellId, { output: "Execution failed", status: "error" });
          throw new Error("Execution failed");
        }
        const data = await res.json();
        setCellState(setCells, cellId, {
          output: data.output ?? data.result ?? "",
          status: "done",
        });
      }
    },
    [id, cells]
  );

  /* Mark downstream stale */
  const markDownstreamStale = useCallback(
    (cellId: string) => {
      const chain = getDependencyChain(cellId);
      if (chain.length === 0) return;
      setCells((prev) =>
        prev.map((c) =>
          chain.includes(c.id) && c.status !== "running" ? { ...c, status: "stale" as const } : c
        )
      );
    },
    [getDependencyChain]
  );

  /* Auto-recompute stale downstream */
  const recomputeStaleChain = useCallback(
    async (cellId: string) => {
      const chain = getDependencyChain(cellId);
      if (chain.length === 0) return;
      setRecomputeProgress(`Re-computing ${chain.length} cell${chain.length !== 1 ? "s" : ""}...`);
      for (const depId of chain) {
        try {
          await executeSingleCell(depId);
        } catch {
          setCells((prev) =>
            prev.map((c) =>
              chain.includes(c.id) && c.status === "stale" ? { ...c, status: "error" as const } : c
            )
          );
          break;
        }
      }
      setRecomputeProgress(null);
    },
    [getDependencyChain, executeSingleCell]
  );

  /* Run single cell with cascade */
  const runCell = useCallback(
    async (cellId: string) => {
      try {
        await executeSingleCell(cellId);
        markDownstreamStale(cellId);
        if (autoRecompute) await recomputeStaleChain(cellId);
      } catch {
        toast({ title: "Cell execution failed", variant: "destructive" });
      }
    },
    [executeSingleCell, markDownstreamStale, autoRecompute, recomputeStaleChain, toast]
  );

  /* Save */
  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, cells }),
      });
      toast({ title: "Saved" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  }, [id, title, cells, toast]);

  const addCell = useCallback(async (type: CellType = "markdown") => {
    if (!id) return;
    setAddMenuOpen(false);
    try {
      const res = await fetch(`/api/notebooks/${id}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, content: "" }),
      });
      if (!res.ok) throw new Error();
      const newCell = await res.json();
      setCells((prev) => [...prev, { ...newCell, status: "idle" as const, output: "" }]);
    } catch { toast({ title: "Failed to add cell", variant: "destructive" }); }
  }, [id, toast]);

  const deleteCell = useCallback(async (cellId: string) => {
    if (!id) return;
    setCells((prev) => prev.filter((c) => c.id !== cellId));
    try {
      const res = await fetch(`/api/notebooks/${id}/cells/${cellId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
    } catch { toast({ title: "Failed to delete cell", variant: "destructive" }); }
  }, [id, toast]);

  const updateCellContent = useCallback((cellId: string, content: string) => {
    setCellState(setCells, cellId, { content });
    if (patchTimers.current[cellId]) clearTimeout(patchTimers.current[cellId]);
    patchTimers.current[cellId] = setTimeout(async () => {
      if (!id) return;
      try {
        await fetch(`/api/notebooks/${id}/cells/${cellId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ content }),
        });
      } catch { /* silent */ }
    }, 800);
  }, [id]);

  const updateCellType = useCallback((cellId: string, newType: CellType) => {
    setCellState(setCells, cellId, { type: newType });
    if (!id) return;
    fetch(`/api/notebooks/${id}/cells/${cellId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ type: newType }),
    }).catch(() => {});
  }, [id]);

  /* Run all */
  const runAll = useCallback(async () => {
    if (!id) return;
    setRunningAll(true);
    setCells((prev) => prev.map((c) => ({ ...c, status: "running" as const })));
    try {
      const res = await fetch(`/api/notebooks/${id}/execute`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const outputs: Array<{ id?: string; cellId?: string; output?: string; result?: string }> =
        data.cells ?? data.results ?? data.outputs ?? [];
      setCells((prev) =>
        prev.map((c, idx) => {
          const match = outputs.find((o) => o.id === c.id || o.cellId === c.id);
          const byIdx = outputs[idx];
          const val = match?.output ?? match?.result ?? byIdx?.output ?? byIdx?.result ?? "";
          return { ...c, output: String(val), status: "done" as const };
        })
      );
      toast({ title: "All cells executed" });
    } catch {
      setCells((prev) => prev.map((c) => ({ ...c, status: "error" as const })));
      toast({ title: "Execution failed", variant: "destructive" });
    } finally { setRunningAll(false); }
  }, [id, toast]);

  /* Publish & Share */
  const handlePublish = useCallback(async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/notebooks/${id}/publish`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: "Notebook published" });
    } catch { toast({ title: "Publish failed", variant: "destructive" }); }
    finally { setPublishing(false); }
  }, [id, toast]);

  const handleShare = useCallback(async () => {
    if (!id) return;
    setSharing(true);
    try {
      const res = await fetch("/api/sharing/share", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resourceType: "notebook", resourceId: id, sharedWith: [], permission: "view" }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Share link created" });
    } catch { toast({ title: "Share failed", variant: "destructive" }); }
    finally { setSharing(false); }
  }, [id, toast]);

  /* Drag-and-drop reorder */
  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDropTargetId(null); return; }
    setCells((prev) => {
      const from = prev.findIndex((c) => c.id === dragId);
      const to = prev.findIndex((c) => c.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
    setDropTargetId(null);
    if (id) {
      setTimeout(() => {
        setCells((cur) => {
          fetch(`/api/notebooks/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            credentials: "include", body: JSON.stringify({ cells: cur }),
          }).catch(() => {});
          return cur;
        });
      }, 100);
    }
  }, [dragId, id]);

  /* Loading / not found */
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-10 w-96 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] animate-pulse" />
        <div className="h-64 w-full rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] animate-pulse" />
      </div>
    );
  }
  if (!notebook) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-body text-[var(--text-muted)]">Notebook not found</p>
      </div>
    );
  }

  /* Style maps */
  const typeBadgeColor: Record<string, string> = {
    markdown: "bg-[var(--accent)]/10 text-[var(--accent)]",
    code: "bg-[var(--success)]/10 text-[var(--success)]",
    sql: "bg-[#D5DDE8] text-[#3C5E8B]",
    ai: "bg-[#E0D5E8] text-[#6B3C8B]",
  };
  const typePlaceholder: Record<string, string> = {
    markdown: "Write markdown... (use @prev or {{cell-N}} for deps)",
    code: "Write code... (use @prev or $cell[N] for deps)",
    sql: "Write SQL query...",
    ai: "Describe what you want to generate...",
  };
  const typeIcon: Record<string, React.ReactNode> = {
    sql: <Database className="h-3 w-3" />,
    ai: <Sparkles className="h-3 w-3" />,
  };
  const statusBorder = (s?: CellStatus) => {
    if (s === "running") return "border-l-2 border-l-[var(--accent)]";
    if (s === "done") return "border-l-2 border-l-[var(--success)]";
    if (s === "error") return "border-l-2 border-l-[var(--error)]";
    if (s === "stale") return "border-l-2 border-l-[#D4A017]";
    return "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/build")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="border-none bg-transparent text-[17px] font-semibold text-[var(--text-primary)] p-0 h-auto focus:outline-none focus:ring-0 w-64" placeholder="Untitled Notebook" />
          <span className="text-[12px] text-[var(--text-muted)]">{cells.length} cell{cells.length !== 1 ? "s" : ""}</span>
          {saved && <span className="text-[12px] text-[var(--success)]">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRecompute((v) => !v)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors border ${autoRecompute ? "bg-[#D4A017]/10 text-[#D4A017] border-[#D4A017]/30" : "bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]"}`} title="Auto-recompute downstream cells after execution">
            <Zap className="h-3 w-3" />Auto
          </button>
          <Button variant="outline" size="sm" onClick={runAll} disabled={runningAll}>
            {runningAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            {runningAll ? "Running..." : "Run All"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePublish} disabled={publishing}>
            <Globe className="h-3.5 w-3.5 mr-1.5" />{publishing ? "Publishing..." : "Publish"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Recompute progress */}
      {recomputeProgress && (
        <div className="shrink-0 flex items-center gap-2 px-6 py-2 bg-[#D4A017]/10 border-b border-[#D4A017]/20">
          <RefreshCw className="h-3.5 w-3.5 text-[#D4A017] animate-spin" />
          <span className="text-[12px] font-medium text-[#D4A017]">{recomputeProgress}</span>
        </div>
      )}

      {/* Cells */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {cells.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-[var(--text-muted)] mb-4">This notebook is empty.</p>
              <Button variant="outline" size="sm" onClick={() => addCell("markdown")}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Cell
              </Button>
            </div>
          ) : (
            cells.map((cell, cellIdx) => {
              const ups = upstreamMap.get(cell.id) || [];
              const downs = dependencyMap.get(cell.id) || [];
              const tier = executionOrder.get(cell.id) ?? 1;
              const isHighlighted = highlightedCellIds.has(cell.id);
              const isDropTarget = dropTargetId === cell.id && dragId !== cell.id;

              return (
                <div
                  key={cell.id}
                  className={`group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all ${statusBorder(cell.status)} ${dragId === cell.id ? "opacity-50" : ""} ${isDropTarget ? "ring-2 ring-[var(--accent)] ring-offset-1" : ""} ${isHighlighted ? "ring-2 ring-[var(--accent)]/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]" : ""}`}
                  draggable
                  onDragStart={() => setDragId(cell.id)}
                  onDragOver={(e) => { e.preventDefault(); setDropTargetId(cell.id); }}
                  onDragLeave={() => setDropTargetId(null)}
                  onDrop={() => handleDrop(cell.id)}
                  onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab opacity-0 group-hover:opacity-100 text-[var(--text-muted)] transition-opacity">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] font-mono w-4 text-center">{cellIdx}</span>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[8px] font-bold" title={`Execution tier ${tier}`}>{tier}</span>
                      <div className="relative">
                        <select value={cell.type} onChange={(e) => updateCellType(cell.id, e.target.value as CellType)} className={`appearance-none cursor-pointer inline-flex items-center pl-2 pr-5 py-0.5 rounded-[var(--radius-sm)] text-[9px] font-medium uppercase tracking-wide border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 ${typeBadgeColor[cell.type] ?? "text-[var(--text-muted)]"}`}>
                          {CELL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none opacity-50" />
                      </div>
                      {typeIcon[cell.type] && <span className={typeBadgeColor[cell.type]}>{typeIcon[cell.type]}</span>}
                      {cell.status === "running" && <Loader2 className="h-3 w-3 text-[var(--accent)] animate-spin" />}
                      {cell.status === "done" && <CheckCircle2 className="h-3 w-3 text-[var(--success)]" />}
                      {cell.status === "error" && <span className="text-[9px] text-[var(--error)] font-medium">Error</span>}
                      {cell.status === "stale" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[#D4A017]/10 text-[#D4A017] text-[9px] font-medium">
                          <AlertTriangle className="h-2.5 w-2.5" />Stale -- re-run to update
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => runCell(cell.id)} disabled={cell.status === "running"} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all disabled:opacity-50" title={cell.type === "ai" ? "Generate" : "Run cell (Cmd+Enter)"}>
                        {cell.type === "ai" ? <Sparkles className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </button>
                      <button onClick={() => deleteCell(cell.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Dependency badges */}
                  {(ups.length > 0 || downs.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 px-4 py-1.5 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50" onMouseEnter={() => setHoveredDepBadge(cell.id)} onMouseLeave={() => setHoveredDepBadge(null)}>
                      {ups.map((uid) => (
                        <span key={uid} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[#D5DDE8]/50 text-[#3C5E8B] text-[8px] font-medium">
                          <Link2 className="h-2 w-2" />depends on Cell {cellIndexMap.get(uid) ?? "?"}
                        </span>
                      ))}
                      {downs.map((did) => (
                        <span key={did} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[#E0D5E8]/50 text-[#6B3C8B] text-[8px] font-medium">
                          <ArrowDown className="h-2 w-2" />feeds Cell {cellIndexMap.get(did) ?? "?"}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <textarea value={cell.content} onChange={(e) => updateCellContent(cell.id, e.target.value)} data-cell-id={cell.id} placeholder={typePlaceholder[cell.type] ?? "Write..."} rows={Math.max(3, cell.content.split("\n").length)} className={`w-full bg-transparent text-[13px] text-[var(--text-primary)] resize-none focus:outline-none placeholder:text-[var(--text-muted)] ${cell.type === "markdown" ? "font-sans" : "font-mono"}`} />
                  </div>

                  {/* AI generated output */}
                  {cell.type === "ai" && cell.aiGenerated && (
                    <div className="px-4 pb-3 border-t border-[var(--border)]">
                      <div className="mt-2">
                        <span className="text-[9px] font-medium uppercase tracking-wide text-[#6B3C8B] mb-1 block">Generated Code</span>
                        <div className="p-3 rounded-[var(--radius-md)] bg-[#E0D5E8]/10 text-[12px] font-mono text-[var(--text-primary)] whitespace-pre-wrap border border-[#E0D5E8]/30">{cell.aiGenerated}</div>
                      </div>
                    </div>
                  )}

                  {/* Standard output */}
                  {cell.output && !(cell.type === "ai" && cell.aiGenerated) && (
                    <div className="px-4 pb-3 border-t border-[var(--border)]">
                      <div className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] text-[12px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap">{cell.output}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add Cell dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button onClick={() => setAddMenuOpen((p) => !p)} className="w-full py-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)] transition-colors flex items-center justify-center gap-1">
              <Plus className="h-3.5 w-3.5" />Add Cell<ChevronDown className="h-3 w-3 ml-0.5" />
            </button>
            {addMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-lg z-10 py-1">
                {CELL_TYPES.map((t) => (
                  <button key={t.value} onClick={() => addCell(t.value)} className="w-full text-left px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-[var(--radius-sm)] text-[10px] ${typeBadgeColor[t.value]}`}>
                      {t.value === "ai" ? <Sparkles className="h-3 w-3" /> : t.value === "sql" ? <Database className="h-3 w-3" /> : t.value === "code" ? <span className="font-mono font-bold">{"{}"}</span> : <span className="font-bold">M</span>}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
