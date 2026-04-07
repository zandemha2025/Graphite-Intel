import { useLocation, Link } from "wouter";
import {
  Compass,
  BookOpen,
  Brain,
  Radar,
  LayoutGrid,
  BookMarked,
  Cable,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout, type User } from "@/hooks/use-auth";

const navItems = [
  { path: "/explore", label: "Explore", icon: Compass, alert: false },
  { path: "/notebooks", label: "Notebooks", icon: BookOpen, alert: false },
  { path: "/context", label: "Context", icon: Brain, alert: false },
  { path: "/intelligence", label: "Intelligence", icon: Radar, alert: true },
  { path: "/boards", label: "Boards", icon: LayoutGrid, alert: false },
  { path: "/playbooks", label: "Playbooks", icon: BookMarked, alert: false },
] as const;

const utilItems = [
  { path: "/integrations", label: "Integrations", icon: Cable },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-[220px] flex-col border-r border-[#27272A] bg-[#09090B] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/explore" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366F1] text-white text-xs font-bold">
              S
            </div>
            <span className="text-[13px] font-semibold text-[#FAFAFA]">Stratix</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#71717A] hover:bg-[#27272A] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-[#6366F1]/10 font-medium text-[#818CF8] border-l-2 border-[#6366F1]"
                        : "text-[#71717A] hover:bg-[#18181B] hover:text-[#FAFAFA]",
                    )}
                  >
                    <span className="relative">
                      <item.icon className="h-[16px] w-[16px]" />
                      {item.alert && !active && (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                      )}
                    </span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="my-4" />

          <div className="space-y-0.5">
            {utilItems.map((item) => {
              const active = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-[#6366F1]/10 font-medium text-[#818CF8] border-l-2 border-[#6366F1]"
                        : "text-[#71717A] hover:bg-[#18181B] hover:text-[#FAFAFA]",
                    )}
                  >
                    <item.icon className="h-[16px] w-[16px]" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-[#27272A] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-xs font-medium text-white">
              {getInitials((user as User | undefined)?.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#FAFAFA]">
                {(user as User | undefined)?.fullName ?? "User"}
              </p>
              <p className="truncate text-xs text-[#71717A]">
                {(user as User | undefined)?.role ?? "analyst"}
              </p>
            </div>
            <button
              onClick={() => logout.mutate()}
              className="rounded-md p-1.5 text-[#71717A] hover:bg-[#27272A] hover:text-[#FAFAFA]"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
