import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        outline:
          "border border-[var(--border)] text-[var(--text-primary)]",
        destructive:
          "bg-[var(--error-muted)] text-[var(--error)]",
        success:
          "bg-[var(--success-muted)] text-[var(--success)]",
        warning:
          "bg-[var(--warning-muted)] text-[var(--warning)]",
        accent:
          "bg-[var(--accent-muted)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
