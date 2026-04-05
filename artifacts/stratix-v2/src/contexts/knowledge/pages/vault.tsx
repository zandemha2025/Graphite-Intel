import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPost, apiDelete } from "@/lib/api";

/* ---------- types ---------- */

interface VaultProject {
  id: number;
  name: string;
  description: string;
  projectType: string;
  documentCount: number;
  createdAt: string;
}

/* ---------- component ---------- */

export default function VaultPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("research");
  const [deleteTarget, setDeleteTarget] = useState<VaultProject | null>(null);

  const { data: projects, isLoading } = useQuery<VaultProject[]>({
    queryKey: ["vault-projects"],
    queryFn: () => api<VaultProject[]>("/vault/projects"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<VaultProject>("/vault/projects", {
        name: newName,
        description: newDesc,
        projectType: newType,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["vault-projects"] });
      toast.success("Project created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      navigate(`/vault/${project.id}`);
    },
    onError: () => toast.error("Failed to create project"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/vault/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-projects"] });
      toast.success("Project deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const TYPE_VARIANT: Record<string, "default" | "info" | "success" | "warning"> = {
    research: "info",
    investigation: "warning",
    compliance: "success",
  };

  return (
    <Page
      title="Vault"
      subtitle="Organize documents into secure project collections"
      actions={
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
    >
      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (projects ?? []).length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl">
          <FolderOpen className="h-10 w-10 text-[#9CA3AF] mb-3" />
          <p className="text-sm text-[#9CA3AF] mb-3">
            Create your first vault project
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New Project
          </Button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && (projects ?? []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects!.map((project) => (
            <Card
              key={project.id}
              hoverable
              clickable
              onClick={() => navigate(`/vault/${project.id}`)}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium text-[#0A0A0A] line-clamp-1 flex-1">
                  {project.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(project);
                  }}
                  className="shrink-0 rounded-lg p-1 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                  aria-label="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {project.description && (
                <p className="text-xs text-[#404040] line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-auto">
                <Badge variant={TYPE_VARIANT[project.projectType] ?? "default"}>
                  {project.projectType}
                </Badge>
                <span className="text-xs text-[#9CA3AF]">
                  {project.documentCount} doc{project.documentCount !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* New Project dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Create a vault project to organize related documents.
          </DialogDescription>
          <div className="space-y-3 mt-4">
            <Input
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="flex h-9 w-full appearance-none rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm text-[#0A0A0A] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="research">Research</option>
              <option value="investigation">Investigation</option>
              <option value="compliance">Compliance</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim()}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
            Documents will be unlinked but not deleted from Knowledge.
          </DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
