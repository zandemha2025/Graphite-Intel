import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Play, Trash2 } from "lucide-react";

/* ── Types ── */

interface Cell {
  id: string;
  type: "markdown" | "code" | "output";
  content: string;
}

interface Notebook {
  id: number;
  title: string;
  description: string | null;
  cells: Cell[];
}

/* ── NotebookEdit ── */

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

  const id = params?.id;

  /* Fetch notebook */
  useEffect(() => {
    if (!id) return;
    fetch(`/api/notebooks/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNotebook(data);
          setTitle(data.title);
          setCells(data.cells ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [id, title, cells, toast]);

  /* Cell operations */
  const addCell = () => {
    const newCell: Cell = {
      id: `cell-${Date.now()}`,
      type: "markdown",
      content: "",
    };
    setCells((prev) => [...prev, newCell]);
  };

  const deleteCell = (cellId: string) => {
    setCells((prev) => prev.filter((c) => c.id !== cellId));
  };

  const updateCellContent = (cellId: string, content: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, content } : c))
    );
  };

  /* Loading state */
  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-10 w-96 rounded-[var(--radius-md)] bg-[var(--surface-secondary)] animate-pulse" />
        <div className="h-64 w-full rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] animate-pulse" />
      </div>
    );
  }

  /* Not found */
  if (!notebook) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-body text-[var(--text-muted)]">Notebook not found</p>
      </div>
    );
  }

  const typeBadgeColor: Record<string, string> = {
    markdown: "bg-[var(--accent)]/10 text-[var(--accent)]",
    code: "bg-[var(--success)]/10 text-[var(--success)]",
    output: "bg-[var(--warning)]/10 text-[var(--warning)]",
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/build")}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-none bg-transparent text-[17px] font-semibold text-[var(--text-primary)] p-0 h-auto focus:outline-none focus:ring-0 w-64"
            placeholder="Untitled Notebook"
          />
          <span className="text-[12px] text-[var(--text-muted)]">
            {cells.length} cell{cells.length !== 1 ? "s" : ""}
          </span>
          {saved && <span className="text-[12px] text-[var(--success)]">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: "Cell execution coming soon" })}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Run All
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* ── Cells ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {cells.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] text-[var(--text-muted)] mb-4">
                This notebook is empty.
              </p>
              <Button variant="outline" size="sm" onClick={addCell}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Cell
              </Button>
            </div>
          ) : (
            cells.map((cell) => (
              <div
                key={cell.id}
                className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
              >
                {/* Cell header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[9px] font-medium uppercase tracking-wide ${typeBadgeColor[cell.type] ?? "text-[var(--text-muted)]"}`}
                  >
                    {cell.type}
                  </span>
                  <button
                    onClick={() => deleteCell(cell.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {/* Cell content */}
                <div className="p-4">
                  <textarea
                    value={cell.content}
                    onChange={(e) => updateCellContent(cell.id, e.target.value)}
                    placeholder={
                      cell.type === "markdown"
                        ? "Write markdown..."
                        : cell.type === "code"
                          ? "Write code..."
                          : "Output will appear here..."
                    }
                    rows={Math.max(3, cell.content.split("\n").length)}
                    className="w-full bg-transparent text-[13px] text-[var(--text-primary)] font-mono resize-none focus:outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
            ))
          )}

          {/* Add Cell button */}
          <button
            onClick={addCell}
            className="w-full py-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5 inline mr-1" />
            Add Cell
          </button>
        </div>
      </div>
    </div>
  );
}
