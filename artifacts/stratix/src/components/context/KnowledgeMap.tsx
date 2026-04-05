import { useMemo } from "react";
import {
  FileText,
  Plug,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface KBDocument {
  id: number;
  title: string;
  fileType: string;
  createdAt: string;
  status: string;
}

interface Connection {
  id: number;
  name: string;
  category: string;
  appSlug: string;
  lastSyncAt: string | null;
  status: string;
}

interface DefinitionItem {
  id: string;
  term: string;
  category: string;
}

interface Props {
  documents: KBDocument[];
  connections: Connection[];
  definitions: DefinitionItem[];
}

function SectionCard({
  icon,
  title,
  count,
  children,
  emptyMessage,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  emptyMessage: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ color: "#6B7280" }}>{icon}</div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#111827",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            color: "#6B7280",
            background: "#F3F4F6",
            padding: "2px 8px",
            borderRadius: "10px",
          }}
        >
          {count}
        </span>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {count === 0 ? (
          <p
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              textAlign: "center",
              padding: "16px 0",
              margin: 0,
            }}
          >
            {emptyMessage}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DocGroup({ type, docs }: { type: string; docs: KBDocument[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", letterSpacing: "0.05em", minWidth: "36px", textAlign: "center" }}>
          {type}
        </span>
        <span style={{ fontSize: "12px", color: "#374151" }}>
          {docs.length} file{docs.length !== 1 ? "s" : ""}
        </span>
      </div>
      <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
        Latest: {format(new Date(docs[0].createdAt), "MMM d")}
      </span>
    </div>
  );
}

function CoverageIndicator({
  strengths,
  gaps,
}: {
  strengths: string[];
  gaps: string[];
}) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        background: "#FAFAFA",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "#6B7280",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        Coverage Assessment
      </div>

      {strengths.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#16a34a",
              marginBottom: "4px",
            }}
          >
            <CheckCircle2 size={12} /> Strong in:
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginLeft: "18px",
            }}
          >
            {strengths.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: "#DCFCE7",
                  color: "#166534",
                  border: "1px solid #BBF7D0",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#D97706",
              marginBottom: "4px",
            }}
          >
            <AlertTriangle size={12} /> Gaps:
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginLeft: "18px",
            }}
          >
            {gaps.map((g) => (
              <span
                key={g}
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  background: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FDE68A",
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {strengths.length === 0 && gaps.length === 0 && (
        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
          Add documents, connections, and definitions to see coverage analysis.
        </p>
      )}
    </div>
  );
}

export function KnowledgeMap({ documents, connections, definitions }: Props) {
  const docGroups = useMemo(() => {
    const groups: Record<string, KBDocument[]> = {};
    for (const doc of documents) {
      const type = doc.fileType.toUpperCase();
      if (!groups[type]) groups[type] = [];
      groups[type].push(doc);
    }
    // Sort each group by date descending
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return groups;
  }, [documents]);

  const connectionsByCategory = useMemo(() => {
    const groups: Record<string, Connection[]> = {};
    for (const conn of connections) {
      const cat = conn.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(conn);
    }
    return groups;
  }, [connections]);

  const { strengths, gaps } = useMemo(() => {
    const s: string[] = [];
    const g: string[] = [];

    // Check document categories
    const hasStrategicDocs = documents.some(
      (d) =>
        d.title.toLowerCase().includes("strategy") ||
        d.title.toLowerCase().includes("plan") ||
        d.title.toLowerCase().includes("roadmap"),
    );
    const hasMarketDocs = documents.some(
      (d) =>
        d.title.toLowerCase().includes("market") ||
        d.title.toLowerCase().includes("research") ||
        d.title.toLowerCase().includes("analysis"),
    );
    const hasFinancialDocs = documents.some(
      (d) =>
        d.title.toLowerCase().includes("financial") ||
        d.title.toLowerCase().includes("revenue") ||
        d.title.toLowerCase().includes("budget") ||
        d.fileType === "xlsx",
    );
    const hasProductDocs = documents.some(
      (d) =>
        d.title.toLowerCase().includes("product") ||
        d.title.toLowerCase().includes("spec") ||
        d.title.toLowerCase().includes("prd"),
    );

    if (hasStrategicDocs) s.push("Strategic Planning");
    else if (documents.length > 0) g.push("Strategic Planning");

    if (hasMarketDocs) s.push("Market Intelligence");
    else g.push("Market Intelligence");

    if (hasFinancialDocs) s.push("Financial Data");
    else g.push("Financial Data");

    if (hasProductDocs) s.push("Product Documentation");
    else if (documents.length > 0) g.push("Product Documentation");

    // Check connections
    const connTypes = connections.map((c) => c.appSlug?.toLowerCase() || "");
    const hasCRM = connTypes.some(
      (t) =>
        t.includes("salesforce") ||
        t.includes("hubspot") ||
        t.includes("pipedrive"),
    );
    if (hasCRM) s.push("CRM Data");
    else if (connections.length > 0) g.push("CRM Data");
    else g.push("Customer Data");

    if (definitions.length >= 5) s.push("Business Definitions");
    else if (definitions.length > 0) g.push("More Definitions Needed");

    return { strengths: s, gaps: g };
  }, [documents, connections, definitions]);

  return (
    <div>
      <CoverageIndicator strengths={strengths} gaps={gaps} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        {/* Documents section */}
        <SectionCard
          icon={<FileText size={14} />}
          title="Documents"
          count={documents.length}
          emptyMessage="No documents uploaded yet."
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {Object.entries(docGroups).map(([type, docs]) => (
              <DocGroup key={type} type={type} docs={docs} />
            ))}
          </div>
        </SectionCard>

        {/* Connections section */}
        <SectionCard
          icon={<Plug size={14} />}
          title="Connected Sources"
          count={connections.length}
          emptyMessage="No sources connected yet."
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {Object.entries(connectionsByCategory).map(([cat, conns]) => (
              <div key={cat}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "3px",
                  }}
                >
                  {cat}
                </div>
                {conns.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#374151" }}>
                      {c.name || c.appSlug}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                        color: "#9CA3AF",
                      }}
                    >
                      {c.lastSyncAt && (
                        <>
                          <Clock size={10} />
                          {format(new Date(c.lastSyncAt), "MMM d")}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Definitions as tags */}
      <div style={{ marginTop: "16px" }}>
        <SectionCard
          icon={<Tag size={14} />}
          title="Definitions"
          count={definitions.length}
          emptyMessage="No definitions added yet."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {definitions.map((d) => {
              const catColors: Record<
                string,
                { bg: string; text: string; border: string }
              > = {
                competitor: {
                  bg: "#FEF3C7",
                  text: "#92400E",
                  border: "#FDE68A",
                },
                metric: { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" },
                market: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
                custom: { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" },
              };
              const colors = catColors[d.category] || catColors.custom;
              return (
                <span
                  key={d.id}
                  style={{
                    padding: "3px 10px",
                    fontSize: "11px",
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {d.term}
                </span>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
