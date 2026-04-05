import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  clickable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, clickable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[#E5E5E3] bg-white p-5",
          hoverable && "transition-colors duration-150 hover:border-[#C8C8C6]",
          clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2",
          className
        )}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card };
