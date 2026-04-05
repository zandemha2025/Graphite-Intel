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
      <header className="bg-[#FAFAF9] px-8 py-5">
        <div
          className={cn(
            "flex items-start justify-between",
            !fullWidth && "max-w-[1200px] mx-auto",
          )}
        >
          <div>
            <h1 className="text-xl font-semibold text-[#0A0A0A] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[#525252]">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <div
        className={cn(
          "flex-1 px-8 pb-8",
          !fullWidth && "max-w-[1200px] mx-auto w-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
