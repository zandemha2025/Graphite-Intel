import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  useListDocuments,
  getListDocumentsQueryKey,
  useCreateDocument,
  useDeleteDocument,
  useProcessDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Loader2, FileText, FileCheck, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DocStatus = "processing" | "ready" | "failed";

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest" style={{ color: "#16a34a" }}>
        <FileCheck className="w-3 h-3" />
        Ready
      </span>
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
          },
          onError: () => {
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          },
        },
      );

      toast({ title: `"${doc.title}" uploaded — processing...` });
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

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-4 h-4" style={{ color: "var(--workspace-muted)" }} />
            <h1 className="font-serif text-2xl font-light" style={{ color: "var(--workspace-fg)" }}>Knowledge Vault</h1>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--workspace-muted)" }}>
            Upload board decks, financial models, research reports, and contracts. Attach them to conversations so the AI can analyze your actual materials.
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
              className="flex items-center justify-between px-5 py-4 group transition-colors"
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
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--workspace-fg)" }}>{doc.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>
                      {doc.fileType.toUpperCase()}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
              </div>
              <button
                className="h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-4"
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

      <p className="text-[10px] mt-4 leading-relaxed" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
        Supported formats: PDF, DOCX · Maximum 5 documents per conversation
      </p>
    </div>
  );
}
