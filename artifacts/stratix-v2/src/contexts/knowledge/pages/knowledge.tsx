import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Search,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
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
import { api, apiPost, apiPatch, apiDelete } from "@/lib/api";

/* ---------- types ---------- */

interface Document {
  id: number;
  title: string;
  fileType: string;
  objectKey: string;
  status: "processing" | "ready" | "failed";
  chunkCount: number;
  tags: string[];
  createdAt: string;
}

interface PresignedResponse {
  url: string;
  objectKey: string;
}

interface SearchResult {
  id: number;
  title: string;
  fileType: string;
  snippet: string;
  score: number;
}

/* ---------- helpers ---------- */

const STATUS_VARIANT: Record<string, "info" | "success" | "error"> = {
  processing: "info",
  ready: "success",
  failed: "error",
};

function fileIcon(type: string) {
  if (type.includes("pdf")) return FileText;
  if (type.includes("sheet") || type.includes("csv") || type.includes("excel"))
    return FileSpreadsheet;
  if (type.includes("image")) return FileImage;
  return File;
}

/* ---------- component ---------- */

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  /* --- queries --- */

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: () => api<Document[]>("/documents"),
  });

  /* --- mutations --- */

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const tagMutation = useMutation({
    mutationFn: ({ id, tags }: { id: number; tags: string[] }) =>
      apiPatch(`/documents/${id}`, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Tags updated");
    },
    onError: () => toast.error("Failed to update tags"),
  });

  /* --- upload flow --- */

  const handleUpload = useCallback(
    async (file: globalThis.File) => {
      setUploading(true);
      try {
        // 1. Get presigned URL
        const { url, objectKey } = await apiPost<PresignedResponse>(
          "/storage/uploads/request-url",
          { name: file.name, size: file.size, contentType: file.type },
        );

        // 2. PUT file to S3
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        // 3. Create document record
        const doc = await apiPost<Document>("/documents", {
          title: file.name,
          fileType: file.type,
          objectKey,
        });

        // 4. Trigger processing
        await apiPost(`/documents/${doc.id}/process`, {});

        queryClient.invalidateQueries({ queryKey: ["documents"] });
        toast.success("Document uploaded and processing started");
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [queryClient],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  /* --- search --- */

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiPost<{ results: SearchResult[] }>("/documents/search", {
        query: searchQuery,
        searchMode: "hybrid",
      });
      setSearchResults(res.results);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  /* --- tag editing --- */

  const handleAddTag = (doc: Document) => {
    const tag = tagInput.trim();
    if (!tag || doc.tags.includes(tag)) return;
    tagMutation.mutate({ id: doc.id, tags: [...doc.tags, tag] });
    setTagInput("");
  };

  const handleRemoveTag = (doc: Document, tag: string) => {
    tagMutation.mutate({ id: doc.id, tags: doc.tags.filter((t) => t !== tag) });
  };

  /* --- render --- */

  return (
    <Page
      title="Knowledge"
      subtitle="Upload and manage documents for AI processing"
      actions={
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept=".pdf,.docx,.txt,.csv,.xlsx,.md"
          />
          <Button
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </>
      }
    >
      {/* Search section */}
      <div className="flex items-center gap-2 mb-6">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="max-w-sm"
        />
        <Button
          variant="secondary"
          loading={searching}
          onClick={runSearch}
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
        {searchResults !== null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchResults(null);
              setSearchQuery("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-[#0A0A0A] mb-3">
            Search Results ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">No results found.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((r) => {
                const Icon = fileIcon(r.fileType);
                return (
                  <Card key={r.id} className="flex items-start gap-3 p-4">
                    <Icon className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0A0A0A]">
                        {r.title}
                      </p>
                      <p className="text-xs text-[#404040] mt-1 line-clamp-2">
                        {r.snippet}
                      </p>
                    </div>
                    <Badge variant="info" className="shrink-0">
                      {(r.score * 100).toFixed(0)}%
                    </Badge>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (documents ?? []).length === 0 && searchResults === null && (
        <div
          className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#E5E5E3] rounded-xl cursor-pointer hover:border-[#C8C8C6] transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-[#9CA3AF] mb-3" />
          <p className="text-sm text-[#9CA3AF] mb-1">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-[#C8C8C6]">
            PDF, DOCX, TXT, CSV, XLSX, MD
          </p>
        </div>
      )}

      {/* Document list */}
      {!isLoading && (documents ?? []).length > 0 && searchResults === null && (
        <div className="space-y-2">
          {documents!.map((doc) => {
            const Icon = fileIcon(doc.fileType);
            const isEditing = editingTagsId === doc.id;
            return (
              <Card
                key={doc.id}
                hoverable
                className="flex items-center gap-4 p-4"
              >
                <Icon className="h-5 w-5 text-[#9CA3AF] shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge>{doc.fileType.split("/").pop()}</Badge>
                    <Badge variant={STATUS_VARIANT[doc.status]}>
                      {doc.status === "processing" && (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      )}
                      {doc.status}
                    </Badge>
                    {doc.chunkCount > 0 && (
                      <span className="text-xs text-[#9CA3AF]">
                        {doc.chunkCount} chunks
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F1] px-2 py-0.5 text-xs text-[#404040]"
                      >
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveTag(doc, tag)}
                            className="hover:text-[#DC2626]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {isEditing ? (
                      <input
                        className="h-6 w-24 rounded border border-[#E5E5E3] px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        placeholder="Add tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag(doc);
                          if (e.key === "Escape") {
                            setEditingTagsId(null);
                            setTagInput("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingTagsId(doc.id)}
                        className="text-xs text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
                      >
                        + tag
                      </button>
                    )}
                  </div>
                </div>

                <span className="text-xs text-[#9CA3AF] shrink-0">
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </span>

                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="shrink-0 rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                  aria-label="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogTitle>Delete Document</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;?
            This will remove the document and all processed chunks.
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
