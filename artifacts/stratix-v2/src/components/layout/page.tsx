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
    <div className="h-full flex flex-col">
      <header className="border-b border-[#E5E5E3] bg-white px-8 py-5">
        <div
          className={cn(
            "flex items-start justify-between",
            !fullWidth && "max-w-[1200px] mx-auto",
          )}
        >
          <div>
            <h1 className="text-2xl font-semibold text-[#0A0A0A] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[#9CA3AF]">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div
        className={cn(
          "flex-1 p-8",
          !fullWidth && "max-w-[1200px] mx-auto w-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
