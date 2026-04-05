import React from "react";
import { cn } from "../../lib/utils";

type GradientColor = "coral" | "peach" | "mint" | "lavender" | "sky" | "rose";

export interface GradientCardProps {
  gradient: GradientColor;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const gradientMap: Record<GradientColor, string> = {
  coral: "var(--gradient-coral)",
  peach: "var(--gradient-peach)",
  mint: "var(--gradient-mint)",
  lavender: "var(--gradient-lavender)",
  sky: "var(--gradient-sky)",
  rose: "var(--gradient-rose)",
};

const GradientCard: React.FC<GradientCardProps> = ({
  gradient,
  title,
  subtitle,
  meta,
  icon,
  onClick,
  className,
}) => {
  return (
    <div
      className={cn(
        "group flex w-56 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E5E5E3]/50 bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div
        className="flex h-24 items-center justify-center"
        style={{ background: gradientMap[gradient] }}
      >
        {icon && (
          <div className="text-2xl opacity-70 transition-transform duration-200 group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="truncate text-sm font-semibold text-[#1A1A1A]">
          {title}
        </h3>
        {subtitle && (
          <p className="line-clamp-2 text-xs text-[#525252]">{subtitle}</p>
        )}
        {meta && (
          <p className="mt-auto pt-1 text-[11px] text-[#A3A3A3]">{meta}</p>
        )}
      </div>
    </div>
  );
};

GradientCard.displayName = "GradientCard";

export { GradientCard };
