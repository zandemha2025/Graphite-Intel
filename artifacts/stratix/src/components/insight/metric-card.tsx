import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export interface MetricCardProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  change?: string;
  sparklineData?: number[];
}

const TREND_CONFIG = {
  up: { color: "#16A34A", bg: "#F0FDF4", Icon: TrendingUp },
  down: { color: "#DC2626", bg: "#FEF2F2", Icon: TrendingDown },
  flat: { color: "#6B7280", bg: "#F3F4F6", Icon: Minus },
} as const;

export function MetricCard({
  label,
  value,
  trend = "flat",
  change,
  sparklineData,
}: MetricCardProps) {
  const { color, bg, Icon } = TREND_CONFIG[trend];
  const chartData = sparklineData?.map((v, i) => ({ i, v }));

  return (
    <div
      className="relative flex flex-col justify-between rounded-lg px-4 py-3.5 min-w-[140px] flex-1 overflow-hidden"
      style={{
        background: "var(--insight-card-bg, #FFFFFF)",
        border: "1px solid var(--insight-border, #E5E7EB)",
      }}
    >
      {/* Sparkline background */}
      {chartData && chartData.length > 1 && (
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                fill={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p
        className="text-[11px] font-medium mb-1 relative z-10"
        style={{ color: "var(--insight-muted, #6B7280)" }}
      >
        {label}
      </p>

      <div className="flex items-end justify-between gap-2 relative z-10">
        <p
          className="text-2xl font-semibold tracking-tight leading-none"
          style={{
            color: "var(--insight-text, #111827)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>

        {change && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: bg, color }}
          >
            <Icon className="w-3 h-3" />
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
