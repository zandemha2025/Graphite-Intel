import { useLocation } from "wouter";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { FULL_BLEED_ROUTES } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellProps {
  children: React.ReactNode;
  user?: { name?: string; email?: string } | null;
  orgName?: string | null;
  onLogout?: () => void;
}

export function AppShell({ children, user, orgName, onLogout }: AppShellProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const isFullBleed = FULL_BLEED_ROUTES.some(
    (route) => location === route || location.startsWith(route + "/")
  );

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {!isMobile && <Sidebar user={user} orgName={orgName} onLogout={onLogout} />}

      <div className={`flex flex-1 flex-col min-w-0 ${!isMobile ? "ml-[48px]" : ""}`}>
        <main className={isFullBleed ? "flex-1 overflow-hidden" : `flex-1 overflow-auto ${isMobile ? "p-4 pb-20" : "p-8"}`}>
          {children}
        </main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}
