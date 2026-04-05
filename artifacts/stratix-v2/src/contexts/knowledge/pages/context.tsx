import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Brain,
  FileText,
  BookOpen,
  Map,
  Plus,
  Pencil,
  Trash2,
  Lightbulb,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/ui/skeleton";
import { api, apiPost, apiPut } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HealthBreakdown {
  profile: number;
  documents: number;
  sources: number;
  definitions: number;
  freshness: number;
}

interface ContextHealth {
  score: number;
  breakdown: HealthBreakdown;
}

interface CompanyProfile {
  name: string;
  industry: string;
  stage: string;
  revenue: string;
  competitors: string;
  priorities: string;
}

interface Document {
  id: number;
  title: string;
  type: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Health ring                                                        */
/* ------------------------------------------------------------------ */

function HealthRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 40 ? "#DC2626" : score < 70 ? "#F59E0B" : "#10B981";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke="#F3F3F1" strokeWidth="10"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-[#0A0A0A]">{score}</span>
        <span className="text-xs text-[#9CA3AF]">/ 100</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Breakdown bar                                                      */
/* ------------------------------------------------------------------ */

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const color = value < 40 ? "bg-red-500" : value < 70 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#404040] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#F3F3F1] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-[#0A0A0A] w-8 text-right">{value}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Enrichment suggestions                                             */
/* ------------------------------------------------------------------ */

function EnrichmentSuggestions({ health }: { health: ContextHealth | undefined }) {
  if (!health) return null;
  const suggestions: { message: string; priority: "high" | "medium" }[] = [];
  const b = health.breakdown;

  if (b.profile < 50) suggestions.push({ message: "Complete your company profile to improve context accuracy", priority: "high" });
  if (b.documents < 30) suggestions.push({ message: "Upload key documents (pitch deck, strategy docs, reports)", priority: "high" });
  if (b.sources < 40) suggestions.push({ message: "Connect more data sources for richer intelligence", priority: "medium" });
  if (b.definitions < 50) suggestions.push({ message: "Add industry-specific definitions and terminology", priority: "medium" });
  if (b.freshness < 60) suggestions.push({ message: "Review and update stale information", priority: "medium" });

  if (suggestions.length === 0) return null;

  return (
    <Card className="bg-[#FFFBEB] border-yellow-200">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-yellow-600" />
        <h3 className="text-sm font-semibold text-[#0A0A0A]">Enrichment Suggestions</h3>
      </div>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#404040]">
            {s.priority === "high" ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
            )}
            {s.message}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Company profile form                                               */
/* ------------------------------------------------------------------ */

function ProfileForm({ initial }: { initial?: CompanyProfile }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanyProfile>(
    initial ?? { name: "", industry: "", stage: "", revenue: "", competitors: "", priorities: "" },
  );
  const [dirty, setDirty] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => (initial ? apiPut("/company-profile", form) : apiPost("/company-profile", form)),
    onSuccess: () => {
      toast.success("Profile saved");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      queryClient.invalidateQueries({ queryKey: ["context-health"] });
    },
    onError: () => toast.error("Failed to save profile"),
  });

  const update = (key: keyof CompanyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const fields: { key: keyof CompanyProfile; label: string; placeholder: string }[] = [
    { key: "name", label: "Company Name", placeholder: "Acme Corp" },
    { key: "industry", label: "Industry", placeholder: "SaaS, Fintech, etc." },
    { key: "stage", label: "Stage", placeholder: "Series A, Growth, Public" },
    { key: "revenue", label: "Revenue Range", placeholder: "$1M-$10M ARR" },
    { key: "competitors", label: "Key Competitors", placeholder: "Competitor A, Competitor B" },
    { key: "priorities", label: "Strategic Priorities", placeholder: "Expand EMEA, launch v2, etc." },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-[#404040] mb-1.5">{f.label}</label>
            <Input
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
      {dirty && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Save Profile
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Definitions manager                                                */
/* ------------------------------------------------------------------ */

interface Definition {
  id: string;
  term: string;
  value: string;
  category: string;
}

interface ProfileWithDefinitions {
  id: number;
  companyName: string;
  industry: string;
  stage: string;
  revenueRange: string;
  competitors: string;
  strategicPriorities: string;
  definitions?: Definition[];
}

function DefinitionsTab() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<ProfileWithDefinitions>({
    queryKey: ["company-profile"],
    queryFn: () => api<ProfileWithDefinitions>("/company-profile"),
  });

  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  // Load definitions from profile on first load
  useState(() => {
    if (!initialized && profile?.definitions) {
      setDefinitions(profile.definitions);
      setInitialized(true);
    }
  });

  // Sync when profile loads
  if (!initialized && profile?.definitions && profile.definitions.length > 0) {
    setDefinitions(profile.definitions);
    setInitialized(true);
  }

  const persistMutation = useMutation({
    mutationFn: (defs: Definition[]) =>
      apiPut("/company-profile", {
        ...(profile ?? {}),
        companyName: profile?.companyName,
        industry: profile?.industry,
        stage: profile?.stage,
        revenueRange: profile?.revenueRange,
        competitors: profile?.competitors,
        strategicPriorities: profile?.strategicPriorities,
        definitions: defs,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      queryClient.invalidateQueries({ queryKey: ["context-health"] });
    },
    onError: () => toast.error("Failed to save definitions"),
  });

  const addDefinition = () => {
    if (!newTerm.trim() || !newValue.trim()) return;
    const updated = [
      ...definitions,
      { id: crypto.randomUUID(), term: newTerm, value: newValue, category: newCategory },
    ];
    setDefinitions(updated);
    persistMutation.mutate(updated);
    setNewTerm("");
    setNewValue("");
    toast.success("Definition added");
  };

  const removeDefinition = (id: string) => {
    const updated = definitions.filter((d) => d.id !== id);
    setDefinitions(updated);
    persistMutation.mutate(updated);
    toast.success("Definition removed");
  };

  const categories = [...new Set(definitions.map((d) => d.category)), "General", "Industry", "Product", "Financial"];
  const uniqueCategories = [...new Set(categories)];

  return (
    <div className="space-y-5">
      {/* Add form */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-[#0A0A0A]">Add Definition</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Term" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
          <Input placeholder="Definition" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <div className="flex gap-2">
            <select
              className="flex h-9 flex-1 rounded-lg border border-[#E5E5E3] bg-white px-3 text-sm text-[#0A0A0A]"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button size="sm" onClick={addDefinition}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Definitions list */}
      {definitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <BookOpen className="h-8 w-8 text-[#9CA3AF] mb-3" />
          <p className="text-sm text-[#404040]">No definitions yet</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Add key terms and their definitions to improve AI context</p>
        </div>
      ) : (
        <div className="space-y-2">
          {definitions.map((def) => (
            <Card key={def.id} className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Badge variant="default">{def.category}</Badge>
                <span className="text-sm font-medium text-[#0A0A0A]">{def.term}</span>
                <span className="text-sm text-[#9CA3AF] truncate">{def.value}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#404040] hover:bg-[#F6F5F4] transition-colors"
                  onClick={() => setEditing(def.id === editing ? null : def.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-lg p-1.5 text-[#9CA3AF] hover:text-red-600 hover:bg-[#FEF2F2] transition-colors"
                  onClick={() => removeDefinition(def.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Knowledge Map tab                                                  */
/* ------------------------------------------------------------------ */

function KnowledgeMapTab({ health }: { health: ContextHealth | undefined }) {
  const areas = [
    { label: "Company Profile", key: "profile" as const, icon: Brain },
    { label: "Documents", key: "documents" as const, icon: FileText },
    { label: "Data Sources", key: "sources" as const, icon: BookOpen },
    { label: "Definitions", key: "definitions" as const, icon: BookOpen },
    { label: "Freshness", key: "freshness" as const, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#404040]">
        Overview of intelligence coverage across key areas. Strengthen weak areas to improve overall context quality.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((area) => {
          const value = health?.breakdown[area.key] ?? 0;
          const status = value >= 70 ? "Strong" : value >= 40 ? "Moderate" : "Weak";
          const variant = value >= 70 ? "success" : value >= 40 ? "warning" : "error";
          const Icon = area.icon;
          return (
            <Card key={area.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#404040]" />
                  <span className="text-sm font-medium text-[#0A0A0A]">{area.label}</span>
                </div>
                <Badge variant={variant}>{status}</Badge>
              </div>
              <div className="h-2 bg-[#F3F3F1] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {value >= 70 ? "Good coverage in this area" : value >= 40 ? "Some information available, could be improved" : "Limited data, needs attention"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ContextPage() {
  const { data: health, isLoading: healthLoading } = useQuery<ContextHealth>({
    queryKey: ["context-health"],
    queryFn: () => api<ContextHealth>("/context/health"),
  });

  const { data: profile, isLoading: profileLoading } = useQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => api<CompanyProfile>("/company-profile"),
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: () => api<Document[]>("/documents"),
  });

  return (
    <Page title="Context" subtitle="Your company intelligence brain">
      {/* Health Score + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="flex flex-col items-center justify-center py-6 lg:col-span-1">
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Context Health
          </h3>
          {healthLoading ? (
            <div className="h-[140px] w-[140px] rounded-full bg-[#F3F3F1] animate-pulse" />
          ) : (
            <HealthRing score={health?.score ?? 0} />
          )}
        </Card>

        <Card className="lg:col-span-1 flex flex-col justify-center">
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Breakdown
          </h3>
          {healthLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-[#F3F3F1] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <BreakdownBar label="Profile" value={health?.breakdown.profile ?? 0} />
              <BreakdownBar label="Documents" value={health?.breakdown.documents ?? 0} />
              <BreakdownBar label="Sources" value={health?.breakdown.sources ?? 0} />
              <BreakdownBar label="Definitions" value={health?.breakdown.definitions ?? 0} />
              <BreakdownBar label="Freshness" value={health?.breakdown.freshness ?? 0} />
            </div>
          )}
        </Card>

        <div className="lg:col-span-1">
          <EnrichmentSuggestions health={health} />
          {!healthLoading && health && health.score >= 80 && (
            <Card className="bg-[#ECFDF5] border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">Context is well enriched</p>
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                Your AI has strong context for generating quality intelligence.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <Brain className="h-3.5 w-3.5 mr-1.5 inline" />
            Company Profile
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <FileText className="h-3.5 w-3.5 mr-1.5 inline" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="definitions">
            <BookOpen className="h-3.5 w-3.5 mr-1.5 inline" />
            Definitions
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-3.5 w-3.5 mr-1.5 inline" />
            Knowledge Map
          </TabsTrigger>
        </TabsList>

        {/* Company Profile */}
        <TabsContent value="profile">
          {profileLoading ? (
            <CardSkeleton />
          ) : (
            <Card>
              <h3 className="text-sm font-semibold text-[#0A0A0A] mb-4">Company Information</h3>
              <ProfileForm initial={profile} />
            </Card>
          )}
        </TabsContent>

        {/* Knowledge Base */}
        <TabsContent value="knowledge">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0A0A0A]">Knowledge Base</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {documents?.length ?? 0} document{(documents?.length ?? 0) !== 1 ? "s" : ""} uploaded
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => toast.info("Upload coming soon")}>
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            </div>

            {!documents || documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-[#E5E5E3] rounded-xl">
                <FileText className="h-8 w-8 text-[#9CA3AF] mb-3" />
                <p className="text-sm text-[#404040]">No documents yet</p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Upload pitch decks, strategy docs, and reports to enrich context
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#E5E5E3] hover:border-[#C8C8C6] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[#9CA3AF]" />
                      <span className="text-sm text-[#0A0A0A]">{doc.title}</span>
                    </div>
                    <Badge variant="default">{doc.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Definitions */}
        <TabsContent value="definitions">
          <DefinitionsTab />
        </TabsContent>

        {/* Knowledge Map */}
        <TabsContent value="map">
          <KnowledgeMapTab health={health} />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
