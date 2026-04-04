import { Activity, FileText, Radio } from "lucide-react";

export type BoardType = "live" | "report" | "monitor";

const BOARD_TYPES: { value: BoardType; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { value: "live", label: "Live Dashboard", icon: Activity },
  { value: "report", label: "Report", icon: FileText },
  { value: "monitor", label: "Monitor", icon: Radio },
];

type Props = {
  value: BoardType;
  onChange: (v: BoardType) => void;
};

export function BoardTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-md p-1" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
      {BOARD_TYPES.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
            style={{
              background: active ? "#FFFFFF" : "transparent",
              color: active ? "#111827" : "#6B7280",
              border: active ? "1px solid #E5E7EB" : "1px solid transparent",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  live: "Live Dashboard",
  report: "Report",
  monitor: "Monitor",
};
