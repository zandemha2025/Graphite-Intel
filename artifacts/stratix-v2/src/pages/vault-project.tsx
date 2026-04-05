import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText, Plus, Trash2, Check } from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPost, apiDelete } from "@/lib/api";

/* ---------- types ---------- */

interface ProjectDocument {
  id: number;
  title: string;
  fileType: string;
  status: string;
  createdAt: string;
}

interface VaultProjectDetail {
  id: number;
  name: string;
  description: string;
  projectType: string;
  documents: ProjectDocument[];
}

interface AvailableDocument {
  id: number;
  title: string;
  fileType: string;
  status: string;
}

/* ---------- component ---------- */

export default function VaultProjectPage() {
  const [, params] = useRoute("/vault/:id");
  const projectId = params?.id;
  const queryClient = useQueryClient();

  const [showAddDocs, setShowAddDocs] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());

  /* --- queries --- */

  const { data: project, isLoading } = useQuery<VaultProjectDetail>({
    queryKey: ["vault-project", projectId],
    queryFn: () => api<VaultProjectDetail>(`/vault/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: availableDocs } = useQuery<AvailableDocument[]>({
    queryKey: ["documents"],
    queryFn: () => api<AvailableDocument[]>("/documents"),
    enabled: showAddDocs,
  });

  /* --- mutations --- */

  const addDocsMutation = useMutation({
    mutationFn: (documentIds: number[]) =>
      apiPost(`/vault/projects/${projectId}/documents`, { documentIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-project", projectId] });
      toast.success("Documents added");
      setShowAddDocs(false);
      setSelectedDocIds(new Set());
    },
    onError: () => toast.error("Failed to add documents"),
  });

  const removeDocMutation = useMutation({
    mutationFn: (docId: number) =>
      apiDelete(`/vault/projects/${projectId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-project", projectId] });
      toast.success("Document removed");
    },
    onError: () => toast.error("Failed to remove document"),
  });

  /* --- helpers --- */

  const toggleDoc = (id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter out docs already in the project
  const projectDocIds = new Set((project?.documents ?? []).map((d) => d.id));
  const filteredAvailable = (availableDocs ?? []).filter(
    (d) => !projectDocIds.has(d.id),
  );

  if (isLoading) {
    return (
      <Page title="Project" subtitle="Loading...">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </Page>
    );
  }

  if (!project) {
    return (
      <Page title="Project" subtitle="Not found">
        <p className="text-sm text-[#9CA3AF]">Project not found.</p>
      </Page>
    );
  }

  return (
    <Page
      title={project.name}
      subtitle={project.description || `${project.projectType} project`}
      actions={
        <Button onClick={() => setShowAddDocs(true)}>
          <Plus className="h-4 w-4" />
          Add Documents
        </Button>
      }
    >
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">
            Documents ({project.documents.length})
          </TabsTrigger>
          <TabsTrigger value="extractions">Extractions</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          {project.documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#E5E5E3] rounded-xl">
              <FileText className="h-8 w-8 text-[#9CA3AF] mb-2" />
              <p className="text-sm text-[#9CA3AF] mb-3">
                No documents in this project yet
              </p>
              <Button size="sm" onClick={() => setShowAddDocs(true)}>
                Add Documents
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {project.documents.map((doc) => (
                <Card
                  key={doc.id}
                  hoverable
                  className="flex items-center gap-4 p-4"
                >
                  <FileText className="h-5 w-5 text-[#9CA3AF] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0A0A0A] truncate">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge>{doc.fileType.split("/").pop()}</Badge>
                      <Badge
                        variant={
                          doc.status === "ready"
                            ? "success"
                            : doc.status === "failed"
                              ? "error"
                              : "info"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs text-[#9CA3AF] shrink-0">
                    {format(new Date(doc.createdAt), "MMM d, yyyy")}
                  </span>
                  <button
                    onClick={() => removeDocMutation.mutate(doc.id)}
                    className="shrink-0 rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                    aria-label="Remove document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="extractions">
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-[#E5E5E3] rounded-xl">
            <p className="text-sm text-[#9CA3AF]">
              Extractions coming soon
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add documents dialog */}
      <Dialog open={showAddDocs} onOpenChange={setShowAddDocs}>
        <DialogContent>
          <DialogTitle>Add Documents</DialogTitle>
          <DialogDescription>
            Select documents from your Knowledge base to add to this project.
          </DialogDescription>
          <div className="mt-4 max-h-64 overflow-y-auto space-y-1">
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] py-4 text-center">
                No available documents to add.
              </p>
            ) : (
              filteredAvailable.map((doc) => {
                const selected = selectedDocIds.has(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-[#F3F3F1] text-[#0A0A0A]"
                        : "text-[#404040] hover:bg-[#F6F5F4]"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        selected
                          ? "bg-[#0A0A0A] border-[#0A0A0A]"
                          : "border-[#E5E5E3]"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate flex-1">{doc.title}</span>
                    <Badge className="shrink-0">
                      {doc.fileType.split("/").pop()}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowAddDocs(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedDocIds.size === 0}
              loading={addDocsMutation.isPending}
              onClick={() => addDocsMutation.mutate([...selectedDocIds])}
            >
              Add ({selectedDocIds.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
