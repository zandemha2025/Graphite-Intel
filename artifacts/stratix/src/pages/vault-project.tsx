import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Plus,
  Loader2,
  GitCompare,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Document = {
  id: number;
  title: string;
  fileType: string;
  createdAt: string;
  status: "processing" | "ready" | "failed";
  chunkCount?: number;
};

type ExtractionResult = {
  id: number;
  documentId: number;
  templateId: number;
  templateName: string;
  data: Record<string, any>;
  createdAt: string;
};

type VaultProject = {
  id: number;
  name: string;
  description: string;
  matterType: string;
  status: "active" | "archived";
  createdAt: string;
  documents: Document[];
};

type ExtractionTemplate = {
  id: number;
  name: string;
  description?: string;
};

export function VaultProject() {
  const { toast } = useToast();
  const [, params] = useRoute("/vault/:id");
  const projectId = params?.id ? parseInt(params.id) : null;

  const [project, setProject] = useState<VaultProject | null>(null);
  const [extractions, setExtractions] = useState<ExtractionResult[]>([]);
  const [templates, setTemplates] = useState<ExtractionTemplate[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "extractions" | "compare">("documents");
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [extractingDocId, setExtractingDocId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [compareQuestion, setCompareQuestion] = useState("");
  const [compareResult, setCompareResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editData, setEditData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [projRes, templatesRes, docsRes] = await Promise.all([
        fetch(`/api/vault/projects/${projectId}`, { credentials: "include" }),
        fetch("/api/extraction-templates", { credentials: "include" }),
        fetch("/api/documents", { credentials: "include" }),
      ]);

      if (!projRes.ok) throw new Error("Failed to load project");
      const projData = await projRes.json();
      setProject(projData);
      setEditData({ name: projData.name, description: projData.description });

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setAvailableDocuments(docsData);
      }

      // Load extractions for all documents
      const extractionResults: ExtractionResult[] = [];
      for (const doc of projData.documents) {
        try {
          const extRes = await fetch(`/api/documents/${doc.id}/extractions`, {
            credentials: "include",
          });
          if (extRes.ok) {
            const extData = await extRes.json();
            extractionResults.push(...extData);
          }
        } catch (err) {
          // Silently continue if extractions don't load
        }
      }
      setExtractions(extractionResults);
    } catch (err) {
      toast({ title: "Failed to load project", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/vault/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error("Failed to update project");
      const updated = await res.json();
      setProject(updated);
      setEditingProject(false);
      toast({ title: "Project updated" });
    } catch (err) {
      toast({ title: "Failed to update project", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    if (
      !confirm(
        `Delete project "${project?.name}"? This cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/vault/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      window.location.href = "/vault";
    } catch (err) {
      toast({ title: "Failed to delete project", variant: "destructive" });
    }
  };

  const handleAddDocuments = async () => {
    if (!projectId || selectedDocuments.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/vault/projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentIds: selectedDocuments }),
      });
      if (!res.ok) throw new Error("Failed to add documents");
      await loadProject();
      setShowDocumentPicker(false);
      setSelectedDocuments([]);
      toast({ title: `${selectedDocuments.length} document(s) added` });
    } catch (err) {
      toast({ title: "Failed to add documents", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDocument = async (docId: number) => {
    if (!projectId) return;
    if (!confirm("Remove this document from the project?")) return;

    try {
      const res = await fetch(
        `/api/vault/projects/${projectId}/documents/${docId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to remove document");
      setProject(
        project
          ? { ...project, documents: project.documents.filter((d) => d.id !== docId) }
          : null
      );
      toast({ title: "Document removed" });
    } catch (err) {
      toast({ title: "Failed to remove document", variant: "destructive" });
    }
  };

  const handleExtractData = async (docId: number) => {
    if (!selectedTemplate) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }

    setExtractingDocId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (!res.ok) throw new Error("Failed to extract data");
      await loadProject();
      toast({ title: "Data extracted successfully" });
    } catch (err) {
      toast({ title: "Failed to extract data", variant: "destructive" });
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedTemplate) return;

    setIsComparing(true);
    try {
      const res = await fetch(`/api/vault/projects/${projectId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (!res.ok) throw new Error("Failed to compare documents");
      const result = await res.json();
      setCompareResult(result);
    } catch (err) {
      toast({ title: "Failed to compare documents", variant: "destructive" });
    } finally {
      setIsComparing(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "var(--workspace-muted)" }}
        />
      </div>
    );
  }

  const docExtractions = (docId: number) =>
    extractions.filter((e) => e.documentId === docId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <Link
          href="/vault"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest mb-4 transition-colors"
          style={{ color: "var(--workspace-muted)" }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Vault
        </Link>

        {editingProject ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="block w-full font-serif text-4xl font-light focus:outline-none transition-colors mb-2"
              style={{
                color: "var(--workspace-fg)",
                borderBottom: "1px solid var(--workspace-border)",
              }}
            />
            <input
              type="text"
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              className="block w-full text-sm focus:outline-none transition-colors"
              style={{
                color: "var(--workspace-muted)",
                borderBottom: "1px solid var(--workspace-border)",
              }}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProject(false)}
                className="px-3 py-1 text-xs uppercase tracking-widest transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-muted)",
                  background: "#FFFFFF",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3 py-1 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1
              className="font-serif text-4xl font-light mb-2"
              style={{ color: "var(--workspace-fg)" }}
            >
              {project.name}
            </h1>
            <p className="text-sm mb-4" style={{ color: "var(--workspace-muted)" }}>
              {project.description}
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              {project.matterType && (
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-0.5"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: "var(--workspace-muted)",
                  }}
                >
                  {project.matterType}
                </span>
              )}
              <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>
                Created {format(new Date(project.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingProject(true)}
                className="px-3 py-1 text-xs uppercase tracking-widest transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-muted)",
                  background: "#FFFFFF",
                }}
              >
                Edit
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-3 py-1 text-xs uppercase tracking-widest transition-colors"
                style={{
                  border: "1px solid #dc2626",
                  color: "#dc2626",
                  background: "#FFFFFF",
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        {(["documents", "extractions", "compare"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-0 py-3 text-xs uppercase tracking-widest font-medium transition-colors relative"
            style={{
              color:
                activeTab === tab
                  ? "var(--workspace-fg)"
                  : "var(--workspace-muted)",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--workspace-fg)"
                  : "transparent",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {!showDocumentPicker ? (
            <button
              onClick={() => setShowDocumentPicker(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Documents
            </button>
          ) : (
            <div
              className="p-4 border"
              style={{
                borderColor: "var(--workspace-border)",
                background: "#FFFFFF",
              }}
            >
              <p
                className="text-xs mb-3"
                style={{ color: "var(--workspace-muted)" }}
              >
                Select documents from your Knowledge Vault
              </p>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {(() => {
                  const projectDocIds = new Set(project.documents.map((d) => d.id));
                  const pickableDocs = availableDocuments.filter(
                    (d) => d.status === "ready" && !projectDocIds.has(d.id)
                  );
                  if (pickableDocs.length === 0) {
                    return (
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--workspace-muted)", opacity: 0.6 }}
                      >
                        No additional documents available. Upload documents in the Knowledge Vault first.
                      </p>
                    );
                  }
                  return pickableDocs.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments((prev) => [...prev, doc.id]);
                          } else {
                            setSelectedDocuments((prev) => prev.filter((id) => id !== doc.id));
                          }
                        }}
                        className="accent-[var(--workspace-fg)]"
                      />
                      <FileText className="w-3 h-3 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                      <span className="text-xs truncate" style={{ color: "var(--workspace-fg)" }}>
                        {doc.title}
                      </span>
                      <span
                        className="text-[10px] uppercase ml-auto shrink-0"
                        style={{ color: "var(--workspace-muted)" }}
                      >
                        {doc.fileType}
                      </span>
                    </label>
                  ));
                })()}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDocumentPicker(false)}
                  className="px-3 py-1 text-xs uppercase tracking-widest transition-colors"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    color: "var(--workspace-muted)",
                    background: "#FFFFFF",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddDocuments}
                  disabled={isSaving || selectedDocuments.length === 0}
                  className="px-3 py-1 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                  style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
                >
                  Add Selected
                </button>
              </div>
            </div>
          )}

          {project.documents.length === 0 ? (
            <div
              className="py-12 text-center border-dashed"
              style={{ border: "1px dashed var(--workspace-border)" }}
            >
              <FileText
                className="h-6 w-6 mx-auto mb-3"
                style={{ color: "var(--workspace-muted)" }}
              />
              <p style={{ color: "var(--workspace-muted)" }}>
                No documents added yet
              </p>
            </div>
          ) : (
            <div style={{ border: "1px solid var(--workspace-border)" }}>
              {project.documents.map((doc, i) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between px-5 py-4 group transition-colors"
                  style={{
                    borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined,
                    background: "#FFFFFF",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--workspace-muted-bg)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#FFFFFF")
                  }
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText
                      className="h-4 w-4 shrink-0 mt-0.5"
                      style={{ color: "var(--workspace-muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--workspace-fg)" }}
                      >
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span
                          className="text-[10px] uppercase tracking-widest"
                          style={{ color: "var(--workspace-muted)" }}
                        >
                          {doc.fileType.toUpperCase()}
                        </span>
                        <span
                          className="text-[10px]"
                          style={{
                            color: "var(--workspace-muted)",
                            opacity: 0.6,
                          }}
                        >
                          {format(new Date(doc.createdAt), "MMM d, yyyy")}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-widest flex items-center gap-1 ${
                            doc.status === "processing" ? "animate-pulse" : ""
                          }`}
                          style={{
                            color:
                              doc.status === "ready"
                                ? "#16a34a"
                                : doc.status === "processing"
                                  ? "var(--workspace-fg)"
                                  : "#dc2626",
                          }}
                        >
                          {doc.status === "ready" && "✓"}
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4 mt-0.5"
                    style={{ color: "var(--workspace-muted)" }}
                    onClick={() => handleRemoveDocument(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extractions Tab */}
      {activeTab === "extractions" && (
        <div className="space-y-6">
          {templates.length > 0 && (
            <div
              className="p-4 border"
              style={{
                borderColor: "var(--workspace-border)",
                background: "var(--workspace-muted-bg)",
              }}
            >
              <label
                className="block text-xs uppercase tracking-widest mb-2"
                style={{ color: "var(--workspace-muted)" }}
              >
                Extraction Template
              </label>
              <select
                value={selectedTemplate || ""}
                onChange={(e) =>
                  setSelectedTemplate(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                  background: "#FFFFFF",
                }}
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {project.documents.length === 0 ? (
            <div
              className="py-12 text-center border-dashed"
              style={{ border: "1px dashed var(--workspace-border)" }}
            >
              <AlertCircle
                className="h-6 w-6 mx-auto mb-3"
                style={{ color: "var(--workspace-muted)" }}
              />
              <p style={{ color: "var(--workspace-muted)" }}>
                Add documents first to extract data
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.documents.map((doc) => {
                const docExtracts = docExtractions(doc.id);
                return (
                  <div
                    key={doc.id}
                    className="border"
                    style={{
                      borderColor: "var(--workspace-border)",
                      background: "#FFFFFF",
                    }}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--workspace-fg)" }}
                          >
                            {doc.title}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{
                              color: "var(--workspace-muted)",
                              opacity: 0.7,
                            }}
                          >
                            {docExtracts.length} extraction
                            {docExtracts.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleExtractData(doc.id)}
                          disabled={!selectedTemplate || extractingDocId === doc.id}
                          className="flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                          style={{
                            border: "1px solid var(--workspace-border)",
                            color: "var(--workspace-muted)",
                            background: "#FFFFFF",
                          }}
                        >
                          {extractingDocId === doc.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Layers className="h-3 w-3" />
                          )}
                          Extract
                        </button>
                      </div>

                      {docExtracts.length > 0 && (
                        <div
                          className="mt-3 p-3 space-y-2 border-t"
                          style={{ borderColor: "var(--workspace-border)" }}
                        >
                          {docExtracts.map((ext) => (
                            <div key={ext.id}>
                              <p
                                className="text-[10px] uppercase tracking-widest mb-1"
                                style={{ color: "var(--workspace-muted)" }}
                              >
                                {ext.templateName}
                              </p>
                              <pre
                                className="text-[10px] p-2 overflow-x-auto max-h-32"
                                style={{
                                  background: "var(--workspace-muted-bg)",
                                  color: "var(--workspace-muted)",
                                }}
                              >
                                {JSON.stringify(ext.data, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          {project.documents.length === 0 ? (
            <div
              className="py-12 text-center border-dashed"
              style={{ border: "1px dashed var(--workspace-border)" }}
            >
              <AlertCircle
                className="h-6 w-6 mx-auto mb-3"
                style={{ color: "var(--workspace-muted)" }}
              />
              <p style={{ color: "var(--workspace-muted)" }}>
                Add at least 2 documents to compare
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleCompare} className="space-y-4">
                <div>
                  <label
                    className="block text-xs uppercase tracking-widest mb-2"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    Extraction Template
                  </label>
                  <select
                    value={selectedTemplate ?? ""}
                    onChange={(e) => setSelectedTemplate(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 text-xs focus:outline-none transition-colors"
                    style={{
                      border: "1px solid var(--workspace-border)",
                      color: "var(--workspace-fg)",
                      background: "var(--workspace-muted-bg)",
                    }}
                  >
                    <option value="">Select a template to compare across documents...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.description ? ` — ${t.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isComparing || !selectedTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-40"
                  style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
                >
                  {isComparing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <GitCompare className="h-3 w-3" />
                  )}
                  Compare
                </button>
              </form>

              {compareResult && (
                <div
                  className="p-4 border"
                  style={{
                    borderColor: "var(--workspace-border)",
                    background: "#FFFFFF",
                  }}
                >
                  <h4
                    className="text-sm font-medium mb-3"
                    style={{ color: "var(--workspace-fg)" }}
                  >
                    Comparison Results
                  </h4>
                  <div
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--workspace-muted)" }}
                  >
                    {typeof compareResult === "string" ? (
                      <p>{compareResult}</p>
                    ) : (
                      <pre className="overflow-x-auto text-[10px] p-2" style={{ background: "var(--workspace-muted-bg)" }}>
                        {JSON.stringify(compareResult, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
