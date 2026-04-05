import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Play,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Globe,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Save,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotebookCell {
  id: number;
  notebookId: number;
  cellIndex: number;
  title: string;
  prompt: string;
  output: string | null;
  status: string;
  dataSourceHint: string | null;
  lastExecutedAt: string | null;
  tokensCost: number | null;
}

interface Notebook {
  id: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  refreshSchedule: string | null;
  lastRefreshedAt: string | null;
  cells: NotebookCell[];
}

const DATA_SOURCES = [
  { value: "", label: "Any" },
  { value: "salesforce", label: "Salesforce" },
  { value: "gong", label: "Gong" },
  { value: "hubspot", label: "HubSpot" },
  { value: "google_analytics", label: "Google Analytics" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "internal", label: "Internal Data" },
];

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: "var(--workspace-muted)", label: "Pending" },
  running: { icon: Loader2, color: "rgb(59,130,246)", label: "Running" },
  complete: { icon: CheckCircle2, color: "rgb(34,197,94)", label: "Complete" },
  failed: { icon: XCircle, color: "rgb(239,68,68)", label: "Failed" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotebookEdit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/notebooks/:id");
  const notebookId = params?.id ? parseInt(params.id) : null;

  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningCellId, setRunningCellId] = useState<number | null>(null);
  const [streamingOutput, setStreamingOutput] = useState<Record<number, string>>({});

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch notebook
  // ---------------------------------------------------------------------------

  const fetchNotebook = useCallback(async () => {
    if (!notebookId || isNaN(notebookId)) return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}`, { credentials: "include" });
      if (res.ok) {
        setNotebook(await res.json());
      } else {
        toast({ title: "Notebook not found", variant: "destructive" });
        setLocation("/notebooks");
      }
    } catch {
      toast({ title: "Failed to load notebook", variant: "destructive" });
    }
    setLoading(false);
  }, [notebookId]);

  useEffect(() => {
    fetchNotebook();
  }, [fetchNotebook]);

  // ---------------------------------------------------------------------------
  // Auto-save (debounced)
  // ---------------------------------------------------------------------------

  const saveNotebookMeta = useCallback(
    async (updates: { title?: string; description?: string; refreshSchedule?: string }) => {
      if (!notebookId) return;
      try {
        await fetch(`/api/notebooks/${notebookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        });
      } catch {}
    },
    [notebookId],
  );

  const debouncedSaveMeta = useCallback(
    (updates: { title?: string; description?: string }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveNotebookMeta(updates), 800);
    },
    [saveNotebookMeta],
  );

  const saveCellUpdate = useCallback(
    async (cellId: number, updates: { prompt?: string; title?: string; dataSourceHint?: string }) => {
      if (!notebookId) return;
      try {
        await fetch(`/api/notebooks/${notebookId}/cells/${cellId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        });
      } catch {}
    },
    [notebookId],
  );

  const debouncedSaveCell = useCallback(
    (cellId: number, updates: { prompt?: string; title?: string }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveCellUpdate(cellId, updates), 800);
    },
    [saveCellUpdate],
  );

  // ---------------------------------------------------------------------------
  // Cell CRUD
  // ---------------------------------------------------------------------------

  const addCell = async () => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New Cell", prompt: "" }),
      });
      if (res.ok) {
        const cell = await res.json();
        setNotebook((prev) =>
          prev ? { ...prev, cells: [...prev.cells, cell] } : prev,
        );
      }
    } catch {
      toast({ title: "Failed to add cell", variant: "destructive" });
    }
  };

  const deleteCell = async (cellId: number) => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/cells/${cellId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchNotebook();
      }
    } catch {
      toast({ title: "Failed to delete cell", variant: "destructive" });
    }
  };

  const moveCell = async (cellId: number, direction: "up" | "down") => {
    if (!notebook) return;
    const cells = [...notebook.cells];
    const idx = cells.findIndex((c) => c.id === cellId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= cells.length) return;

    // Swap
    [cells[idx], cells[newIdx]] = [cells[newIdx], cells[idx]];

    // Update indexes locally
    const updated = cells.map((c, i) => ({ ...c, cellIndex: i }));
    setNotebook((prev) => (prev ? { ...prev, cells: updated } : prev));

    // Persist both
    await Promise.all([
      saveCellUpdate(cells[idx].id, {}),
      fetch(`/api/notebooks/${notebookId}/cells/${updated[idx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cellIndex: idx }),
      }),
      fetch(`/api/notebooks/${notebookId}/cells/${updated[newIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cellIndex: newIdx }),
      }),
    ]);
  };

  // ---------------------------------------------------------------------------
  // Execute single cell
  // ---------------------------------------------------------------------------

  const executeCell = async (cellId: number) => {
    if (!notebookId) return;
    setRunningCellId(cellId);
    setStreamingOutput((prev) => ({ ...prev, [cellId]: "" }));

    // Mark running locally
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: prev.cells.map((c) =>
          c.id === cellId ? { ...c, status: "running", output: null } : c,
        ),
      };
    });

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/cells/${cellId}/execute`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let event = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.slice(7);
          } else if (line.startsWith("data: ") && event) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(event, data);
            } catch {}
            event = "";
          }
        }
      }
    } catch {
      toast({ title: "Execution failed", variant: "destructive" });
    }

    setRunningCellId(null);
  };

  // ---------------------------------------------------------------------------
  // Execute all cells
  // ---------------------------------------------------------------------------

  const executeAll = async () => {
    if (!notebookId || !notebook) return;
    setRunningAll(true);
    setStreamingOutput({});

    // Mark all as running
    setNotebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: prev.cells.map((c) => ({ ...c, status: "running", output: null })),
      };
    });

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/execute`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let event = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.slice(7);
          } else if (line.startsWith("data: ") && event) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(event, data);
            } catch {}
            event = "";
          }
        }
      }
    } catch {
      toast({ title: "Execution failed", variant: "destructive" });
    }

    setRunningAll(false);
    // Refresh to get final state
    fetchNotebook();
  };

  // ---------------------------------------------------------------------------
  // SSE event handler
  // ---------------------------------------------------------------------------

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case "cell_content": {
        const { cellId, delta } = data;
        setStreamingOutput((prev) => ({
          ...prev,
          [cellId]: (prev[cellId] || "") + delta,
        }));
        break;
      }
      case "cell_complete": {
        const { cellId } = data;
        setNotebook((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cells: prev.cells.map((c) =>
              c.id === cellId
                ? { ...c, status: "complete", output: streamingOutput[cellId] || c.output }
                : c,
            ),
          };
        });
        // Move streaming output to cell output
        setStreamingOutput((prev) => {
          const updated = { ...prev };
          setNotebook((nb) => {
            if (!nb) return nb;
            return {
              ...nb,
              cells: nb.cells.map((c) =>
                c.id === cellId ? { ...c, output: updated[cellId] || c.output, status: "complete" } : c,
              ),
            };
          });
          delete updated[cellId];
          return updated;
        });
        break;
      }
      case "cell_error": {
        const { cellId } = data;
        setNotebook((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            cells: prev.cells.map((c) =>
              c.id === cellId ? { ...c, status: "failed" } : c,
            ),
          };
        });
        break;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Publish toggle
  // ---------------------------------------------------------------------------

  const togglePublish = async () => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        setNotebook((prev) => (prev ? { ...prev, isPublished: updated.isPublished } : prev));
        toast({ title: updated.isPublished ? "Published" : "Unpublished" });
      }
    } catch {
      toast({ title: "Failed to toggle publish", variant: "destructive" });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-5 h-5 border animate-spin"
          style={{ borderColor: "var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }}
        />
      </div>
    );
  }

  if (!notebook) return null;

  const isExecuting = runningAll || runningCellId !== null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => setLocation("/notebooks")}
        className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ color: "var(--workspace-muted)" }}
      >
        <ChevronLeft className="h-3 w-3" />
        All Notebooks
      </button>

      {/* Notebook header */}
      <div className="space-y-2">
        <input
          value={notebook.title}
          onChange={(e) => {
            setNotebook((prev) => (prev ? { ...prev, title: e.target.value } : prev));
            debouncedSaveMeta({ title: e.target.value });
          }}
          className="w-full text-xl font-sans font-medium tracking-tight bg-transparent border-none outline-none"
          style={{ color: "var(--workspace-fg)" }}
          placeholder="Notebook title..."
        />
        <input
          value={notebook.description || ""}
          onChange={(e) => {
            setNotebook((prev) => (prev ? { ...prev, description: e.target.value } : prev));
            debouncedSaveMeta({ description: e.target.value });
          }}
          className="w-full text-xs bg-transparent border-none outline-none"
          style={{ color: "var(--workspace-muted)" }}
          placeholder="Add a description..."
        />
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border"
        style={{ borderColor: "var(--workspace-border)" }}
      >
        <button
          onClick={executeAll}
          disabled={isExecuting || notebook.cells.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          style={{ background: "var(--workspace-fg)", color: "var(--workspace-bg)" }}
        >
          {runningAll ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Run All
        </button>

        <button
          onClick={togglePublish}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors"
          style={{
            borderColor: "var(--workspace-border)",
            color: notebook.isPublished ? "rgb(34,197,94)" : "var(--workspace-muted)",
          }}
        >
          <Globe className="h-3 w-3" />
          {notebook.isPublished ? "Published" : "Publish"}
        </button>

        <div className="flex-1" />

        {notebook.lastRefreshedAt && (
          <span
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--workspace-muted)" }}
          >
            <Clock className="h-3 w-3" />
            Last run: {new Date(notebook.lastRefreshedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Cells */}
      <div className="space-y-4">
        {notebook.cells.map((cell, idx) => (
          <CellEditor
            key={cell.id}
            cell={cell}
            isFirst={idx === 0}
            isLast={idx === notebook.cells.length - 1}
            isRunning={runningCellId === cell.id || (runningAll && cell.status === "running")}
            streamingContent={streamingOutput[cell.id]}
            onUpdateTitle={(title) => {
              setNotebook((prev) => {
                if (!prev) return prev;
                return { ...prev, cells: prev.cells.map((c) => (c.id === cell.id ? { ...c, title } : c)) };
              });
              debouncedSaveCell(cell.id, { title });
            }}
            onUpdatePrompt={(prompt) => {
              setNotebook((prev) => {
                if (!prev) return prev;
                return { ...prev, cells: prev.cells.map((c) => (c.id === cell.id ? { ...c, prompt } : c)) };
              });
              debouncedSaveCell(cell.id, { prompt });
            }}
            onUpdateDataSource={(ds) => {
              setNotebook((prev) => {
                if (!prev) return prev;
                return { ...prev, cells: prev.cells.map((c) => (c.id === cell.id ? { ...c, dataSourceHint: ds || null } : c)) };
              });
              saveCellUpdate(cell.id, { dataSourceHint: ds || "" });
            }}
            onExecute={() => executeCell(cell.id)}
            onMoveUp={() => moveCell(cell.id, "up")}
            onMoveDown={() => moveCell(cell.id, "down")}
            onDelete={() => deleteCell(cell.id)}
            disabled={isExecuting}
          />
        ))}
      </div>

      {/* Add cell */}
      <button
        onClick={addCell}
        className="flex items-center gap-2 w-full justify-center py-3 border border-dashed text-xs font-medium transition-colors hover:border-solid"
        style={{
          borderColor: "var(--workspace-border)",
          color: "var(--workspace-muted)",
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Cell
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell editor sub-component
// ---------------------------------------------------------------------------

interface CellEditorProps {
  cell: NotebookCell;
  isFirst: boolean;
  isLast: boolean;
  isRunning: boolean;
  streamingContent?: string;
  onUpdateTitle: (title: string) => void;
  onUpdatePrompt: (prompt: string) => void;
  onUpdateDataSource: (ds: string) => void;
  onExecute: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disabled: boolean;
}

function CellEditor({
  cell,
  isFirst,
  isLast,
  isRunning,
  streamingContent,
  onUpdateTitle,
  onUpdatePrompt,
  onUpdateDataSource,
  onExecute,
  onMoveUp,
  onMoveDown,
  onDelete,
  disabled,
}: CellEditorProps) {
  const status = STATUS_CONFIG[cell.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const displayOutput = streamingContent || cell.output;

  return (
    <div
      className="border transition-colors"
      style={{
        borderColor: isRunning ? "rgb(59,130,246)" : "var(--workspace-border)",
        borderLeftWidth: "3px",
        borderLeftColor: isRunning
          ? "rgb(59,130,246)"
          : cell.status === "complete"
            ? "rgb(34,197,94)"
            : cell.status === "failed"
              ? "rgb(239,68,68)"
              : "var(--workspace-border)",
      }}
    >
      {/* Cell header */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: "var(--workspace-border)" }}
      >
        <span
          className="text-[10px] font-mono px-1.5 py-0.5"
          style={{
            background: "var(--workspace-border)",
            color: "var(--workspace-muted)",
          }}
        >
          {cell.cellIndex + 1}
        </span>

        <input
          value={cell.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="flex-1 text-xs font-medium bg-transparent border-none outline-none"
          style={{ color: "var(--workspace-fg)" }}
          placeholder="Cell title..."
        />

        <div className="flex items-center gap-1">
          <StatusIcon
            className={`h-3 w-3 ${isRunning ? "animate-spin" : ""}`}
            style={{ color: status.color }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: status.color }}
          >
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-0.5 ml-2">
          <button
            onClick={onExecute}
            disabled={disabled}
            className="p-1 transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: "var(--workspace-fg)" }}
            title="Execute cell"
          >
            <Play className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveUp}
            disabled={isFirst || disabled}
            className="p-1 transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: "var(--workspace-muted)" }}
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast || disabled}
            className="p-1 transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: "var(--workspace-muted)" }}
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-1 transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: "var(--workspace-muted)" }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Prompt */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <textarea
            value={cell.prompt}
            onChange={(e) => onUpdatePrompt(e.target.value)}
            rows={3}
            className="flex-1 text-xs bg-transparent border outline-none resize-none p-2"
            style={{
              borderColor: "var(--workspace-border)",
              color: "var(--workspace-fg)",
            }}
            placeholder="Enter your analysis prompt... Use {{cell.1}} or {{cell.Title}} to reference other cells."
          />
          <select
            value={cell.dataSourceHint || ""}
            onChange={(e) => onUpdateDataSource(e.target.value)}
            className="text-xs font-medium bg-transparent border px-2 py-1 outline-none"
            style={{
              borderColor: "var(--workspace-border)",
              color: "var(--workspace-muted)",
            }}
          >
            {DATA_SOURCES.map((ds) => (
              <option key={ds.value} value={ds.value}>
                {ds.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Output */}
      {displayOutput && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--workspace-border)" }}
        >
          <div
            className="prose prose-sm max-w-none text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs [&_strong]:font-semibold [&_h1]:font-sans [&_h2]:font-sans"
            style={{ color: "var(--workspace-fg)" }}
          >
            <ReactMarkdown>{displayOutput}</ReactMarkdown>
            {isRunning && (
              <span
                className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse"
                style={{ background: "var(--workspace-fg)" }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
