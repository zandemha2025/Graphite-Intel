import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, apiPut, apiPost, apiDelete } from "@/lib/api";
import { format } from "date-fns";
import {
  Building2,
  FileStack,
  BookMarked,
  Upload,
  Search,
  Trash2,
  Plus,
  Save,
  FileText,
  File,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

/* ---------- Types ---------- */

interface CompanyProfile {
  name: string;
  industry: string;
  stage: string;
  revenueRange: string;
  keyCompetitors: string[];
  strategicPriorities: string[];
  definitions?: StrategicDefinition[];
}

interface StrategicDefinition {
  id: string;
  term: string;
  definition: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  status: "processing" | "ready" | "error";
  uploadedAt: string;
  sizeBytes?: number;
}

interface ContextHealth {
  score: number;
  breakdown: {
    profile: number;
    documents: number;
    definitions: number;
  };
}

/* ---------- Tabs config ---------- */

const tabs = [
  { id: "profile", label: "Company Profile" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "definitions", label: "Strategic Definitions" },
];

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#F3F4F6] ${className ?? ""}`}
    />
  );
}

/* ---------- Context Health Score ---------- */

function ContextHealthScore() {
  const { data: health, isLoading } = useQuery<ContextHealth>({
    queryKey: ["context", "health"],
    queryFn: () => api<ContextHealth>("/context/health"),
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-48" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!health) return null;

  const scoreColor =
    health.score >= 70
      ? "text-green-700"
      : health.score >= 40
        ? "text-amber-700"
        : "text-red-700";

  const barColor =
    health.score >= 70
      ? "bg-green-500"
      : health.score >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              health.score >= 70
                ? "border-green-200 bg-green-50"
                : health.score >= 40
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50"
            }`}
          >
            <span className={`text-lg font-bold ${scoreColor}`}>
              {health.score}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[#111827]">
              Context Health Score
            </p>
            <p className="text-xs text-[#6B7280]">
              How well-calibrated the AI is to your business
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <BreakdownItem label="Profile" value={health.breakdown.profile} />
          <BreakdownItem label="Documents" value={health.breakdown.documents} />
          <BreakdownItem
            label="Definitions"
            value={health.breakdown.definitions}
          />
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${health.score}%` }}
        />
      </div>
    </Card>
  );
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-sm font-semibold text-[#111827]">{value}%</p>
      <p className="text-xs text-[#6B7280]">{label}</p>
    </div>
  );
}

/* ---------- Company Profile Tab ---------- */

interface ProfileFormValues {
  name: string;
  industry: string;
  stage: string;
  revenueRange: string;
  keyCompetitors: string;
  strategicPriorities: string;
}

