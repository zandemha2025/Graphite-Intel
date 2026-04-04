import { X, BarChart2, LineChart, PieChart, Hash, Table, Activity } from "lucide-react";
import { useState } from "react";
import { type ChartCell } from "../charts/types";

type CardTypeOption = {
  type: ChartCell["type"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
};

const CARD_TYPES: CardTypeOption[] = [
  { type: "bar", label: "Bar Chart", icon: BarChart2, desc: "Compare values across categories" },
  { type: "line", label: "Line Chart", icon: LineChart, desc: "Show trends over time" },
  { type: "pie", label: "Pie Chart", icon: PieChart, desc: "Show proportions of a whole" },
  { type: "stat", label: "Stat Card", icon: Hash, desc: "Highlight a key metric" },
  { type: "table", label: "Data Table", icon: Table, desc: "Tabular data view" },
  { type: "area", label: "Area Chart", icon: Activity, desc: "Filled trend visualization" },
];

const DATA_SOURCES = [
  "CRM — Opportunities",
  "Marketing — Campaigns",
  "Finance — Revenue",
  "Support — Tickets",
  "Custom Query",
];

type Props = {
  onAdd: (cell: ChartCell) => void;
  onClose: () => void;
};

export function AddCardModal({ onAdd, onClose }: Props) {
  const [selectedType, setSelectedType] = useState<ChartCell["type"]>("bar");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState(DATA_SOURCES[0]);

  function handleAdd() {
    const card: ChartCell = {
      type: selectedType,
      title: title.trim() || CARD_TYPES.find((c) => c.type === selectedType)?.label || "New Card",
      data: generateSampleData(selectedType),
      xKey: selectedType !== "stat" ? "label" : undefined,
      yKey: selectedType !== "stat" && selectedType !== "pie" ? "value" : undefined,
      metadata: { source },
    };
    onAdd(card);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[560px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#E5E7EB" }}
        >
          <span className="text-sm font-semibold" style={{ color: "#111827" }}>
            Add Card
          </span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" style={{ color: "#6B7280" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card type picker */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#374151" }}>
              Card type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CARD_TYPES.map((opt) => {
                const active = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className="flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: active ? "#4F46E5" : "#E5E7EB",
                      background: active ? "#EEF2FF" : "#FFFFFF",
                      boxShadow: active ? "0 0 0 2px rgba(79,70,229,0.15)" : "none",
                    }}
                  >
                    <opt.icon className="h-4 w-4" style={{ color: active ? "#4F46E5" : "#6B7280" }} />
                    <span className="text-xs font-medium" style={{ color: active ? "#4F46E5" : "#111827" }}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: "#9CA3AF" }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
              Title
            </label>
            <input
              type="text"
              placeholder={CARD_TYPES.find((c) => c.type === selectedType)?.label}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "#E5E7EB",
                color: "#111827",
              }}
            />
          </div>

          {/* Data source selector */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
              Data source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
              style={{ borderColor: "#E5E7EB", color: "#111827", background: "#FFFFFF" }}
            >
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
              Preview
            </label>
            <div
              className="rounded-lg p-4 flex items-center justify-center"
              style={{ background: "#F3F4F6", minHeight: 80 }}
            >
              {(() => {
                const opt = CARD_TYPES.find((c) => c.type === selectedType);
                if (!opt) return null;
                return (
                  <div className="flex flex-col items-center gap-2">
                    <opt.icon className="h-8 w-8" style={{ color: "#4F46E5" }} />
                    <span className="text-xs" style={{ color: "#6B7280" }}>
                      {title.trim() || opt.label} · {source}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: "#E5E7EB" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#E5E7EB", color: "#374151" }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ background: "#4F46E5", color: "#FFFFFF" }}
          >
            Add card
          </button>
        </div>
      </div>
    </div>
  );
}

function generateSampleData(type: ChartCell["type"]): Array<Record<string, any>> {
  if (type === "stat") {
    return [{ value: "2,847", label: "Total", change: "+12%" }];
  }
  if (type === "pie") {
    return [
      { label: "Direct", value: 40 },
      { label: "Organic", value: 30 },
      { label: "Referral", value: 20 },
      { label: "Other", value: 10 },
    ];
  }
  return [
    { label: "Jan", value: 42 },
    { label: "Feb", value: 58 },
    { label: "Mar", value: 35 },
    { label: "Apr", value: 71 },
    { label: "May", value: 63 },
    { label: "Jun", value: 88 },
  ];
}
