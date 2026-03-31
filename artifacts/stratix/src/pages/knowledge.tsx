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

type DocStatus = "processing" | "ready" | "failed";

function StatusBadge({ status, chunkCount }: { status: string; chunkCount?: number | null }) {
  if (status === "ready") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: "#16a34a" }}>
          <FileCheck className="w-3 h-3" />
          Ready
        </span>
        {chunkCount != null && chunkCount > 0 && (
          <span className="text-[10px]" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
            {chunkCount} chunk{chunkCount !== 1 ? "s" : ""} indexed
          </span>
        )}
      </div>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: "#dc2626" }}>
        <AlertCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>
      <Loader2 className="w-3 h-3 animate-spin" />
      Processing
    </span>
  );
}

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
        className="flex items-center gap-1 text-[10px] transition-colors"
        style={{ color: "var(--workspace-muted)", opacity: currentTags ? 0.8 : 0.5 }}
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
      <Tag className="w-2.5 h-2.5 shrink-0" style={{ color: "var(--workspace-muted)" }} />
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Financials, Strategy..."
        className="text-[10px] bg-transparent focus:outline-none w-32"
        style={{
          borderBottom: "1px solid var(--workspace-border)",
          color: "var(--workspace-fg)",
        }}
      />
      <button onClick={handleSave} className="text-[10px]" style={{ color: "#16a34a" }}>Save</button>
      <button onClick={() => setEditing(false)} style={{ color: "var(--workspace-muted)" }}>
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
    <div className="mt-8" style={{ border: "1px solid var(--workspace-border)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 transition-colors"
        style={{ background: "var(--workspace-muted-bg)" }}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5" style={{ color: "var(--workspace-muted)" }} />
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>Test Semantic Search</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--workspace-muted)" }} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--workspace-muted)" }} />
        )}
      </button>

      {expanded && (
        <div className="border-t p-5" style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}>
          <p className="text-[10px] mb-3" style={{ color: "var(--workspace-muted)", opacity: 0.7 }}>
            Test which document chunks would be retrieved for a given query.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a query to test retrieval..."
              className="flex-1 px-3 py-2 text-xs focus:outline-none transition-colors"
              style={{
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
                background: "var(--workspace-muted-bg)",
              }}
            />
            <button
              type="submit"
              disabled={searchMutation.isPending || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
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
                <p className="text-xs text-center py-4" style={{ color: "var(--workspace-muted)" }}>
                  No relevant chunks found. Try a different query or upload documents with relevant content.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                    {results.length} chunk{results.length !== 1 ? "s" : ""} retrieved
                  </p>
                  {results.map((chunk, idx) => (
                    <div key={chunk.id} className="p-3" style={{ border: "1px solid var(--workspace-border)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono" style={{ color: "var(--workspace-muted)" }}>#{idx + 1}</span>
                          <span className="text-[11px] font-medium" style={{ color: "var(--workspace-fg)" }}>{chunk.documentTitle}</span>
                          <span className="text-[9px]" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>chunk {chunk.chunkIndex + 1}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: "#16a34a" }}>
                          {Math.round(chunk.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: "var(--workspace-muted)" }}>
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
    </div>
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
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-4 h-4" style={{ color: "var(--workspace-muted)" }} />
            <h1 className="font-serif text-2xl font-light" style={{ color: "var(--workspace-fg)" }}>Knowledge Vault</h1>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--workspace-muted)" }}>
            Upload board decks, financial models, research reports, and contracts. Documents are semantically indexed for precise retrieval.
          </p>
        </div>
        <div>
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
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
            data-testid="btn-upload-document"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            Upload Document
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--workspace-muted)" }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
          <FileText className="w-8 h-8 mb-4" style={{ color: "var(--workspace-muted)", opacity: 0.4 }} />
          <p className="text-sm mb-2" style={{ color: "var(--workspace-muted)" }}>No documents yet</p>
          <p className="text-xs" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>Upload a PDF or DOCX to get started</p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--workspace-border)" }}>
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              className="flex items-start justify-between px-5 py-4 group transition-colors"
              style={{
                borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                background: "#FFFFFF",
              }}
              data-testid={`document-${doc.id}`}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--workspace-muted-bg)")}
              onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--workspace-muted)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--workspace-fg)" }}>{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>
                      {doc.fileType.toUpperCase()}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                    <StatusBadge status={doc.status} chunkCount={doc.chunkCount} />
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
                className="h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-4 mt-0.5"
                style={{ color: "var(--workspace-muted)" }}
                onClick={() => handleDelete(doc.id, doc.title)}
                data-testid={`btn-delete-document-${doc.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {readyDocIds.length > 0 && (
        <TestSearch docIds={readyDocIds} />
      )}

      <p className="text-[10px] mt-4 leading-relaxed" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
        Supported formats: PDF, DOCX · Maximum 5 documents per conversation · Semantic search powered by pgvector
      </p>
    </div>
  );
}
