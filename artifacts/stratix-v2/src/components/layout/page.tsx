import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Page({ title, subtitle, actions, fullWidth, children }: PageProps) {
  return (
    <div className={cn("px-8 py-6", !fullWidth && "max-w-[1200px]")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#1A1A1A] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#525252] mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {/* Content */}
      {children}
    </div>
  );
}
