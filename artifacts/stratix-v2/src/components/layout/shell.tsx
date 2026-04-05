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
    <div className="flex h-screen bg-[#F6F5F4]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
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
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header with hamburger */}
        <div className="sticky top-0 z-30 flex items-center h-[52px] px-3 border-b border-[#E5E5E3] bg-[#FAFAF9] md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-[#F0EFED] text-[#404040] transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="ml-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0A0A0A] flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">S</span>
            </div>
            <span className="text-sm font-semibold text-[#0A0A0A]">Stratix</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
