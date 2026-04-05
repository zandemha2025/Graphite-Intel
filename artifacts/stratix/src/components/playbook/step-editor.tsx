import {
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  FileSearch,
  GitCompare,
  AlertTriangle,
  Eye,
} from "lucide-react";

// ---- Types ----

export interface StepConfig {
  extractionFields?: string[];
  comparisonDocTypes?: string[];
  flagConditions?: string[];
  aiPrompt?: string;
}

export interface PlaybookStep {
  index: number;
  title: string;
  description: string;
  type: "checklist" | "review" | "extract" | "compare" | "flag";
  config: StepConfig;
  isRequired: boolean;
}

export const STEP_TYPES = [
  { value: "checklist", label: "Checklist", icon: CheckSquare, description: "Manual verification item" },
  { value: "review", label: "AI Review", icon: Eye, description: "AI-assisted document analysis" },
  { value: "extract", label: "Extract", icon: FileSearch, description: "Automated data extraction" },
  { value: "compare", label: "Compare", icon: GitCompare, description: "Cross-document comparison" },
  { value: "flag", label: "Flag", icon: AlertTriangle, description: "Condition-based flagging" },
] as const;

// ---- Step Editor ----

interface StepEditorProps {
  step: PlaybookStep;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PlaybookStep>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

export function StepEditor({ step, index, total, isExpanded, onToggle, onUpdate, onRemove, onMove }: StepEditorProps) {
  const typeInfo = STEP_TYPES.find((t) => t.value === step.type);
  const TypeIcon = typeInfo?.icon ?? CheckSquare;

  return (
    <div style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
      <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={onToggle}>
        <div className="flex flex-col gap-0.5">
          <button
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            className="disabled:opacity-20"
          >
            <ChevronUp className="h-3 w-3" style={{ color: "var(--workspace-muted)" }} />
          </button>
          <button
            disabled={index === total - 1}
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            className="disabled:opacity-20"
          >
            <ChevronDown className="h-3 w-3" style={{ color: "var(--workspace-muted)" }} />
          </button>
        </div>
        <span className="text-[10px] font-mono w-5 text-center" style={{ color: "var(--workspace-muted)" }}>{index + 1}</span>
        <TypeIcon className="h-4 w-4 shrink-0" style={{ color: "var(--workspace-fg)" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--workspace-fg)" }}>{step.title || "Untitled Step"}</span>
            <span className="text-[9px] uppercase tracking-wider px-1 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
              {typeInfo?.label ?? step.type}
            </span>
            {step.isRequired && (
              <span className="text-[9px] uppercase" style={{ color: "#ef4444" }}>Required</span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1"
          title="Remove step"
        >
          <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--workspace-muted)" }} />
        </button>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--workspace-border)" }}>
          {/* Title */}
          <div className="mt-3">
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>Title</label>
            <input
              value={step.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-2 py-1.5 text-sm outline-none"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>Type</label>
            <div className="flex flex-wrap gap-1">
              {STEP_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onUpdate({ type: t.value, config: {} })}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs"
                  style={{
                    border: `1px solid ${step.type === t.value ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                    color: step.type === t.value ? "var(--workspace-fg)" : "var(--workspace-muted)",
                    background: "#FFFFFF",
                  }}
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>Description</label>
            <textarea
              value={step.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full px-2 py-1.5 text-sm resize-none outline-none"
              rows={2}
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
            />
          </div>

          {/* Type-specific config */}
          <StepConfigEditor step={step} onUpdate={onUpdate} />

          {/* Required toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={step.isRequired}
              onChange={(e) => onUpdate({ isRequired: e.target.checked })}
              className="accent-current"
            />
            <span className="text-xs" style={{ color: "var(--workspace-fg)" }}>Required step</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ---- Step Config Editor ----

function StepConfigEditor({ step, onUpdate }: { step: PlaybookStep; onUpdate: (u: Partial<PlaybookStep>) => void }) {
  const updateConfig = (configUpdates: Partial<StepConfig>) => {
    onUpdate({ config: { ...step.config, ...configUpdates } });
  };

  switch (step.type) {
    case "review":
      return (
        <div>
          <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>AI Prompt</label>
          <textarea
            value={step.config.aiPrompt ?? ""}
            onChange={(e) => updateConfig({ aiPrompt: e.target.value })}
            placeholder="What should the AI analyze or check in this step?"
            className="w-full px-2 py-1.5 text-sm resize-none outline-none"
            rows={3}
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          />
        </div>
      );

    case "extract":
      return (
        <div>
          <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>
            Extraction Fields (one per line)
          </label>
          <textarea
            value={(step.config.extractionFields ?? []).join("\n")}
            onChange={(e) => updateConfig({ extractionFields: e.target.value.split("\n").filter(Boolean) })}
            placeholder="company_name&#10;revenue&#10;date_signed"
            className="w-full px-2 py-1.5 text-sm resize-none font-mono outline-none"
            rows={3}
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          />
        </div>
      );

    case "compare":
      return (
        <div>
          <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>
            Document Types to Compare (one per line)
          </label>
          <textarea
            value={(step.config.comparisonDocTypes ?? []).join("\n")}
            onChange={(e) => updateConfig({ comparisonDocTypes: e.target.value.split("\n").filter(Boolean) })}
            placeholder="contract&#10;amendment&#10;term_sheet"
            className="w-full px-2 py-1.5 text-sm resize-none font-mono outline-none"
            rows={3}
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          />
        </div>
      );

    case "flag":
      return (
        <div>
          <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "var(--workspace-muted)" }}>
            Flag Conditions (one per line)
          </label>
          <textarea
            value={(step.config.flagConditions ?? []).join("\n")}
            onChange={(e) => updateConfig({ flagConditions: e.target.value.split("\n").filter(Boolean) })}
            placeholder="Missing signature&#10;Revenue below threshold&#10;Non-standard terms detected"
            className="w-full px-2 py-1.5 text-sm resize-none font-mono outline-none"
            rows={3}
            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
          />
        </div>
      );

    default:
      return null;
  }
}
