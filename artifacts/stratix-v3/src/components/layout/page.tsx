import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function Page({
  title,
  subtitle,
  actions,
  children,
  className,
  fullWidth,
}: PageProps) {
  return (
    <div
      className={cn(
        "px-6 py-5",
        !fullWidth && "mx-auto max-w-[1200px]",
        className,
      )}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-[#FAFAFA]">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-[#71717A]">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
