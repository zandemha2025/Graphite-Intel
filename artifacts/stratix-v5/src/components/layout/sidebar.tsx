import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, BOTTOM_ITEMS } from "@/lib/constants";
import { Bell, Info, ChevronRight, LogOut, Users, Settings, Plus, Layers } from "lucide-react";

interface SidebarProps {
  user?: { name?: string; email?: string } | null;
  orgName?: string | null;
  onLogout?: () => void;
}

function WorkspaceDropdown({
  user,
  orgName,
  onLogout,
  open,
  onClose,
}: {
  user?: { name?: string; email?: string } | null;
  orgName?: string | null;
  onLogout?: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const creditsUsed = 20;
  const creditsTotal = 100;
  const pct = Math.round((creditsUsed / creditsTotal) * 100);

  return (
    <div
      ref={ref}
      className="absolute bottom-2 left-[52px] w-[240px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg z-50 overflow-hidden"
    >
      {/* Org header */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-body-sm font-semibold text-[var(--text-primary)] truncate">
          {orgName || "My Workspace"}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Free plan | 1 member</p>
      </div>

      {/* Credits bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
          <span>Credits</span>
          <span>{creditsUsed}/{creditsTotal}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button className="mt-2 w-full text-center text-[12px] font-medium text-white bg-[#2E7D32] hover:bg-[#1B5E20] rounded-[6px] py-1.5 transition-colors">
          Upgrade
        </button>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* Menu items */}
      <div className="py-1">
        <button className="w-full flex items-center justify-between px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors">
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Switch workspace
          </span>
          <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors">
          <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          Invite members
        </button>
        <Link
          href="/settings"
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <Settings className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          Settings
        </Link>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors">
          <Plus className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          New workspace
        </button>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* Sign out */}
      <div className="py-1">
        <button
          onClick={() => { onLogout?.(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-[var(--error,#C62828)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ user, orgName, onLogout }: SidebarProps) {
  const [location] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[48px] flex-col items-center py-3 bg-[var(--background)]">
      {/* Logo */}
      <Link href="/solve" className="mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white text-[11px] font-bold">
          S
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="relative flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors group"
            >
              {/* Active left bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--accent)] rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive ? "text-[var(--sidebar-text-active)]" : "text-[var(--sidebar-text)] group-hover:text-[var(--text-secondary)]"
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1 relative">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors"
            >
              <Icon className={cn(
                "h-[18px] w-[18px] transition-colors",
                isActive ? "text-[var(--sidebar-text-active)]" : "text-[var(--sidebar-text)] hover:text-[var(--text-secondary)]"
              )} />
            </Link>
          );
        })}

        <button title="Help" className="flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors">
          <Info className="h-[18px] w-[18px] text-[var(--sidebar-text)] hover:text-[var(--text-secondary)]" />
        </button>

        <button title="Notifications" className="flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors">
          <Bell className="h-[18px] w-[18px] text-[var(--sidebar-text)] hover:text-[var(--text-secondary)]" />
        </button>

        {/* Workspace dropdown trigger */}
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A8D5A2] text-[10px] font-semibold text-[#1A1918] mt-1 cursor-pointer ring-2 ring-transparent hover:ring-[var(--accent)]/30 transition-all"
          title={user?.name || user?.email || "User"}
          onClick={() => setDropdownOpen((v) => !v)}
        >
          {initials}
        </div>

        <WorkspaceDropdown
          user={user}
          orgName={orgName}
          onLogout={onLogout}
          open={dropdownOpen}
          onClose={() => setDropdownOpen(false)}
        />
      </div>
    </aside>
  );
}
