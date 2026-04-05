import { type ReactNode, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import type { User } from "@/hooks/use-auth";

interface ShellProps {
  user: User;
  children: ReactNode;
}

export function Shell({ user, children }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden"
          onClick={handleMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar user={user} onNavigate={handleMobileClose} forceExpanded />
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-[#FAFAF9]">
        {/* Mobile header with hamburger */}
        <div className="sticky top-0 z-30 flex items-center h-[52px] px-3 border-b border-[#E5E5E3]/40 bg-[#FAFAF9] md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#525252] transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="ml-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">S</span>
            </div>
            <span className="text-[13px] font-semibold text-[#1A1A1A]">Stratix</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
