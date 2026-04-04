import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartCell } from "./types";
import { CHART_COLORS, TOOLTIP_STYLE } from "./theme";

type Props = { cell: ChartCell };

export function PieChartCell({ cell }: Props) {
  const { data, xKey, yKey, title } = cell;
  const nameField = xKey ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const valueField = (Array.isArray(yKey) ? yKey[0] : yKey) ??
    Object.keys(data[0] ?? {}).find((k) => k !== nameField) ?? "value";

  const innerRadius = 0; // set to "35%" for donut style — keeping 0 for pie

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium mb-3" style={{ color: CHART_COLORS.text }}>
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueField}
            nameKey={nameField}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="70%"
            paddingAngle={2}
          >
            {data.map((_entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={CHART_COLORS.series[i % CHART_COLORS.series.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART_COLORS.mutedText }}
            formatter={(value) => (
              <span style={{ color: CHART_COLORS.text }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
