import { useState, useEffect } from "react";
import {
  Building2,
  FileText,
  Plug,
  Target,
  MessageSquare,
  Crosshair,
  X,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

interface SuggestionDef {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: { label: string; path: string } | { label: string; tab: string };
}

interface Props {
  hasCompetitors: boolean;
  docCount: number;
  connectionCount: number;
  definitionCount: number;
  definitions: Array<{ term: string; value: string }>;
  hasPriorities: boolean;
  connectedTypes: string[];
  onNavigateTab?: (tab: string) => void;
}

const DISMISSED_KEY = "stratix:context-suggestions-dismissed";

function loadDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

function buildSuggestions(props: Props): SuggestionDef[] {
  const suggestions: SuggestionDef[] = [];

  if (!props.hasCompetitors) {
    suggestions.push({
      id: "add-competitors",
      icon: <Building2 size={16} />,
      title: "Add your top competitors",
      description:
        "Competitor data helps the AI benchmark your strategy and identify market gaps.",
      action: { label: "Edit Profile", tab: "profile" },
    });
  }

  if (props.docCount === 0) {
    suggestions.push({
      id: "upload-doc",
      icon: <FileText size={16} />,
      title: "Upload a strategy document",
      description:
        "Documents ground AI answers in your actual data instead of generic knowledge.",
      action: { label: "Upload", tab: "knowledge" },
    });
  }

  const crmSlugs = ["salesforce", "hubspot", "pipedrive", "zoho_crm"];
  const hasCRM = props.connectedTypes.some((t) =>
    crmSlugs.some((s) => t.toLowerCase().includes(s)),
  );
  if (!hasCRM && props.connectionCount === 0) {
    suggestions.push({
      id: "connect-crm",
      icon: <Plug size={16} />,
      title: "Connect a CRM to enrich pipeline data",
      description:
        "Live CRM data lets the AI analyze your pipeline, deal flow, and forecasts.",
      action: { label: "Connections", path: "/connections" },
    });
  }

  const hasICP = props.definitions.some(
    (d) =>
      d.term.toLowerCase().includes("icp") ||
      d.term.toLowerCase().includes("ideal customer") ||
      d.value.toLowerCase().includes("ideal customer profile"),
  );
  if (!hasICP && props.definitionCount < 3) {
    suggestions.push({
      id: "define-icp",
      icon: <Crosshair size={16} />,
      title: "Define your ICP",
      description:
        "An Ideal Customer Profile definition helps the AI target the right segments.",
      action: { label: "Add Definition", tab: "definitions" },
    });
  }

  if (!props.hasPriorities) {
    suggestions.push({
      id: "set-priorities",
      icon: <Target size={16} />,
      title: "Set your strategic priorities",
      description:
        "Priorities tell the AI what matters most so it can rank recommendations.",
      action: { label: "Edit Profile", tab: "profile" },
    });
  }

  const commSlugs = ["slack", "teams", "discord"];
  const hasComm = props.connectedTypes.some((t) =>
    commSlugs.some((s) => t.toLowerCase().includes(s)),
  );
  if (!hasComm) {
    suggestions.push({
      id: "connect-comm",
      icon: <MessageSquare size={16} />,
      title: "Connect a communication tool",
      description:
        "Slack or Teams integration lets the AI surface insights where your team works.",
      action: { label: "Connections", path: "/connections" },
    });
  }

  return suggestions;
}

export function EnrichmentSuggestions(props: Props) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed);

  useEffect(() => {
    saveDismissed(dismissed);
  }, [dismissed]);

  const allSuggestions = buildSuggestions(props);
  const visible = allSuggestions.filter((s) => !dismissed.includes(s.id));

  if (visible.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  const handleAction = (suggestion: SuggestionDef) => {
    const action = suggestion.action;
    if ("path" in action) {
      setLocation(action.path);
    } else if ("tab" in action && props.onNavigateTab) {
      props.onNavigateTab(action.tab);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        background: "#FFFFFF",
        marginBottom: "24px",
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
        <span
          style={{
            fontSize: "10px",
            
            letterSpacing: "0.01em",
            color: "#6B7280",
            fontWeight: 600,
          }}
        >
          Suggestions to improve your context
        </span>
        <span style={{ fontSize: "10px", color: "#9CA3AF" }}>
          {visible.length} remaining
        </span>
      </div>

      {visible.map((s, i) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderBottom:
              i < visible.length - 1 ? "1px solid #F3F4F6" : "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#EEF2FF",
              color: "#4F46E5",
              borderRadius: "6px",
              flexShrink: 0,
            }}
          >
            {s.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}
            >
              {s.title}
            </div>
            <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "1px" }}>
              {s.description}
            </div>
          </div>

          <button
            onClick={() => handleAction(s)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              fontSize: "11px",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              color: "#4F46E5",
              cursor: "pointer",
              flexShrink: 0,
              fontWeight: 500,
            }}
          >
            {"label" in s.action ? s.action.label : "Go"}
            <ChevronRight size={12} />
          </button>

          <button
            onClick={() => handleDismiss(s.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#D1D5DB",
              padding: "4px",
              flexShrink: 0,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
