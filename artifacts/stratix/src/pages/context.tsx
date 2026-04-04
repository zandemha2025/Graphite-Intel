import { useState } from "react";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useListDocuments,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { Building2, Database, Tag } from "lucide-react";
import { ContextHealthScore } from "@/components/context/ContextHealthScore";
import { CompanyProfile } from "@/components/context/CompanyProfile";
import { KnowledgeBase } from "@/components/context/KnowledgeBase";
import { Definitions } from "@/components/context/Definitions";

type Tab = "profile" | "knowledge" | "definitions";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Company Profile", icon: <Building2 size={14} /> },
  { id: "knowledge", label: "Knowledge Base", icon: <Database size={14} /> },
  {
    id: "definitions",
    label: "Definitions",
    icon: <Tag size={14} />,
  },
];

export function ContextPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [definitionCount, setDefinitionCount] = useState(2);
  const [docCount, setDocCount] = useState(0);

  const { data: profile } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() },
  });

  const { data: docs = [] } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });

  const profileComplete = !!(
    profile?.companyName &&
    profile?.industry &&
    profile?.stage &&
    profile?.revenueRange
  );
  const companyName = profile?.companyName ?? "";
  const resolvedDocCount = docs.length > 0 ? docs.length : docCount;

  return (
    <div className="animate-in fade-in duration-500">
      <div
        className="pb-6 mb-6 border-b"
        style={{ borderColor: "#E5E7EB" }}
      >
        <h1
          className="font-serif text-5xl font-light mb-2"
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
        profileComplete={profileComplete}
        companyName={companyName}
        docCount={resolvedDocCount}
        definitionCount={definitionCount}
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
                textTransform: "uppercase",
                letterSpacing: "0.1em",
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
        <Definitions onCountChange={setDefinitionCount} />
      )}
    </div>
  );
}
