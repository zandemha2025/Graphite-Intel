import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  useListDocuments,
  getListDocumentsQueryKey,
  useCreateDocument,
  useDeleteDocument,
  useProcessDocument,
  useUpdateDocument,
  useSearchDocuments,
  type DocumentChunk,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Loader2, FileText, FileCheck, AlertCircle, BookOpen, Search, Tag, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { DataCard } from "@/components/ui/data-card";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/skeleton";

const DOC_STATUS_MAP: Record<string, "active" | "running" | "failed"> = {
  ready: "active",
  processing: "running",
  failed: "failed",
};

function TagEditor({ docId, currentTags, onSave }: { docId: number; currentTags?: string | null; onSave: (tags: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentTags || "");

  const handleSave = () => {
    onSave(value.trim());
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-[10px] text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
        style={{ opacity: currentTags ? 0.8 : 0.5 }}
        title="Add tags"
      >
        <Tag className="w-2.5 h-2.5" />
        {currentTags ? (
          <span>{currentTags}</span>
        ) : (
          <span>Add tags</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Tag className="w-2.5 h-2.5 shrink-0 text-[#9CA3AF]" />
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Financials, Strategy..."
        className="text-[10px] bg-transparent focus:outline-none w-32 border-b border-[#E5E5E3] text-[#111827]"
      />
      <button onClick={handleSave} className="text-[10px] text-green-600">Save</button>
      <button onClick={() => setEditing(false)} className="text-[#9CA3AF]">
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function TestSearch({ docIds }: { docIds: number[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentChunk[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const searchMutation = useSearchDocuments();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const data = await searchMutation.mutateAsync({
        data: { query: query.trim(), documentIds: docIds },
      });
      setResults(data);
      setExpanded(true);
    } catch {
      setResults([]);
    }
  };

  return (
    <DataCard className="mt-8 p-0 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-[#FAFAF9] hover:bg-[#F5F5F4] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-xs font-medium text-[#9CA3AF]">Test Semantic Search</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[#E5E5E3] p-5">
          <p className="text-[10px] mb-3 text-[#9CA3AF] opacity-70">
            Test which document chunks would be retrieved for a given query.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a query to test retrieval..."
              className="flex-1 px-3 py-2 text-xs border border-[#E5E5E3] bg-[#FAFAF9] text-[#111827] focus:outline-none rounded-md"
            />
            <button
              type="submit"
              disabled={searchMutation.isPending || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#E5E5E3] text-[#6B7280] bg-white rounded-md hover:border-[#D1D0CE] transition-colors disabled:opacity-40"
            >
              {searchMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Search className="w-3 h-3" />
              )}
              Search
            </button>
          </form>

          {results !== null && (
            <div>
              {results.length === 0 ? (
                <p className="text-xs text-center py-4 text-[#9CA3AF]">
                  No relevant chunks found. Try a different query or upload documents with relevant content.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-[#9CA3AF]">
                    {results.length} chunk{results.length !== 1 ? "s" : ""} retrieved
                  </p>
                  {results.map((chunk, idx) => (
                    <div key={chunk.id} className="p-3 border border-[#E5E5E3] rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-[#9CA3AF]">#{idx + 1}</span>
                          <span className="text-[11px] font-medium text-[#111827]">{chunk.documentTitle}</span>
                          <span className="text-[9px] text-[#9CA3AF] opacity-60">chunk {chunk.chunkIndex + 1}</span>
                        </div>
                        <span className="text-[10px] text-green-600">
                          {Math.round(chunk.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed line-clamp-3 text-[#9CA3AF]">
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DataCard>
  );
}

export function Knowledge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });

  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const processDocument = useProcessDocument();
  const updateDocument = useUpdateDocument();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext || "")) {
      toast({ title: "Only PDF and DOCX files are supported", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const doc = await createDocument.mutateAsync({
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileType: ext as string,
          objectKey: objectPath,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });

      processDocument.mutate(
        { id: doc.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
            }, 3000);
          },
          onError: () => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          },
        },
      );

      toast({ title: `"${doc.title}" uploaded — indexing...` });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: number, title: string) => {
    deleteDocument.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          toast({ title: `"${title}" deleted` });
        },
        onError: () => {
          toast({ title: "Failed to delete document", variant: "destructive" });
        },
      },
    );
  };

  const handleTagSave = (id: number, tags: string) => {
    updateDocument.mutate(
      { id, data: { tags } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        },
      },
    );
  };

  const readyDocIds = docs.filter((d) => d.status === "ready").map((d) => d.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Knowledge Vault"
        subtitle="Upload board decks, financial models, research reports, and contracts. Documents are semantically indexed for precise retrieval."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#E5E5E3] text-[#6B7280] bg-white rounded-md hover:border-[#D1D0CE] transition-colors disabled:opacity-40"
              data-testid="btn-upload-document"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload Document
            </button>
          </>
        }
      />

      <div className="mt-8">
      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : docs.length === 0 ? (
        <div
          className="p-12 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed border-[#E5E5E3] bg-white rounded-xl hover:border-[#D1D0CE] hover:bg-[#FAFAF9] transition-colors group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center bg-[#F5F5F4] border border-[#E5E5E3] rounded-xl">
            <Upload className="w-6 h-6 text-[#9CA3AF]" />
          </div>
          <h3 className="text-sm font-medium mb-1 text-[#111827]">Upload your first document</h3>
          <p className="text-xs max-w-xs mb-4 text-[#9CA3AF]">
            Drag and drop or click to upload board decks, financial models, research reports, and contracts.
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] opacity-60">
            Supports PDF and DOCX
          </p>
        </div>
      ) : (
        <div className="border border-[#E5E5E3] rounded-xl overflow-hidden">
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              className="flex items-start justify-between px-5 py-4 group bg-white hover:bg-[#FAFAF9] transition-colors"
              style={{ borderTop: i > 0 ? "1px solid #E5E5E3" : undefined }}
              data-testid={`document-${doc.id}`}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <FileText className="w-4 h-4 shrink-0 mt-0.5 text-[#9CA3AF]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-[#111827]">{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs font-medium text-[#9CA3AF]">
                      {doc.fileType.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] opacity-60">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                    <SharedStatusBadge status={DOC_STATUS_MAP[doc.status] ?? "running"} />
                    {doc.status === "ready" && doc.chunkCount != null && doc.chunkCount > 0 && (
                      <span className="text-[10px] text-[#9CA3AF] opacity-60">
                        {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""} indexed
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <TagEditor
                      docId={doc.id}
                      currentTags={doc.tags}
                      onSave={(tags) => handleTagSave(doc.id, tags)}
                    />
                  </div>
                </div>
              </div>
              <button
                className="h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-4 mt-0.5 text-[#9CA3AF] hover:text-red-500"
                onClick={() => handleDelete(doc.id, doc.title)}
                data-testid={`btn-delete-document-${doc.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      </div>

      {readyDocIds.length > 0 && (
        <TestSearch docIds={readyDocIds} />
      )}

      <p className="text-[10px] mt-4 leading-relaxed text-[#9CA3AF] opacity-60">
        Supported formats: PDF, DOCX -- Maximum 5 documents per conversation -- Semantic search powered by pgvector
      </p>
    </div>
  );
}
