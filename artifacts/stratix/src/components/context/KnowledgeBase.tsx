import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  useListDocuments,
  getListDocumentsQueryKey,
  useCreateDocument,
  useDeleteDocument,
  useProcessDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Trash2,
  Loader2,
  FileText,
  FileCheck,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onDocCountChange?: (count: number) => void;
}

type KBDocument = {
  id: number;
  title: string;
  fileType: string;
  createdAt: string;
  status: string;
  chunkCount?: number | null;
};

function StatusBadge({
  status,
  chunkCount,
}: {
  status: string;
  chunkCount?: number | null;
}) {
  if (status === "ready") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#16a34a",
          }}
        >
          <FileCheck size={11} /> Ready
        </span>
        {chunkCount != null && chunkCount > 0 && (
          <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
            {chunkCount} chunk{chunkCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }
  if (status === "processing") {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#D97706",
        }}
      >
        <Loader2 size={11} className="animate-spin" /> Processing
      </span>
    );
  }
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "#DC2626",
      }}
    >
      <AlertCircle size={11} /> Failed
    </span>
  );
}

export function KnowledgeBase({ onDocCountChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: rawDocs = [], isLoading } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });
  const docs = rawDocs as KBDocument[];

  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const processDocument = useProcessDocument();

  useEffect(() => {
    onDocCountChange?.(docs.length);
  }, [docs.length, onDocCountChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["pdf", "docx", "xlsx", "pptx", "csv"];
    if (!allowed.includes(ext)) {
      toast({
        title: "Unsupported file type. Upload PDF, DOCX, XLSX, PPTX, or CSV.",
        variant: "destructive",
      });
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
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const doc = await createDocument.mutateAsync({
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          fileType: ext,
          objectKey: objectPath,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });

      processDocument.mutate(
        { id: doc.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListDocumentsQueryKey(),
            });
            setTimeout(
              () =>
                queryClient.invalidateQueries({
                  queryKey: getListDocumentsQueryKey(),
                }),
              3000,
            );
          },
          onError: () =>
            queryClient.invalidateQueries({
              queryKey: getListDocumentsQueryKey(),
            }),
        },
      );

      toast({ title: `"${doc.title}" uploaded — indexing…` });
    } catch {
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
        onError: () =>
          toast({ title: "Delete failed", variant: "destructive" }),
      },
    );
  };

  const filteredDocs = searchQuery
    ? docs.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : docs;

  return (
    <div>
      {/* Search + Upload bar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            padding: "0 12px",
          }}
        >
          <Search size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "#111827",
              background: "transparent",
              padding: "10px 0",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9CA3AF",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.pptx,.csv"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: "#4F46E5",
            color: "#FFFFFF",
            border: "none",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          Upload
        </button>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "56px", background: "#F3F4F6" }}
            />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            border: "1px dashed #E5E7EB",
          }}
        >
          <FileText
            size={32}
            style={{ color: "#D1D5DB", margin: "0 auto 12px", display: "block" }}
          />
          <p style={{ fontSize: "14px", color: "#6B7280" }}>
            {searchQuery
              ? "No documents match your search."
              : "No documents yet. Upload PDFs, decks, or spreadsheets to get started."}
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid #E5E7EB" }}>
          {filteredDocs.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "#FFFFFF",
                borderBottom:
                  i < filteredDocs.length - 1 ? "1px solid #F3F4F6" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <FileText
                  size={15}
                  style={{ color: "#9CA3AF", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        color: "#9CA3AF",
                      }}
                    >
                      {doc.fileType}
                    </span>
                    <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flexShrink: 0,
                }}
              >
                <StatusBadge
                  status={doc.status}
                  chunkCount={doc.chunkCount}
                />
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#D1D5DB",
                    padding: "4px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#EF4444")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#D1D5DB")
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredDocs.length > 0 && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#9CA3AF" }}>
          {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
