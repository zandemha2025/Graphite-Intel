import * as React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

export interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
}

function DataCard({
  className,
  label,
  value,
  change,
  trend,
  ...props
}: DataCardProps) {
  const TrendIcon =
    trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus

  const trendColor =
    trend === "up"
      ? "text-[var(--success)]"
      : trend === "down"
        ? "text-[var(--error)]"
        : "text-[var(--text-muted)]"

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      {change && (
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}

export { DataCard }
