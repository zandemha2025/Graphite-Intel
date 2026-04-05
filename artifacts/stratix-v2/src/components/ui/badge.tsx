import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#F3F3F1] text-[#404040]",
        success: "bg-[#ECFDF5] text-[#065F46]",
        warning: "bg-[#FFFBEB] text-[#92400E]",
        error: "bg-[#FEF2F2] text-[#991B1B]",
        info: "bg-[#EFF6FF] text-[#1E40AF]",
        gradient: "bg-gradient-to-r from-[#E9D8FD] to-[#FED7E2] text-[#553C9A] font-semibold",
        active: "bg-gradient-to-r from-[#C6F6D5] to-[#9AE6B4] text-[#22543D] font-semibold",
        live: "bg-gradient-to-r from-[#FED7D7] to-[#FEB2B2] text-[#9B2C2C] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
