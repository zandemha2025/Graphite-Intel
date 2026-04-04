import { useState } from "react";
import { X } from "lucide-react";

export type DefinitionCategory = "competitor" | "metric" | "market" | "custom";
export type DefinitionConfidence = "high" | "medium" | "low";

export interface Definition {
  id: string;
  term: string;
  value: string;
  category: DefinitionCategory;
  confidence: DefinitionConfidence;
}

interface Props {
  initial?: Definition | null;
  onSave: (def: Omit<Definition, "id">) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { value: DefinitionCategory; label: string }[] = [
  { value: "competitor", label: "Competitor" },
  { value: "metric", label: "Metric" },
  { value: "market", label: "Market" },
  { value: "custom", label: "Custom" },
];

const CONFIDENCE_OPTIONS: { value: DefinitionConfidence; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: "7px 12px",
  fontSize: "12px",
  textAlign: "left",
  border: `1px solid ${selected ? "#4F46E5" : "#E5E7EB"}`,
  background: selected ? "#EEF2FF" : "#FFFFFF",
  color: selected ? "#4F46E5" : "#6B7280",
  cursor: "pointer",
  width: "100%",
});

export function DefinitionForm({ initial, onSave, onClose }: Props) {
  const [term, setTerm] = useState(initial?.term ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
  const [category, setCategory] = useState<DefinitionCategory>(
    initial?.category ?? "custom",
  );
  const [confidence, setConfidence] = useState<DefinitionConfidence>(
    initial?.confidence ?? "high",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !value.trim()) return;
    onSave({ term: term.trim(), value: value.trim(), category, confidence });
    onClose();
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#6B7280",
    display: "block",
    marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "13px",
    border: "1px solid #E5E7EB",
    color: "#111827",
    outline: "none",
    background: "#FFFFFF",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          width: "100%",
          maxWidth: "480px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", margin: 0 }}>
            {initial ? "Edit Definition" : "Add Definition"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6B7280",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label style={labelStyle}>Term</label>
            <input
              autoFocus
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. TAM, Competitor A, ARR"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Value / Description</label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. $4.2B (IDC 2025) or Acme Corp (direct competitor, similar pricing)"
              required
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <label style={labelStyle}>Category</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    style={chipStyle(category === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confidence</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfidence(opt.value)}
                    style={chipStyle(confidence === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              justifyContent: "flex-end",
              paddingTop: "8px",
              borderTop: "1px solid #F3F4F6",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "9px 16px",
                fontSize: "12px",
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                color: "#6B7280",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "9px 20px",
                fontSize: "12px",
                background: "#4F46E5",
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
              }}
            >
              {initial ? "Update" : "Add Definition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
