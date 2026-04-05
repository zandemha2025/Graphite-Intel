import React from "react";
import { cn } from "../../lib/utils";

type GradientColor = "coral" | "peach" | "mint" | "lavender" | "sky" | "rose";
type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  clickable?: boolean;
  gradient?: GradientColor;
  padding?: CardPadding;
}

const gradientMap: Record<GradientColor, string> = {
  coral: "var(--gradient-coral)",
  peach: "var(--gradient-peach)",
  mint: "var(--gradient-mint)",
  lavender: "var(--gradient-lavender)",
  sky: "var(--gradient-sky)",
  rose: "var(--gradient-rose)",
};

const paddingMap: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, clickable, gradient, padding = "md", style, ...props }, ref) => {
    const gradientStyle = gradient
      ? { ...style, background: gradientMap[gradient] }
      : style;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-[#E5E5E3]/50 bg-white shadow-[var(--shadow-card)]",
          paddingMap[padding],
          hoverable && "transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:-translate-y-px",
          clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2",
          className
        )}
        style={gradientStyle}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card };
