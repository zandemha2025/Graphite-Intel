import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartCell } from "./types";
import { CHART_COLORS, TOOLTIP_STYLE } from "./theme";

type Props = { cell: ChartCell };

export function ScatterChartCell({ cell }: Props) {
  const { data, xKey, yKey, title } = cell;
  const keys = Object.keys(data[0] ?? {});
  const xField = xKey ?? keys[0] ?? "x";
  const yField = (Array.isArray(yKey) ? yKey[0] : yKey) ?? keys[1] ?? "y";

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium mb-3" style={{ color: CHART_COLORS.text }}>
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey={xField}
            name={xField}
            tick={{ fill: CHART_COLORS.mutedText, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey={yField}
            name={yField}
            tick={{ fill: CHART_COLORS.mutedText, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill={CHART_COLORS.primary} opacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
