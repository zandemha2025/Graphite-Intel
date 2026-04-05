import { ChartCell } from "./types";
import { CHART_COLORS } from "./theme";

type Props = { cell: ChartCell };

export function StatCard({ cell }: Props) {
  const { data, yKey, title, metadata } = cell;
  const valueField = (Array.isArray(yKey) ? yKey[0] : yKey) ??
    Object.keys(data[0] ?? {})[0] ?? "value";
  const value = data[0]?.[valueField] ?? "—";
  const label = data[0]?.label ?? data[0]?.name ?? "";

  const formattedValue =
    typeof value === "number"
      ? value.toLocaleString()
      : String(value);

  return (
    <div
      className="rounded-lg border p-5 flex flex-col gap-1"
      style={{ backgroundColor: CHART_COLORS.background, borderColor: CHART_COLORS.grid }}
    >
      <p className="text-xs font-medium" style={{ color: CHART_COLORS.mutedText }}>
        {title}
      </p>
      <p className="text-2xl font-semibold tracking-tight" style={{ color: CHART_COLORS.text }}>
        {formattedValue}
      </p>
      {label && (
        <p className="text-sm" style={{ color: CHART_COLORS.mutedText }}>
          {label}
        </p>
      )}
      {metadata?.source && (
        <p className="text-xs mt-1" style={{ color: CHART_COLORS.mutedText }}>
          Source: {metadata.source}
        </p>
      )}
    </div>
  );
}
