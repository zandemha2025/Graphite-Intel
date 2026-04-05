import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPost, apiDelete } from "@/lib/api";

interface Notebook {
  id: number;
  title: string;
  description: string;
  cellCount: number;
  published: boolean;
  updatedAt: string;
}

export default function NotebooksPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: notebooks = [], isLoading } = useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: () => api<Notebook[]>("/notebooks"),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiPost<Notebook>("/notebooks", {
        title: newTitle || "Untitled Notebook",
        description: newDesc,
      }),
    onSuccess: (nb) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setShowNew(false);
      setNewTitle("");
      setNewDesc("");
      navigate(`/notebooks/${nb.id}`);
    },
    onError: () => toast.error("Failed to create notebook"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiDelete(`/notebooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setDeleteId(null);
      toast.success("Notebook deleted");
    },
    onError: () => toast.error("Failed to delete notebook"),
  });

  const deletingNotebook = notebooks.find((n) => n.id === deleteId);

  return (
    <Page
      title="Notebooks"
      subtitle="Collaborative analysis notebooks"
      actions={
        <Button onClick={() => setShowNew(true)}>New Notebook</Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-[#F6F5F4] animate-pulse"
            />
          ))}
        </div>
      ) : notebooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <p className="text-sm text-[#9CA3AF] mb-3">No notebooks yet</p>
          <Button variant="secondary" onClick={() => setShowNew(true)}>
            Create your first notebook
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map((nb) => (
            <Card
              key={nb.id}
              hoverable
              clickable
              className="flex flex-col justify-between"
              onClick={() => navigate(`/notebooks/${nb.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[#0A0A0A] truncate">
                    {nb.title}
                  </h3>
                  {nb.published && <Badge variant="success">Published</Badge>}
                </div>
                {nb.description && (
                  <p className="mt-1 text-sm text-[#9CA3AF] line-clamp-2">
                    {nb.description}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#9CA3AF]">
                <span>
                  {nb.cellCount} {nb.cellCount === 1 ? "cell" : "cells"}
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    {new Date(nb.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(nb.id);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Notebook Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogTitle>New Notebook</DialogTitle>
          <DialogDescription>
            Create a new analysis notebook.
          </DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
          >
            <Input
              placeholder="Notebook title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNew(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createMut.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <DialogContent>
          <DialogTitle>Delete Notebook</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{deletingNotebook?.title}
            &rdquo;? This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
