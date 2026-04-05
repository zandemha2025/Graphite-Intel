import { useState, useEffect, useCallback } from "react";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useListDocuments,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { Building2, Database, Tag, Map } from "lucide-react";
import { ContextHealthScore } from "@/components/context/ContextHealthScore";
import { EnrichmentSuggestions } from "@/components/context/EnrichmentSuggestions";
import { CompanyProfile } from "@/components/context/CompanyProfile";
import { KnowledgeBase } from "@/components/context/KnowledgeBase";
import { Definitions } from "@/components/context/Definitions";
import { KnowledgeMap } from "@/components/context/KnowledgeMap";
import type { Definition } from "@/components/context/DefinitionForm";

type Tab = "profile" | "knowledge" | "definitions" | "map";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Company Profile", icon: <Building2 size={14} /> },
  { id: "knowledge", label: "Knowledge Base", icon: <Database size={14} /> },
  { id: "definitions", label: "Definitions", icon: <Tag size={14} /> },
  { id: "map", label: "Knowledge Map", icon: <Map size={14} /> },
];

const EXAMPLE_DEFINITIONS: Definition[] = [
  {
    id: "ex1",
    term: "TAM",
    value: "$4.2B (IDC 2025)",
    category: "market",
    confidence: "high",
  },
  {
    id: "ex2",
    term: "ARR",
    value:
      "Annualized Run Rate — total subscription revenue normalized to 12 months",
    category: "metric",
    confidence: "high",
  },
];

interface ConnectionSummary {
  id: number;
  name: string;
  appSlug: string;
  category: string;
  status: string;
  lastSyncAt: string | null;
}

export function ContextPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [definitions, setDefinitions] =
    useState<Definition[]>(EXAMPLE_DEFINITIONS);
  const [docCount, setDocCount] = useState(0);
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);

  const { data: profile } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() },
  });

  const { data: docs = [] } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });

  // Fetch connection summary
  useEffect(() => {
    fetch("/api/connectors/accounts/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((data) => {
        const accts = (data.accounts || []).map(
          (a: Record<string, unknown>) => ({
            id: a.id ?? 0,
            name: (a.name as string) || (a.appSlug as string) || "",
            appSlug: (a.appSlug as string) || "",
            category: (a.category as string) || "Other",
            status: (a.status as string) || "idle",
            lastSyncAt: (a.lastSyncAt as string) || null,
          }),
        );
        setConnections(accts);
      })
      .catch(() => setConnections([]));
  }, []);

  const resolvedDocCount = docs.length > 0 ? docs.length : docCount;

  const profileFields = {
    name: !!profile?.companyName,
    industry: !!profile?.industry,
    stage: !!profile?.stage,
    revenue: !!profile?.revenueRange,
    competitors: !!(profile?.competitors && profile.competitors.trim()),
    priorities: !!(
      profile?.strategicPriorities && profile.strategicPriorities.trim()
    ),
    researchSummary: !!(
      profile?.researchSummary && profile.researchSummary.trim()
    ),
  };

  const latestSync = connections.reduce<string | null>((latest, c) => {
    if (!c.lastSyncAt) return latest;
    if (!latest) return c.lastSyncAt;
    return new Date(c.lastSyncAt) > new Date(latest) ? c.lastSyncAt : latest;
  }, null);

  const handleNavigateTab = useCallback((tab: string) => {
    if (["profile", "knowledge", "definitions", "map"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <div
        className="pb-6 mb-6 border-b"
        style={{ borderColor: "#E5E7EB" }}
      >
        <h1
          className="font-sans text-2xl font-semibold tracking-tight mb-2"
          style={{ color: "#111827" }}
        >
          Context
        </h1>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Teach the platform about your business. Everything here gets injected
          into AI responses.
        </p>
      </div>

      <ContextHealthScore
        profileComplete={
          !!(
            profile?.companyName &&
            profile?.industry &&
            profile?.stage &&
            profile?.revenueRange
          )
        }
        companyName={profile?.companyName ?? ""}
        docCount={resolvedDocCount}
        definitionCount={definitions.length}
        connectionCount={connections.length}
        profileFields={profileFields}
        lastSyncAt={latestSync}
      />

      <EnrichmentSuggestions
        hasCompetitors={profileFields.competitors}
        docCount={resolvedDocCount}
        connectionCount={connections.length}
        definitionCount={definitions.length}
        definitions={definitions.map((d) => ({
          term: d.term,
          value: d.value,
        }))}
        hasPriorities={profileFields.priorities}
        connectedTypes={connections.map((c) => c.appSlug)}
        onNavigateTab={handleNavigateTab}
      />

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #E5E7EB",
          marginBottom: "28px",
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "11px 20px",
                fontSize: "12px",
                
                letterSpacing: "0.01em",
                border: "none",
                borderBottom: `2px solid ${active ? "#4F46E5" : "transparent"}`,
                background: "transparent",
                color: active ? "#4F46E5" : "#6B7280",
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "profile" && <CompanyProfile />}
      {activeTab === "knowledge" && (
        <KnowledgeBase onDocCountChange={setDocCount} />
      )}
      {activeTab === "definitions" && (
        <Definitions
          definitions={definitions}
          onDefinitionsChange={setDefinitions}
          onCountChange={() => {}}
        />
      )}
      {activeTab === "map" && (
        <KnowledgeMap
          documents={(docs as Array<{
            id: number;
            title: string;
            fileType: string;
            createdAt: string;
            status: string;
          }>)}
          connections={connections}
          definitions={definitions.map((d) => ({
            id: d.id,
            term: d.term,
            category: d.category,
          }))}
        />
      )}
    </div>
  );
}
