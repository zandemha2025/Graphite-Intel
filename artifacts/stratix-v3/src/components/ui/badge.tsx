import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[#27272A] text-[#A1A1AA]",
        info: "bg-[#6366F1]/10 text-[#818CF8]",
        success: "bg-[#22C55E]/10 text-[#22C55E]",
        warning: "bg-[#F59E0B]/10 text-[#F59E0B]",
        error: "bg-[#EF4444]/10 text-[#EF4444]",
        indigo: "bg-[#6366F1]/10 text-[#818CF8]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
