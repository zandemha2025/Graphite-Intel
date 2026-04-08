import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 text-xs font-medium",
  {
    variants: {
      status: {
        default: "text-[var(--text-secondary)]",
        active: "text-[var(--success)]",
        warning: "text-[var(--warning)]",
        error: "text-[var(--error)]",
        accent: "text-[var(--accent)]",
        muted: "text-[var(--text-muted)]",
      },
    },
    defaultVariants: {
      status: "default",
    },
  }
)

const dotVariants = cva("h-1.5 w-1.5 rounded-[var(--radius-full)]", {
  variants: {
    status: {
      default: "bg-[var(--text-secondary)]",
      active: "bg-[var(--success)]",
      warning: "bg-[var(--warning)]",
      error: "bg-[var(--error)]",
      accent: "bg-[var(--accent)]",
      muted: "bg-[var(--text-muted)]",
    },
  },
  defaultVariants: {
    status: "default",
  },
})

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string
  pulse?: boolean
}

function StatusBadge({
  className,
  status,
  label,
  pulse = false,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-[var(--radius-full)] opacity-75",
              dotVariants({ status })
            )}
          />
        )}
        <span className={cn("relative inline-flex rounded-[var(--radius-full)] h-1.5 w-1.5", dotVariants({ status }))} />
      </span>
      {label}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
