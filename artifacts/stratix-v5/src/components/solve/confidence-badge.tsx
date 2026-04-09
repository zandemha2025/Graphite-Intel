import { useState } from "react";
import { Gauge } from "lucide-react";

interface ConfidenceBadgeProps {
  level?: "high" | "medium" | "low";
  score?: number; // 0-100
  /** @deprecated Use level + score instead */
  confidence?: number;
}

function resolveLevel(props: ConfidenceBadgeProps): { level: "high" | "medium" | "low"; score: number } {
  // Support legacy prop
  const raw = props.score ?? props.confidence;
  if (props.level && raw !== undefined) {
    return { level: props.level, score: raw };
  }
  const s = raw ?? 0;
  if (props.level) {
    return { level: props.level, score: s };
  }
  // Derive level from score
  if (s >= 80) return { level: "high", score: s };
  if (s >= 60) return { level: "medium", score: s };
  return { level: "low", score: s };
}

const LEVEL_CONFIG = {
  high: { color: "#3C8B4E", label: "High confidence" },
  medium: { color: "#8B7A3C", label: "Medium confidence" },
  low: { color: "#C0392B", label: "Low confidence" },
} as const;

export function ConfidenceBadge(props: ConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { level, score } = resolveLevel(props);
  const { color, label } = LEVEL_CONFIG[level];

  return (
    <div
      className="relative inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-[11px] font-medium cursor-default"
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}0D`,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Gauge className="h-3 w-3" />
      <span>{label}</span>
      {score > 0 && <span className="font-bold">{score}%</span>}

      {/* Tooltip */}
      {showTooltip && score > 0 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-normal whitespace-nowrap shadow-md pointer-events-none z-50"
          style={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          Confidence score: {score}/100
        </div>
      )}
    </div>
  );
}
