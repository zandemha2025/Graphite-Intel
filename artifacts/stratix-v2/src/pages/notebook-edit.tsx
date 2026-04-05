import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, apiPatch, apiPost, apiDelete, apiSSE } from "@/lib/api";

interface Cell {
  id: number;
  title: string;
  prompt: string;
  output: string;
  status: "idle" | "running" | "done" | "error";
  order: number;
}

interface Notebook {
  id: number;
  title: string;
  description: string;
  published: boolean;
  cells: Cell[];
  updatedAt: string;
}

function useDebouncedSave(notebookId: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  return useCallback(
    (data: Partial<Notebook>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        apiPatch(`/notebooks/${notebookId}`, data).then(() =>
          queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] }),
        );
      }, 800);
    },
    [notebookId, queryClient],
  );
}

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "error"> = {
  idle: "default",
  running: "warning",
  done: "success",
  error: "error",
};

export default function NotebookEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const notebookId = Number(id);

  const { data: notebook, isLoading } = useQuery<Notebook>({
    queryKey: ["notebook", notebookId],
    queryFn: () => api<Notebook>(`/notebooks/${notebookId}`),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cells, setCells] = useState<Cell[]>([]);
  const [streamingCellId, setStreamingCellId] = useState<number | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title);
      setDescription(notebook.description);
      setCells(notebook.cells.sort((a, b) => a.order - b.order));
    }
  }, [notebook]);

  const save = useDebouncedSave(notebookId);

  const addCellMut = useMutation({
    mutationFn: () =>
      apiPost<Cell>(`/notebooks/${notebookId}/cells`, {
        title: "",
        prompt: "",
        order: cells.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      toast.success("Cell added");
    },
  });

  const removeCellMut = useMutation({
    mutationFn: (cellId: number) =>
      apiDelete(`/notebooks/${notebookId}/cells/${cellId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
    },
  });

  const publishMut = useMutation({
    mutationFn: () => apiPost(`/notebooks/${notebookId}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
      toast.success(notebook?.published ? "Unpublished" : "Published");
    },
  });

  function updateCellLocal(cellId: number, patch: Partial<Cell>) {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, ...patch } : c)),
    );
  }

  function saveCellField(cellId: number, field: string, value: string) {
    apiPatch(`/notebooks/${notebookId}/cells/${cellId}`, {
      [field]: value,
    });
  }

  async function executeCell(cellId: number) {
    const abort = new AbortController();
    abortRef.current = abort;
    setStreamingCellId(cellId);
    updateCellLocal(cellId, { status: "running", output: "" });

    try {
      let accumulated = "";
      await apiSSE(
        `/notebooks/${notebookId}/cells/${cellId}/execute`,
        {},
        (_event, data) => {
          accumulated += data;
          updateCellLocal(cellId, { output: accumulated });
        },
        abort.signal,
      );
      updateCellLocal(cellId, { status: "done" });
    } catch {
      updateCellLocal(cellId, { status: "error" });
    } finally {
      setStreamingCellId(null);
      abortRef.current = null;
    }
  }

  async function runAll() {
    setRunningAll(true);
    const abort = new AbortController();
    abortRef.current = abort;
    let activeCellId: number | null = null;

    try {
      await apiSSE(
        `/notebooks/${notebookId}/execute`,
        {},
        (event, data) => {
          if (event === "cell_start") {
            const parsed = JSON.parse(data);
            activeCellId = parsed.cellId;
            if (activeCellId !== null) {
              updateCellLocal(activeCellId, {
                status: "running",
                output: "",
              });
            }
          } else if (event === "cell_content") {
            if (activeCellId !== null) {
              setCells((prev) =>
                prev.map((c) =>
                  c.id === activeCellId
                    ? { ...c, output: c.output + data }
                    : c,
                ),
              );
            }
          } else if (event === "cell_complete") {
            if (activeCellId !== null) {
              updateCellLocal(activeCellId, { status: "done" });
            }
          }
        },
        abort.signal,
      );
    } catch {
      if (activeCellId !== null) {
        updateCellLocal(activeCellId, { status: "error" });
      }
    } finally {
      setRunningAll(false);
      abortRef.current = null;
    }
  }

  function moveCell(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= cells.length) return;
    const next = [...cells];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    next.forEach((c, i) => (c.order = i));
    setCells(next);
    next.forEach((c) =>
      apiPatch(`/notebooks/${notebookId}/cells/${c.id}`, { order: c.order }),
    );
  }

  if (isLoading) {
    return (
      <Page title="Loading..." subtitle="">
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-64 bg-[#E5E5E3] rounded" />
          <div className="h-48 bg-[#E5E5E3] rounded-xl" />
        </div>
      </Page>
    );
  }

  if (!notebook) {
    return (
      <Page title="Not Found" subtitle="">
        <p className="text-sm text-[#9CA3AF]">Notebook not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate("/notebooks")}>
          Back to Notebooks
        </Button>
      </Page>
    );
  }

  return (
    <Page
      title=""
      fullWidth
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => publishMut.mutate()}
            loading={publishMut.isPending}
          >
            {notebook.published ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="secondary"
            onClick={runAll}
            disabled={runningAll || cells.length === 0}
            loading={runningAll}
          >
            Run All
          </Button>
          <Button onClick={() => addCellMut.mutate()} loading={addCellMut.isPending}>
            Add Cell
          </Button>
        </div>
      }
    >
      <div className="max-w-[900px] mx-auto space-y-6">
        {/* Editable title and description */}
        <div>
          <input
            className="w-full text-2xl font-semibold text-[#0A0A0A] bg-transparent border-none outline-none placeholder:text-[#C8C8C6]"
            value={title}
            placeholder="Untitled Notebook"
            onChange={(e) => {
              setTitle(e.target.value);
              save({ title: e.target.value });
            }}
          />
          <input
            className="w-full mt-1 text-sm text-[#9CA3AF] bg-transparent border-none outline-none placeholder:text-[#C8C8C6]"
            value={description}
            placeholder="Add a description..."
            onChange={(e) => {
              setDescription(e.target.value);
              save({ description: e.target.value });
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            {notebook.published && <Badge variant="success">Published</Badge>}
            <span className="text-xs text-[#9CA3AF]">
              Updated {new Date(notebook.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cells */}
        {cells.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-[#E5E5E3] rounded-xl">
            <p className="text-sm text-[#9CA3AF] mb-2">No cells yet</p>
            <Button
              variant="secondary"
              onClick={() => addCellMut.mutate()}
              loading={addCellMut.isPending}
            >
              Add your first cell
            </Button>
          </div>
        ) : (
          cells.map((cell, idx) => (
            <Card key={cell.id} className="space-y-3">
              {/* Cell header */}
              <div className="flex items-center justify-between gap-2">
                <input
                  className="flex-1 text-sm font-medium text-[#0A0A0A] bg-transparent border-none outline-none placeholder:text-[#C8C8C6]"
                  value={cell.title}
                  placeholder={`Cell ${idx + 1}`}
                  onChange={(e) => {
                    updateCellLocal(cell.id, { title: e.target.value });
                    saveCellField(cell.id, "title", e.target.value);
                  }}
                />
                <div className="flex items-center gap-1">
                  <Badge variant={STATUS_BADGE[cell.status]}>
                    {cell.status}
                  </Badge>
                </div>
              </div>

              {/* Prompt */}
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-[#E5E5E3] bg-[#FAFAFA] p-3 text-sm text-[#0A0A0A] placeholder:text-[#C8C8C6] focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] resize-y"
                placeholder="Enter your prompt..."
                value={cell.prompt}
                onChange={(e) => {
                  updateCellLocal(cell.id, { prompt: e.target.value });
                  saveCellField(cell.id, "prompt", e.target.value);
                }}
              />

              {/* Output */}
              {cell.output && (
                <div className="rounded-lg bg-[#F6F5F4] p-3 text-sm text-[#404040] whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                  {cell.output}
                </div>
              )}

              {/* Cell actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => moveCell(idx, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={idx === cells.length - 1}
                    onClick={() => moveCell(idx, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#DC2626] hover:text-[#B91C1C]"
                    onClick={() => removeCellMut.mutate(cell.id)}
                  >
                    Remove
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    streamingCellId !== null ||
                    runningAll ||
                    !cell.prompt.trim()
                  }
                  loading={streamingCellId === cell.id}
                  onClick={() => executeCell(cell.id)}
                >
                  Execute
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}
