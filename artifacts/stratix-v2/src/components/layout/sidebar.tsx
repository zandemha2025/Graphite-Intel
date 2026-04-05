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
  Activity,
  Share2,
  HelpCircle,
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
      { label: "Ad Reports", path: "/ads/reports", icon: FileText },
    ],
  },
  {
    title: "KNOWLEDGE",
    items: [
      { label: "Knowledge", path: "/knowledge", icon: BookOpen },
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
  {
    title: "MORE",
    items: [
      { label: "Activity", path: "/activity", icon: Activity },
      { label: "Shared", path: "/shared", icon: Share2 },
    ],
  },
];

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  user: User;
  onNavigate?: () => void;
  forceExpanded?: boolean;
}

export function Sidebar({ user, onNavigate, forceExpanded }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const logout = useLogout();

  const expanded = forceExpanded || pinned || hovered;
  const isAdmin = user.role === "admin" || user.role === "owner";

  const handleNav = useCallback(
    (path: string) => {
      setLocation(path);
      onNavigate?.();
    },
    [setLocation, onNavigate],
  );

  const isActive = (path: string) => {
    if (path === "/explore") return location === "/explore" || location === "/";
    if (location === path) return true;
    if (path === "/ads" && location.startsWith("/ads/reports")) return false;
    return location.startsWith(path + "/");
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "flex flex-col h-full bg-white border-r border-[#E5E5E3]/40 transition-all duration-200 ease-in-out flex-shrink-0 select-none",
          expanded ? "w-[220px]" : "w-[52px]",
        )}
      >
        {/* Header / Logo */}
        <div
          className={cn(
            "flex items-center flex-shrink-0",
            expanded ? "h-[52px] px-3" : "h-[52px] justify-center",
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-bold">S</span>
          </div>
          {expanded && (
            <span className="ml-2.5 text-[13px] font-semibold text-[#1A1A1A] truncate">
              Stratix
            </span>
          )}
          {expanded && (
            <button
              onClick={() => setPinned(!pinned)}
              className="ml-auto p-1 rounded-md hover:bg-[#F5F5F4] text-[#A3A3A3] hover:text-[#525252] transition-colors"
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1.5 px-1.5">
          {NAV_SECTIONS.map((section, sectionIndex) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || isAdmin,
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {expanded ? (
                  <div
                    className={cn(
                      "px-3 mb-1 text-[10px] font-semibold tracking-[0.1em] text-[#A3A3A3] uppercase",
                      sectionIndex === 0 ? "mt-2" : "mt-4",
                    )}
                  >
                    {section.title}
                  </div>
                ) : (
                  sectionIndex > 0 && <div className="h-2" />
                )}
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;

                    const button = (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={cn(
                          "flex items-center w-full rounded-lg transition-colors",
                          expanded
                            ? "px-2.5 py-1.5 gap-2.5"
                            : "justify-center p-1.5 mx-auto",
                          active
                            ? "bg-[#F0EFED] text-[#1A1A1A]"
                            : "text-[#8A8A8A] hover:bg-[#F5F5F4] hover:text-[#525252]",
                        )}
                      >
                        <Icon
                          size={expanded ? 18 : 20}
                          strokeWidth={active ? 2 : 1.75}
                          className="flex-shrink-0"
                        />
                        {expanded && (
                          <span
                            className={cn(
                              "text-[13px] truncate",
                              active ? "font-medium text-[#1A1A1A]" : "",
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
                              className="bg-[#1A1A1A] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg z-50"
                            >
                              {item.label}
                              <Tooltip.Arrow className="fill-[#1A1A1A]" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      );
                    }

                    return button;
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: user + help */}
        <div className="flex-shrink-0 p-1.5">
          {/* Help button */}
          {!expanded ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  className="flex items-center justify-center w-full p-1.5 rounded-lg text-[#8A8A8A] hover:bg-[#F5F5F4] hover:text-[#525252] transition-colors mb-1"
                  onClick={() => handleNav("/help")}
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5F5F4] flex items-center justify-center">
                    <span className="text-[12px] font-medium text-[#8A8A8A]">?</span>
                  </div>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="bg-[#1A1A1A] text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg z-50"
                >
                  Help
                  <Tooltip.Arrow className="fill-[#1A1A1A]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            <button
              className="flex items-center w-full px-2.5 py-1.5 gap-2.5 rounded-lg text-[#8A8A8A] hover:bg-[#F5F5F4] hover:text-[#525252] transition-colors mb-1"
              onClick={() => handleNav("/help")}
            >
              <HelpCircle size={18} strokeWidth={1.75} className="flex-shrink-0" />
              <span className="text-[13px]">Help</span>
            </button>
          )}

          {/* User avatar / dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  "flex items-center w-full rounded-lg hover:bg-[#F5F5F4] transition-colors",
                  expanded ? "px-2.5 py-1.5 gap-2.5" : "justify-center p-1.5",
                )}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-7 h-7 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E8E8E6] flex items-center justify-center text-[11px] font-semibold text-[#525252] flex-shrink-0">
                    {getInitials(user.fullName)}
                  </div>
                )}
                {expanded && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[13px] font-medium text-[#1A1A1A] truncate leading-tight">
                        {user.fullName}
                      </div>
                      <div className="text-[11px] text-[#A3A3A3] truncate leading-tight">
                        {user.email}
                      </div>
                    </div>
                    <ChevronDown size={14} className="text-[#A3A3A3] flex-shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side={expanded ? "top" : "right"}
                align="end"
                sideOffset={8}
                className="min-w-[180px] bg-white rounded-xl shadow-lg border border-[#E5E5E3]/60 py-1 z-50"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#404040] hover:bg-[#F5F5F4] cursor-pointer outline-none rounded-md mx-1"
                  onClick={() => handleNav("/profile")}
                >
                  <UserIcon size={15} className="text-[#8A8A8A]" /> Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#404040] hover:bg-[#F5F5F4] cursor-pointer outline-none rounded-md mx-1"
                  onClick={() => handleNav("/settings/team")}
                >
                  <Users size={15} className="text-[#8A8A8A]" /> Team
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#404040] hover:bg-[#F5F5F4] cursor-pointer outline-none rounded-md mx-1"
                  onClick={() => handleNav("/security")}
                >
                  <Settings size={15} className="text-[#8A8A8A]" /> Settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-[#E5E5E3]/60 my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 cursor-pointer outline-none rounded-md mx-1"
                  onClick={() => logout.mutate()}
                >
                  <LogOut size={15} /> Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
