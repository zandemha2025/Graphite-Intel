import { useLocation, Link } from "wouter";
import {
  Compass,
  BookOpen,
  Brain,
  LayoutGrid,
  Cable,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout, type User } from "@/hooks/use-auth";

const navItems = [
  { path: "/explore", label: "Explore", icon: Compass },
  { path: "/notebooks", label: "Notebooks", icon: BookOpen },
  { path: "/context", label: "Context", icon: Brain },
  { path: "/boards", label: "Boards", icon: LayoutGrid },
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
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full w-[240px] flex-col border-r border-[#E5E7EB] bg-[#F3F4F6] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-5">
          <Link href="/explore" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4F46E5] text-white text-xs font-bold">
              S
            </div>
            <span className="text-sm font-semibold text-[#111827]">Stratix</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#6B7280] hover:bg-[#E5E7EB]/50 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-2">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[#EEF2FF] font-medium text-[#4F46E5]"
                        : "text-[#6B7280] hover:bg-[#E5E7EB]/50 hover:text-[#111827]",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#4F46E5]" />
                    )}
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="my-4 h-px bg-[#E5E7EB]" />

          <div className="space-y-0.5">
            {utilItems.map((item) => {
              const active = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[#EEF2FF] font-medium text-[#4F46E5]"
                        : "text-[#6B7280] hover:bg-[#E5E7EB]/50 hover:text-[#111827]",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#4F46E5]" />
                    )}
                    <item.icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-[#E5E7EB] px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-xs font-medium text-white">
              {getInitials((user as User | undefined)?.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#111827]">
                {(user as User | undefined)?.fullName ?? "User"}
              </p>
              <p className="truncate text-xs text-[#6B7280]">
                {(user as User | undefined)?.role ?? "analyst"}
              </p>
            </div>
            <button
              onClick={() => logout.mutate()}
              className="rounded-md p-1.5 text-[#6B7280] hover:bg-[#E5E7EB]/50 hover:text-[#111827]"
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
