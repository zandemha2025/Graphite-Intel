import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  BookText,
  Plus,
  Clock,
  Globe,
  FileText,
  Trash2,
  RefreshCw,
  Calendar,
} from "lucide-react";

interface NotebookItem {
  id: number;
  title: string;
  description: string | null;
  isPublished: boolean;
  refreshSchedule: string | null;
  lastRefreshedAt: string | null;
  cellCount: number;
  createdAt: string;
  updatedAt: string;
}

export function NotebookList() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchNotebooks = async () => {
    try {
      const res = await fetch("/api/notebooks", { credentials: "include" });
      if (res.ok) setNotebooks(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "Untitled Notebook", description: "" }),
      });
      if (res.ok) {
        const nb = await res.json();
        setLocation(`/notebooks/${nb.id}`);
      }
    } catch {
      toast({ title: "Failed to create notebook", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setNotebooks((prev) => prev.filter((nb) => nb.id !== id));
        toast({ title: "Notebook deleted" });
      }
    } catch {
      toast({ title: "Failed to delete notebook", variant: "destructive" });
    }
    setDeleteConfirmId(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-5 h-5 border border-[var(--workspace-border)] animate-spin"
          style={{ borderTopColor: "var(--workspace-fg)", borderRadius: 0 }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-serif font-medium tracking-tight"
            style={{ color: "var(--workspace-fg)" }}
          >
            Notebooks
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--workspace-muted)" }}
          >
            Multi-cell analytical workspaces that build on each other
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors"
          style={{
            background: "var(--workspace-fg)",
            color: "var(--workspace-bg)",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Notebook
        </button>
      </div>

      {/* Grid */}
      {notebooks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 border"
          style={{
            borderColor: "var(--workspace-border)",
            color: "var(--workspace-muted)",
          }}
        >
          <BookText className="h-10 w-10 mb-4 opacity-30" />
          <p className="text-sm font-medium mb-1">No notebooks yet</p>
          <p className="text-xs opacity-60">
            Create your first analytical notebook to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              className="border transition-colors cursor-pointer group relative"
              style={{
                borderColor: "var(--workspace-border)",
                background: "var(--workspace-bg)",
              }}
              onClick={() => setLocation(`/notebooks/${nb.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookText
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--workspace-muted)" }}
                    />
                    <h3
                      className="text-sm font-medium leading-tight truncate"
                      style={{ color: "var(--workspace-fg)" }}
                    >
                      {nb.title}
                    </h3>
                  </div>
                  {nb.isPublished && (
                    <span
                      className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                      style={{
                        background: "rgba(34,197,94,0.1)",
                        color: "rgb(34,197,94)",
                      }}
                    >
                      <Globe className="h-2.5 w-2.5" />
                      Published
                    </span>
                  )}
                </div>

                {nb.description && (
                  <p
                    className="text-xs mb-3 line-clamp-2"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    {nb.description}
                  </p>
                )}

                <div
                  className="flex items-center gap-4 text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--workspace-muted)" }}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {nb.cellCount} cell{nb.cellCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(nb.lastRefreshedAt)}
                  </span>
                  {nb.refreshSchedule && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Scheduled
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button (visible on hover) */}
              <button
                className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--workspace-muted)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteConfirmId === nb.id) {
                    handleDelete(nb.id);
                  } else {
                    setDeleteConfirmId(nb.id);
                    setTimeout(() => setDeleteConfirmId(null), 3000);
                  }
                }}
                title={
                  deleteConfirmId === nb.id
                    ? "Click again to confirm"
                    : "Delete"
                }
              >
                <Trash2
                  className="h-3.5 w-3.5"
                  style={{
                    color:
                      deleteConfirmId === nb.id
                        ? "rgb(239,68,68)"
                        : undefined,
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
