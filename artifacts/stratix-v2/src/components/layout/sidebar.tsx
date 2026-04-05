import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Compass,
  BookOpen,
  LayoutGrid,
  FileText,
  Workflow,
  BookMarked,
  Megaphone,
  Brain,
  Lock,
  Cable,
  BarChart3,
  ClipboardList,
  Pin,
  PinOff,
  LogOut,
  User as UserIcon,
  Users,
  Settings,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { User } from "@/hooks/use-auth";
import { useLogout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "INTELLIGENCE",
    items: [
      { label: "Explore", path: "/explore", icon: Compass },
      { label: "Notebooks", path: "/notebooks", icon: BookOpen },
      { label: "Boards", path: "/boards", icon: LayoutGrid },
      { label: "Reports", path: "/reports", icon: FileText },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Workflows", path: "/workflows", icon: Workflow },
      { label: "Playbooks", path: "/playbooks", icon: BookMarked },
      { label: "Ads", path: "/ads", icon: Megaphone },
    ],
  },
  {
    title: "KNOWLEDGE",
    items: [
      { label: "Context", path: "/context", icon: Brain },
      { label: "Vault", path: "/vault", icon: Lock },
      { label: "Connections", path: "/connections", icon: Cable },
    ],
  },
  {
    title: "ADMIN",
    items: [
      { label: "Analytics", path: "/analytics", icon: BarChart3, adminOnly: true },
      { label: "Audit", path: "/audit", icon: ClipboardList, adminOnly: true },
    ],
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  user: User;
}

export function Sidebar({ user }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const logout = useLogout();

  const expanded = pinned || hovered;
  const isAdmin = user.role === "admin" || user.role === "owner";

  const handleNav = useCallback(
    (path: string) => {
      setLocation(path);
    },
    [setLocation],
  );

  const isActive = (path: string) => {
    if (path === "/explore") return location === "/explore" || location === "/";
    return location === path || location.startsWith(path + "/");
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "flex flex-col h-full bg-[#FAFAF9] border-r border-[#E5E5E3] transition-all duration-200 ease-in-out flex-shrink-0 select-none",
          expanded ? "w-[220px]" : "w-[56px]",
        )}
      >
        {/* Header */}
        <div className="flex items-center h-[52px] px-3 border-b border-[#E5E5E3]">
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          {expanded && (
            <span className="ml-2.5 text-sm font-semibold text-[#0A0A0A] truncate">
              Stratix
            </span>
          )}
          {expanded && (
            <button
              onClick={() => setPinned(!pinned)}
              className="ml-auto p-1 rounded hover:bg-[#F0EFED] text-[#9CA3AF] hover:text-[#404040] transition-colors"
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || isAdmin,
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-3">
                {expanded && (
                  <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[#9CA3AF] uppercase">
                    {section.title}
                  </div>
                )}
                {!expanded && <div className="h-px bg-[#E5E5E3] mx-1 my-1.5" />}
                {visibleItems.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;

                  const button = (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={cn(
                        "flex items-center w-full rounded-md transition-colors relative group",
                        expanded ? "px-2 py-1.5 gap-2.5" : "justify-center py-2",
                        active
                          ? "bg-[#F0EFED] text-[#0A0A0A]"
                          : "text-[#404040] hover:bg-[#F0EFED] hover:text-[#0A0A0A]",
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#0A0A0A] rounded-r" />
                      )}
                      <Icon size={20} />
                      {expanded && (
                        <span
                          className={cn(
                            "text-[13px] truncate",
                            active ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.label}
                        </span>
                      )}
                    </button>
                  );

                  if (!expanded) {
                    return (
                      <Tooltip.Root key={item.path}>
                        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="right"
                            sideOffset={8}
                            className="bg-[#0A0A0A] text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg z-50"
                          >
                            {item.label}
                            <Tooltip.Arrow className="fill-[#0A0A0A]" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    );
                  }

                  return button;
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-[#E5E5E3] p-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  "flex items-center w-full rounded-md hover:bg-[#F0EFED] transition-colors",
                  expanded ? "px-2 py-1.5 gap-2.5" : "justify-center py-2",
                )}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-7 h-7 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E5E5E3] flex items-center justify-center text-[10px] font-semibold text-[#404040] flex-shrink-0">
                    {getInitials(user.fullName)}
                  </div>
                )}
                {expanded && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[13px] font-medium text-[#0A0A0A] truncate">
                        {user.fullName}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] capitalize">
                        {user.role}
                      </div>
                    </div>
                    <ChevronDown size={14} className="text-[#9CA3AF] flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side={expanded ? "top" : "right"}
                align="end"
                sideOffset={8}
                className="min-w-[180px] bg-white rounded-lg shadow-lg border border-[#E5E5E3] py-1 z-50"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#404040] hover:bg-[#F0EFED] cursor-pointer outline-none"
                  onClick={() => handleNav("/profile")}
                >
                  <UserIcon size={16} /> Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#404040] hover:bg-[#F0EFED] cursor-pointer outline-none"
                  onClick={() => handleNav("/settings/team")}
                >
                  <Users size={16} /> Team
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#404040] hover:bg-[#F0EFED] cursor-pointer outline-none"
                  onClick={() => handleNav("/security")}
                >
                  <Settings size={16} /> Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-[#E5E5E3] my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                  onClick={() => logout.mutate()}
                >
                  <LogOut size={16} /> Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
