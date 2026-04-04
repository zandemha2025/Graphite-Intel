import { ChartCell } from "./types";
import { CHART_COLORS } from "./theme";
import { BarChartCell } from "./BarChartCell";
import { LineChartCell } from "./LineChartCell";
import { PieChartCell } from "./PieChartCell";
import { ScatterChartCell } from "./ScatterChartCell";
import { StatCard } from "./StatCard";
import { DataTableCell } from "./DataTableCell";

type Props = {
  cell: ChartCell;
  className?: string;
};

export function ChartRenderer({ cell, className }: Props) {
  const { type, data, metadata } = cell;

  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <p className="text-sm py-8 text-center" style={{ color: CHART_COLORS.mutedText }}>
          No data available
        </p>
      );
    }

    switch (type) {
      case "bar":
        return <BarChartCell cell={cell} />;
      case "line":
      case "area":
        return <LineChartCell cell={cell} />;
      case "pie":
        return <PieChartCell cell={cell} />;
      case "scatter":
        return <ScatterChartCell cell={cell} />;
      case "stat":
        return <StatCard cell={cell} />;
      case "text":
        return (
          <p className="text-sm leading-relaxed" style={{ color: CHART_COLORS.text }}>
            {String(data[0]?.text ?? data[0]?.value ?? "")}
          </p>
        );
      case "table":
      case "treemap":
      default:
        return <DataTableCell cell={cell} />;
    }
  };

  const isCard = type !== "stat";

  return (
    <div
      className={className}
      style={
        isCard
          ? {
              backgroundColor: CHART_COLORS.background,
              borderRadius: "8px",
              border: `1px solid ${CHART_COLORS.grid}`,
              padding: "16px",
            }
          : undefined
      }
    >
      {renderChart()}
      {metadata && (isCard ? true : false) && (
        <div className="mt-3 flex gap-4 flex-wrap">
          {metadata.source && (
            <span className="text-xs" style={{ color: CHART_COLORS.mutedText }}>
              Source: {metadata.source}
            </span>
          )}
          {metadata.confidence !== undefined && (
            <span className="text-xs" style={{ color: CHART_COLORS.mutedText }}>
              Confidence: {Math.round(metadata.confidence * 100)}%
            </span>
          )}
          {metadata.freshness && (
            <span className="text-xs" style={{ color: CHART_COLORS.mutedText }}>
              {metadata.freshness}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