function CompanyProfileTab() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => api<CompanyProfile>("/company-profile"),
  });

  const { register, handleSubmit, reset } = useForm<ProfileFormValues>();

  const mutation = useMutation({
    mutationFn: (data: ProfileFormValues) =>
      apiPut("/company-profile", {
        name: data.name,
        industry: data.industry,
        stage: data.stage,
        revenueRange: data.revenueRange,
        keyCompetitors: data.keyCompetitors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        strategicPriorities: data.strategicPriorities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      queryClient.invalidateQueries({ queryKey: ["context", "health"] });
      toast.success("Company profile saved");
    },
    onError: () => {
      toast.error("Failed to save profile");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-1.5 h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const defaultValues: ProfileFormValues = {
    name: profile?.name ?? "",
    industry: profile?.industry ?? "",
    stage: profile?.stage ?? "",
    revenueRange: profile?.revenueRange ?? "",
    keyCompetitors: profile?.keyCompetitors?.join(", ") ?? "",
    strategicPriorities: profile?.strategicPriorities?.join(", ") ?? "",
  };

  return (
    <Card>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4"
        key={JSON.stringify(defaultValues)}
      >
        <Input
          id="name"
          label="Company Name"
          defaultValue={defaultValues.name}
          placeholder="Acme Corp"
          {...register("name")}
        />
        <Input
          id="industry"
          label="Industry"
          defaultValue={defaultValues.industry}
          placeholder="B2B SaaS, Healthcare, FinTech..."
          {...register("industry")}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="stage"
            label="Stage"
            defaultValue={defaultValues.stage}
            placeholder="Series A, Growth, Enterprise..."
            {...register("stage")}
          />
          <Input
            id="revenueRange"
            label="Revenue Range"
            defaultValue={defaultValues.revenueRange}
            placeholder="$1M-$10M, $10M-$50M..."
            {...register("revenueRange")}
          />
        </div>
        <Input
          id="keyCompetitors"
          label="Key Competitors (comma-separated)"
          defaultValue={defaultValues.keyCompetitors}
          placeholder="Competitor A, Competitor B, Competitor C"
          {...register("keyCompetitors")}
        />
        <Input
          id="strategicPriorities"
          label="Strategic Priorities (comma-separated)"
          defaultValue={defaultValues.strategicPriorities}
          placeholder="Market expansion, Product-led growth, Enterprise sales"
          {...register("strategicPriorities")}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={mutation.isPending}>
            <Save className="h-4 w-4" />
            Save Profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ---------- Knowledge Base Tab ---------- */

function KnowledgeBaseTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Document[] | null>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: () =>
      api<{ documents: Document[] }>("/documents").then((r) => r.documents),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const presigned = await apiPost<{
        uploadUrl: string;
        documentId: string;
      }>("/documents", {
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
      });
      await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      return presigned;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["context", "health"] });
      toast.success("Document uploaded");
    },
    onError: () => {
      toast.error("Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["context", "health"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) =>
      apiPost<{ results: Document[] }>("/documents/search", { query }).then(
        (r) => r.results,
      ),
    onSuccess: (results) => {
      setSearchResults(results);
    },
  });

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    } else {
      setSearchResults(null);
    }
  }

  const displayDocs = searchResults ?? documents ?? [];

  function getTypeBadge(type: string) {
    const lower = type.toLowerCase();
    if (lower.includes("pdf"))
      return (
        <Badge variant="error">
          <FileText className="mr-1 h-3 w-3" />
          PDF
        </Badge>
      );
    if (lower.includes("doc") || lower.includes("word"))
      return (
        <Badge variant="info">
          <FileText className="mr-1 h-3 w-3" />
          DOCX
        </Badge>
      );
    if (lower.includes("text") || lower.includes("txt"))
      return (
        <Badge variant="default">
          <File className="mr-1 h-3 w-3" />
          TXT
        </Badge>
      );
    if (lower.includes("sheet") || lower.includes("csv") || lower.includes("excel"))
      return (
        <Badge variant="success">
          <File className="mr-1 h-3 w-3" />
          CSV
        </Badge>
      );
    return <Badge>{type.split("/").pop()?.toUpperCase() ?? "FILE"}</Badge>;
  }

  function getStatusIcon(status: Document["status"]) {
    if (status === "ready")
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "processing")
      return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Upload bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSearch}
          loading={searchMutation.isPending}
        >
          Search
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
          onChange={handleUpload}
        />
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          loading={uploadMutation.isPending}
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>

      {searchResults !== null && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#6B7280]">
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}{" "}
            for &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => {
              setSearchResults(null);
              setSearchQuery("");
            }}
            className="text-xs text-[#4F46E5] hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Document list */}
      {displayDocs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <FileStack className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            {searchResults !== null ? "No matching documents" : "No documents yet"}
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            {searchResults !== null
              ? "Try a different search term."
              : "Upload PDFs, docs, and spreadsheets to build your knowledge base."}
          </p>
          {searchResults === null && (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          )}
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                  Uploaded
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">
                  Status
                </th>
                <th className="w-12 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {displayDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3 font-medium text-[#111827]">
                    {doc.name}
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(doc.type)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(doc.status)}
                      <span className="text-[#6B7280] capitalize">
                        {doc.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="rounded p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Strategic Definitions Tab ---------- */

function StrategicDefinitionsTab() {
  const queryClient = useQueryClient();
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");

  const { data: profile, isLoading } = useQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => api<CompanyProfile>("/company-profile"),
  });

  const definitions = profile?.definitions ?? [];

  const saveMutation = useMutation({
    mutationFn: (updatedDefinitions: StrategicDefinition[]) =>
      apiPut("/company-profile", {
        ...profile,
        definitions: updatedDefinitions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      queryClient.invalidateQueries({ queryKey: ["context", "health"] });
    },
    onError: () => {
      toast.error("Failed to save definitions");
    },
  });

  function handleAdd() {
    if (!newTerm.trim() || !newDefinition.trim()) {
      toast.error("Both term and definition are required");
      return;
    }
    const updated = [
      ...definitions,
      {
        id: crypto.randomUUID(),
        term: newTerm.trim(),
        definition: newDefinition.trim(),
      },
    ];
    saveMutation.mutate(updated);
    setNewTerm("");
    setNewDefinition("");
    toast.success("Definition added");
  }

  function handleDelete(id: string) {
    const updated = definitions.filter((d) => d.id !== id);
    saveMutation.mutate(updated);
    toast.success("Definition removed");
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add new definition */}
      <Card>
        <p className="mb-3 text-sm font-medium text-[#111827]">
          Add Definition
        </p>
        <div className="space-y-3">
          <Input
            placeholder="Term (e.g., TAM, ARR, Competitor A)"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
          />
          <textarea
            className="h-20 w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            placeholder="Definition or context (e.g., Our TAM is $4.2B based on bottom-up analysis of enterprise customers in North America)"
            value={newDefinition}
            onChange={(e) => setNewDefinition(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              loading={saveMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Add Definition
            </Button>
          </div>
        </div>
      </Card>

      {/* Definitions list */}
      {definitions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <BookMarked className="mb-3 h-8 w-8 text-[#D1D5DB]" />
          <p className="text-sm font-medium text-[#111827]">
            No definitions yet
          </p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Define terms, metrics, and relationships that teach the AI your
            domain language.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {definitions.map((def) => (
            <Card key={def.id} className="group relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111827]">
                    {def.term}
                  </p>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {def.definition}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(def.id)}
                  className="ml-3 rounded p-1 text-[#D1D5DB] opacity-0 group-hover:opacity-100 hover:bg-[#F3F4F6] hover:text-red-500 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function ContextPage() {
  return (
    <Page
      title="Context"
      subtitle="Business knowledge that grounds every AI response"
    >
      <ContextHealthScore />
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "profile") return <CompanyProfileTab />;
          if (activeTab === "knowledge") return <KnowledgeBaseTab />;
          return <StrategicDefinitionsTab />;
        }}
      </Tabs>
    </Page>
  );
}
