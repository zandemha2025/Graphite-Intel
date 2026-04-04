import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartCell } from "./types";
import { CHART_COLORS, TOOLTIP_STYLE } from "./theme";

type Props = { cell: ChartCell };

export function BarChartCell({ cell }: Props) {
  const { data, xKey, yKey, title } = cell;
  const xField = xKey ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yFields: string[] = Array.isArray(yKey)
    ? yKey
    : yKey
    ? [yKey]
    : Object.keys(data[0] ?? {}).filter((k) => k !== xField);

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium mb-3" style={{ color: CHART_COLORS.text }}>
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey={xField}
            tick={{ fill: CHART_COLORS.mutedText, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.mutedText, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#F3F4F6" }} />
          {yFields.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.mutedText }} />}
          {yFields.map((field, i) => (
            <Bar
              key={field}
              dataKey={field}
              fill={CHART_COLORS.series[i % CHART_COLORS.series.length]}
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
