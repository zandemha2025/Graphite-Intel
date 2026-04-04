import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, TrendingUp, PieChart, Hash, AlignLeft, Table2 } from "lucide-react";
import type { BoardCardContent } from "./BoardCard";
import type { ChartCell } from "@/components/charts/types";

type CardKind = "chart" | "stat" | "text" | "table";
type ChartType = "bar" | "line" | "pie";

const CARD_TYPES: { kind: CardKind; label: string; description: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { kind: "chart", label: "Chart", description: "Bar, line, or pie chart", icon: BarChart3 },
  { kind: "stat", label: "Stat", description: "Single KPI metric", icon: Hash },
  { kind: "table", label: "Table", description: "Tabular data", icon: Table2 },
  { kind: "text", label: "Text", description: "Markdown text block", icon: AlignLeft },
];

const CHART_ICONS: Record<ChartType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  bar: BarChart3,
  line: TrendingUp,
  pie: PieChart,
};

function buildSampleContent(kind: CardKind, chartType: ChartType, cardTitle: string): BoardCardContent {
  switch (kind) {
    case "chart": {
      const cell: ChartCell =
        chartType === "bar"
          ? { type: "bar", title: cardTitle, data: [{ name: "Q1", value: 40 }, { name: "Q2", value: 65 }, { name: "Q3", value: 52 }, { name: "Q4", value: 78 }], xKey: "name", yKey: "value" }
          : chartType === "line"
          ? { type: "line", title: cardTitle, data: [{ name: "Jan", value: 30 }, { name: "Feb", value: 45 }, { name: "Mar", value: 38 }, { name: "Apr", value: 62 }], xKey: "name", yKey: "value" }
          : { type: "pie", title: cardTitle, data: [{ name: "A", value: 40 }, { name: "B", value: 35 }, { name: "C", value: 25 }], xKey: "name", yKey: "value" };
      return { kind: "chart", cell };
    }
    case "stat":
      return { kind: "stat", label: cardTitle, value: "—", change: "+0%", positive: true };
    case "text":
      return { kind: "text", body: "Enter your text or analysis here." };
    case "table":
      return { kind: "table", headers: ["Name", "Value", "Change"], rows: [["Item A", "100", "+5%"], ["Item B", "85", "-2%"]] };
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, content: BoardCardContent) => void;
};

export function AddCardModal({ open, onClose, onAdd }: Props) {
  const [selectedKind, setSelectedKind] = useState<CardKind>("chart");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [cardTitle, setCardTitle] = useState("");

  const handleAdd = () => {
    const title = cardTitle.trim() || `New ${selectedKind === "chart" ? chartType + " chart" : selectedKind}`;
    onAdd(title, buildSampleContent(selectedKind, chartType, title));
    setCardTitle("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold" style={{ color: "#111827" }}>Add Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card type picker */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "#374151" }}>Card Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.map((ct) => (
                <button
                  key={ct.kind}
                  onClick={() => setSelectedKind(ct.kind)}
                  className="flex items-start gap-2.5 p-3 rounded-lg text-left transition-all"
                  style={{
                    background: selectedKind === ct.kind ? "#EEF2FF" : "#F9FAFB",
                    border: selectedKind === ct.kind ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                  }}
                >
                  <ct.icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: selectedKind === ct.kind ? "#4F46E5" : "#6B7280" }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: selectedKind === ct.kind ? "#4F46E5" : "#111827" }}>{ct.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{ct.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chart sub-type */}
          {selectedKind === "chart" && (
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#374151" }}>Chart Type</label>
              <div className="flex gap-2">
                {(["bar", "line", "pie"] as ChartType[]).map((ct) => {
                  const Icon = CHART_ICONS[ct];
                  return (
                    <button
                      key={ct}
                      onClick={() => setChartType(ct)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium capitalize transition-all"
                      style={{
                        background: chartType === ct ? "#4F46E5" : "#F3F4F6",
                        color: chartType === ct ? "#FFFFFF" : "#374151",
                        border: "1px solid transparent",
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ct}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: "#374151" }}>Card Title</label>
            <input
              type="text"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={selectedKind === "chart" ? `${chartType} chart` : selectedKind}
              className="w-full px-3 py-2 rounded-md text-sm outline-none"
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{ background: "#F3F4F6", color: "#374151" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 rounded text-xs font-medium"
              style={{ background: "#4F46E5", color: "#FFFFFF" }}
            >
              Add Card
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
