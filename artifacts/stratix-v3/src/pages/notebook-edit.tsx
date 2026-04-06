import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPost, apiPatch, apiDelete, apiSSE } from "@/lib/api";
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  FileText,
  Code2,
  BarChart3,
  Check,
  Loader2,
  Globe,
} from "lucide-react";

/* ---------- Types ---------- */

type CellType = "markdown" | "query" | "chart";

interface Cell {
  id: string;
  type: CellType;
  content: string;
  output?: string;
}

interface Notebook {
  id: string;
  title: string;
  published: boolean;
  cells: Cell[];
  updatedAt: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Cell type icon ---------- */

function CellTypeIcon({ type }: { type: CellType }) {
  switch (type) {
    case "markdown":
      return <FileText className="h-3.5 w-3.5" />;
    case "query":
      return <Code2 className="h-3.5 w-3.5" />;
    case "chart":
      return <BarChart3 className="h-3.5 w-3.5" />;
  }
}

function cellTypeLabel(type: CellType): string {
  switch (type) {
    case "markdown":
      return "Markdown";
    case "query":
      return "Query";
    case "chart":
      return "Chart";
  }
}

/* ---------- Cell Component ---------- */

function NotebookCell({
  cell,
  notebookId,
  onUpdate,
  onDelete,
}: {
  cell: Cell;
  notebookId: string;
  onUpdate: (cellId: string, content: string) => void;
  onDelete: (cellId: string) => void;
}) {
  const [content, setContent] = useState(cell.content);
  const [output, setOutput] = useState(cell.output ?? "");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync content from parent when cell data changes
  useEffect(() => {
    setContent(cell.content);
  }, [cell.content]);

  useEffect(() => {
    setOutput(cell.output ?? "");
  }, [cell.output]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput("");
    let accumulated = "";

    abortRef.current = new AbortController();

    try {
      await apiSSE(
        `/notebooks/${notebookId}/cells/${cell.id}/execute`,
        { content },
        (event, data) => {
          if (event === "done") return;

          try {
            const parsed = JSON.parse(data);
            if (typeof parsed.content === "string") {
              accumulated += parsed.content;
            } else if (typeof parsed.token === "string") {
              accumulated += parsed.token;
            }
          } catch {
            if (data && data !== "[DONE]") {
              accumulated += data;
            }
          }

          setOutput(accumulated);
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setOutput("Error executing cell. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  }, [notebookId, cell.id, content]);

  const handleBlur = useCallback(() => {
    if (content !== cell.content) {
      onUpdate(cell.id, content);
    }
  }, [content, cell.content, cell.id, onUpdate]);

  return (
    <Card className="overflow-hidden p-0">
      {/* Cell header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <CellTypeIcon type={cell.type} />
          <span className="font-medium">{cellTypeLabel(cell.type)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleRun}
            disabled={running}
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Run
          </Button>
          <button
            onClick={() => onDelete(cell.id)}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Cell content */}
      <div className="p-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          rows={Math.max(3, content.split("\n").length)}
          placeholder={
            cell.type === "query"
              ? "Enter your analysis query..."
              : cell.type === "chart"
                ? "Describe the chart you want to generate..."
                : "Write markdown content..."
          }
          className="w-full resize-none rounded border-0 bg-transparent font-mono text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
        />
      </div>

      {/* Cell output */}
      {(output || running) && (
        <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
            Output
          </div>
          {running && !output ? (
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4F46E5]" />
              Running...
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-sm text-[#374151]">
              <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 text-xs">
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ---------- Add Cell Menu ---------- */

function AddCellMenu({
  onAdd,
  loading,
}: {
  onAdd: (type: CellType) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  const cellTypes: { type: CellType; label: string; icon: typeof FileText }[] = [
    { type: "markdown", label: "Markdown", icon: FileText },
    { type: "query", label: "Query", icon: Code2 },
    { type: "chart", label: "Chart", icon: BarChart3 },
  ];

  return (
    <div className="relative flex justify-center">
      {open ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-1.5 shadow-sm">
          {cellTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              disabled={loading}
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={() => setOpen(false)}
            className="ml-1 rounded-md px-2 py-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Cell
        </Button>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function NotebookEditPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const notebookId = params.id ?? "";

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: notebook, isLoading, isError } = useQuery<Notebook>({
    queryKey: ["notebook", notebookId],
    queryFn: () =>
      api<{ notebook: Notebook }>(`/notebooks/${notebookId}`).then(
        (r) => r.notebook,
      ),
    enabled: !!notebookId,
  });

  /* Title auto-save (debounced) */
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const displayTitle = editTitle ?? notebook?.title ?? "Untitled";

  const titleMutation = useMutation({
    mutationFn: (title: string) =>
      apiPatch(`/notebooks/${notebookId}`, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      setSaveStatus("saved");
    },
    onError: () => {
      toast.error("Failed to save title");
      setSaveStatus("idle");
    },
  });

  const handleTitleChange = useCallback(
    (value: string) => {
      setEditTitle(value);
      setSaveStatus("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        titleMutation.mutate(value);
      }, 800);
    },
    [titleMutation],
  );

  /* Run all cells */
  const runAllMutation = useMutation({
    mutationFn: () =>
      apiPost(`/notebooks/${notebookId}/execute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      toast.success("All cells executed");
    },
    onError: () => {
      toast.error("Failed to run all cells");
    },
  });

  /* Publish toggle */
  const publishMutation = useMutation({
    mutationFn: () =>
      apiPost(`/notebooks/${notebookId}/publish`, {
        published: !notebook?.published,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      toast.success(
        notebook?.published ? "Notebook unpublished" : "Notebook published",
      );
    },
    onError: () => {
      toast.error("Failed to update publish status");
    },
  });

  /* Add cell */
  const addCellMutation = useMutation({
    mutationFn: (type: CellType) =>
      apiPost<{ cell: Cell }>(`/notebooks/${notebookId}/cells`, {
        type,
        content: "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
    },
    onError: () => {
      toast.error("Failed to add cell");
    },
  });

  /* Update cell content */
  const updateCellMutation = useMutation({
    mutationFn: ({ cellId, content }: { cellId: string; content: string }) =>
      apiPatch(`/notebooks/${notebookId}/cells/${cellId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
    },
  });

  /* Delete cell */
  const deleteCellMutation = useMutation({
    mutationFn: (cellId: string) =>
      apiDelete(`/notebooks/${notebookId}/cells/${cellId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      toast.success("Cell deleted");
    },
    onError: () => {
      toast.error("Failed to delete cell");
    },
  });

  const handleCellUpdate = useCallback(
    (cellId: string, content: string) => {
      updateCellMutation.mutate({ cellId, content });
    },
    [updateCellMutation],
  );

  const handleCellDelete = useCallback(
    (cellId: string) => {
      deleteCellMutation.mutate(cellId);
    },
    [deleteCellMutation],
  );

  /* Loading state */
  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </Page>
    );
  }

  /* Error state */
  if (isError || !notebook) {
    return (
      <Page title="Notebook not found" subtitle="">
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            Could not load this notebook
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            It may have been deleted or you may not have access.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/notebooks")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Notebooks
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/notebooks")}
            className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="border-0 bg-transparent text-lg font-semibold text-[#111827] focus:outline-none"
              placeholder="Untitled Notebook"
            />
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9CA3AF]">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  Autosaved
                </>
              )}
              {saveStatus === "idle" && (
                <span>
                  {notebook.cells.length} cell
                  {notebook.cells.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => publishMutation.mutate()}
            loading={publishMutation.isPending}
          >
            <Globe className="h-3.5 w-3.5" />
            {notebook.published ? "Unpublish" : "Publish"}
          </Button>
          {notebook.published && (
            <Badge variant="success">Published</Badge>
          )}
          <Button
            size="sm"
            onClick={() => runAllMutation.mutate()}
            loading={runAllMutation.isPending}
          >
            <Play className="h-3.5 w-3.5" />
            Run All
          </Button>
        </div>
      </div>

      {/* Cell list */}
      <div className="space-y-3">
        {notebook.cells.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-3 h-8 w-8 text-[#D1D5DB]" />
            <p className="text-sm font-medium text-[#111827]">
              No cells yet
            </p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Add a cell to start building your analysis.
            </p>
          </Card>
        ) : (
          notebook.cells.map((cell) => (
            <NotebookCell
              key={cell.id}
              cell={cell}
              notebookId={notebookId}
              onUpdate={handleCellUpdate}
              onDelete={handleCellDelete}
            />
          ))
        )}
      </div>

      {/* Add cell */}
      <div className="mt-4">
        <AddCellMenu
          onAdd={(type) => addCellMutation.mutate(type)}
          loading={addCellMutation.isPending}
        />
      </div>
    </div>
  );
}
