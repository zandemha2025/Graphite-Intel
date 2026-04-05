import { useState, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag, Download, Upload } from "lucide-react";
import {
  DefinitionForm,
  type Definition,
  type DefinitionCategory,
} from "./DefinitionForm";

interface Props {
  onCountChange?: (count: number) => void;
  definitions: Definition[];
  onDefinitionsChange: (defs: Definition[]) => void;
}

const CATEGORY_COLORS: Record<
  DefinitionCategory,
  { bg: string; text: string; border: string }
> = {
  competitor: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  metric: { bg: "#DCFCE7", text: "#166534", border: "#BBF7D0" },
  market: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  product: { bg: "#FDF4FF", text: "#7E22CE", border: "#E9D5FF" },
  segment: { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" },
  custom: { bg: "#F3F4F6", text: "#374151", border: "#E5E7EB" },
};

type FilterValue = DefinitionCategory | "all";

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "#16a34a",
    medium: "#D97706",
    low: "#DC2626",
  };
  return (
    <span
      title={`${confidence} confidence`}
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: colors[confidence] ?? "#9CA3AF",
        flexShrink: 0,
      }}
    />
  );
}

function exportCSV(definitions: Definition[]) {
  const header = "term,value,category,confidence";
  const rows = definitions.map(
    (d) =>
      `"${d.term.replace(/"/g, '""')}","${d.value.replace(/"/g, '""')}","${d.category}","${d.confidence}"`,
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "definitions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Omit<Definition, "id">[] {
  const lines = text.split("\n").filter((l) => l.trim());
  // Skip header if present
  const start = lines[0]?.toLowerCase().includes("term") ? 1 : 0;
  const results: Omit<Definition, "id">[] = [];

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g);
    if (!parts || parts.length < 2) continue;

    const clean = (s: string) =>
      s.replace(/^"|"$/g, "").replace(/""/g, '"').trim();

    const term = clean(parts[0]);
    const value = clean(parts[1]);
    const category = (clean(parts[2] || "") || "custom") as DefinitionCategory;
    const confidence = (clean(parts[3] || "") || "medium") as Definition["confidence"];

    if (term && value) {
      const validCats: DefinitionCategory[] = [
        "competitor", "metric", "market", "product", "segment", "custom",
      ];
      results.push({
        term,
        value,
        category: validCats.includes(category) ? category : "custom",
        confidence: ["high", "medium", "low"].includes(confidence)
          ? confidence
          : "medium",
      });
    }
  }
  return results;
}

export function Definitions({ onCountChange, definitions, onDefinitionsChange }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Definition | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateDefinitions = useCallback(
    (next: Definition[]) => {
      onDefinitionsChange(next);
      onCountChange?.(next.length);
    },
    [onDefinitionsChange, onCountChange],
  );

  const addDefinition = (def: Omit<Definition, "id">) => {
    updateDefinitions([
      ...definitions,
      { ...def, id: Math.random().toString(36).slice(2) },
    ]);
  };

  const editDefinition = (id: string, def: Omit<Definition, "id">) => {
    updateDefinitions(
      definitions.map((d) => (d.id === id ? { ...def, id } : d)),
    );
  };

  const deleteDefinition = (id: string) => {
    updateDefinitions(definitions.filter((d) => d.id !== id));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = parseCSV(text);
      if (imported.length === 0) return;
      const newDefs = imported.map((d) => ({
        ...d,
        id: Math.random().toString(36).slice(2),
      }));
      updateDefinitions([...definitions, ...newDefs]);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered =
    filter === "all"
      ? definitions
      : definitions.filter((d) => d.category === filter);

  const categoryCounts = definitions.reduce<Record<string, number>>(
    (acc, d) => {
      acc[d.category] = (acc[d.category] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const allCategories: DefinitionCategory[] = [
    "competitor", "metric", "market", "product", "segment", "custom",
  ];

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: "all", label: `All (${definitions.length})` },
    ...allCategories
      .filter((c) => (categoryCounts[c] ?? 0) > 0)
      .map((c) => ({
        value: c as FilterValue,
        label: `${c.charAt(0).toUpperCase() + c.slice(1)} (${categoryCounts[c] ?? 0})`,
      })),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: "5px 12px",
                fontSize: "11px",
                border: `1px solid ${filter === opt.value ? "#4F46E5" : "#E5E7EB"}`,
                background: filter === opt.value ? "#EEF2FF" : "#FFFFFF",
                color: filter === opt.value ? "#4F46E5" : "#6B7280",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "8px 12px",
              fontSize: "11px",
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              color: "#6B7280",
              cursor: "pointer",
            }}
            title="Import CSV"
          >
            <Upload size={12} /> Import
          </button>
          {definitions.length > 0 && (
            <button
              onClick={() => exportCSV(definitions)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px 12px",
                fontSize: "11px",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                color: "#6B7280",
                cursor: "pointer",
              }}
              title="Export CSV"
            >
              <Download size={12} /> Export
            </button>
          )}
          <button
            onClick={() => {
              setEditTarget(null);
              setShowForm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={13} /> Add Definition
          </button>
        </div>
      </div>

      {/* Explainer */}
      <div
        style={{
          background: "#F3F4F6",
          border: "1px solid #E5E7EB",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "12px",
          color: "#6B7280",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#374151" }}>How definitions work: </strong>
        These terms get injected into every AI prompt, making answers specific to
        your business. Define competitors, key metrics, products, segments, and
        market terms for best results.
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            border: "1px dashed #E5E7EB",
          }}
        >
          <Tag
            size={32}
            style={{
              color: "#D1D5DB",
              margin: "0 auto 12px",
              display: "block",
            }}
          />
          <p
            style={{
              fontSize: "14px",
              color: "#6B7280",
              marginBottom: "12px",
            }}
          >
            No {filter !== "all" ? filter : ""} definitions yet.
          </p>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowForm(true);
            }}
            style={{
              fontSize: "12px",
              color: "#4F46E5",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Add your first definition
          </button>
        </div>
      ) : (
        <div style={{ border: "1px solid #E5E7EB" }}>
          {filtered.map((def, i) => {
            const colors = CATEGORY_COLORS[def.category] || CATEGORY_COLORS.custom;
            return (
              <div
                key={def.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "#FFFFFF",
                  borderBottom:
                    i < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {def.term}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {def.category}
                    </span>
                    <ConfidenceDot confidence={def.confidence} />
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6B7280",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {def.value}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setEditTarget(def);
                      setShowForm(true);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #E5E7EB",
                      cursor: "pointer",
                      color: "#6B7280",
                      padding: "5px 8px",
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteDefinition(def.id)}
                    style={{
                      background: "none",
                      border: "1px solid #E5E7EB",
                      cursor: "pointer",
                      color: "#D1D5DB",
                      padding: "5px 8px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#EF4444")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#D1D5DB")
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#9CA3AF" }}>
          {filtered.length} definition{filtered.length !== 1 ? "s" : ""}
          {filter !== "all" ? ` in ${filter}` : ""}
        </div>
      )}

      {showForm && (
        <DefinitionForm
          initial={editTarget}
          onSave={(def) => {
            if (editTarget) editDefinition(editTarget.id, def);
            else addDefinition(def);
          }}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
