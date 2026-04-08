import { Link, useLocation } from "wouter";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 safe-area-pb">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || location.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-[8px] transition-colors min-w-[56px]",
              isActive ? "text-[var(--accent)]" : "text-[var(--sidebar-text)]"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
