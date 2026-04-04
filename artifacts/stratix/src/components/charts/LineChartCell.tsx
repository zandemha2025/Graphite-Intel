import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

export function LineChartCell({ cell }: Props) {
  const { data, xKey, yKey, title, type } = cell;
  const xField = xKey ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yFields: string[] = Array.isArray(yKey)
    ? yKey
    : yKey
    ? [yKey]
    : Object.keys(data[0] ?? {}).filter((k) => k !== xField);

  const isArea = type === "area";
  const ChartComponent = isArea ? AreaChart : LineChart;

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium mb-3" style={{ color: CHART_COLORS.text }}>
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <ChartComponent data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
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
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {yFields.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.mutedText }} />}
          {yFields.map((field, i) => {
            const color = CHART_COLORS.series[i % CHART_COLORS.series.length];
            return isArea ? (
              <Area
                key={field}
                type="monotone"
                dataKey={field}
                stroke={color}
                fill={color}
                fillOpacity={0.08}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ) : (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
