import { Link, useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import type { AuthUserWithOrg } from "@/lib/types";
import {
 LayoutGrid,
 Compass,
 Library,
 BookOpen,
 LogOut,
 Settings,
 ChevronDown,
 Zap,
 Users,
 Database,
 Blocks,
 Shield,
 BarChart3,
 Plug,
 ClipboardList,
 BookText,
 PinIcon,
 PinOffIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
 Tooltip,
 TooltipTrigger,
 TooltipContent,
 TooltipProvider,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
 { href: "/explore", label: "Explore", icon: Compass },
 { href: "/notebooks", label: "Notebooks", icon: BookText },
 { href: "/boards", label: "Boards", icon: LayoutGrid },
 { href: "/workflows", label: "Workflows", icon: Zap },
 { href: "/workflow-builder", label: "Builder", icon: Blocks },
 { href: "/reports", label: "Report Library", icon: Library },
 { href: "/knowledge", label: "Knowledge", icon: BookOpen },
 { href: "/context", label: "Context", icon: Database },
 { href: "/connections", label: "Connections", icon: Plug },
 { href: "/playbooks", label: "Playbooks", icon: ClipboardList },
];

const ADMIN_NAV_ITEMS = [
 { href: "/audit", label: "Audit Log", icon: Shield },
 { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface SidebarProps {
 user: AuthUserWithOrg | null;
 orgName: string | null;
 isAdmin: boolean;
}

export function Sidebar({ user, orgName, isAdmin }: SidebarProps) {
 const [location] = useLocation();
 const [pinned, setPinned] = useState(false);
 const [hovered, setHovered] = useState(false);
 const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 const expanded = pinned || hovered;

 const handleMouseEnter = useCallback(() => {
 if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
 hoverTimeoutRef.current = setTimeout(() => setHovered(true), 80);
 }, []);

 const handleMouseLeave = useCallback(() => {
 if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
 hoverTimeoutRef.current = null;
 setHovered(false);
 }, []);

 return (
 <TooltipProvider delayDuration={300}>
 <div
 onMouseEnter={handleMouseEnter}
 onMouseLeave={handleMouseLeave}
 className="flex flex-col shrink-0 z-20 border-r select-none"
 style={{
 width: expanded ? 220 : 56,
 minWidth: expanded ? 220 : 56,
 transition: "width 200ms ease, min-width 200ms ease",
 background: "#FAFAF9",
 borderColor: "#E5E5E3",
 }}
 >
 {/* Logo */}
 <div
 className="border-b flex items-center"
 style={{
 borderColor: "#E5E5E3",
 height: 52,
 padding: expanded ? "0 16px" : "0",
 justifyContent: expanded ? "flex-start" : "center",
 }}
 >
 <Link
 href="/explore"
 className="flex items-center gap-2.5 no-underline"
 data-testid="link-home"
 >
 <div
 className="flex items-center justify-center rounded-md shrink-0"
 style={{
 width: 24,
 height: 24,
 border: "1px solid #E5E5E3",
 }}
 >
 <span
 className="font-sans font-semibold text-xs leading-none"
 style={{ color: "#0A0A0A" }}
 >
 S
 </span>
 </div>
 {expanded && (
 <div className="flex flex-col min-w-0 overflow-hidden">
 <span
 className="font-sans font-semibold text-[15px] tracking-tight leading-none whitespace-nowrap"
 style={{ color: "#0A0A0A" }}
 >
 Stratix
 </span>
 {orgName && (
 <span
 className="text-[11px] truncate mt-0.5 whitespace-nowrap"
 style={{ color: "#9CA3AF" }}
 >
 {orgName}
 </span>
 )}
 </div>
 )}
 </Link>
 </div>

 {/* Nav */}
 <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
 <div className="flex flex-col gap-0.5" style={{ padding: expanded ? "0 8px" : "0 8px" }}>
 {NAV_ITEMS.map((item) => (
 <NavItem
 key={item.href}
 item={item}
 location={location}
 expanded={expanded}
 />
 ))}
 </div>

 {isAdmin && (
 <>
 <div
 className="my-2 mx-3"
 style={{ borderTop: "1px solid #E5E5E3" }}
 />
 {expanded && (
 <div className="px-4 pb-1">
 <span
 className="text-[11px] font-medium"
 style={{ color: "#9CA3AF", letterSpacing: "0.04em" }}
 >
 Admin
 </span>
 </div>
 )}
 <div className="flex flex-col gap-0.5" style={{ padding: "0 8px" }}>
 {ADMIN_NAV_ITEMS.map((item) => (
 <NavItem
 key={item.href}
 item={item}
 location={location}
 expanded={expanded}
 />
 ))}
 </div>
 </>
 )}
 </nav>

 {/* Pin toggle (only when expanded) */}
 {expanded && (
 <div className="px-3 pb-1 flex justify-end">
 <button
 onClick={() => setPinned((p) => !p)}
 className="p-1.5 rounded-md transition-colors hover:bg-black/[0.04]"
 title={pinned ? "Unpin sidebar" : "Pin sidebar"}
 style={{ color: "#9CA3AF" }}
 >
 {pinned ? (
 <PinOffIcon className="h-3.5 w-3.5" />
 ) : (
 <PinIcon className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 )}

 {/* User area */}
 {user && (
 <div className="border-t" style={{ borderColor: "#E5E5E3" }}>
 {expanded ? (
 <UserMenuExpanded user={user} />
 ) : (
 <UserMenuCollapsed user={user} />
 )}
 </div>
 )}
 </div>
 </TooltipProvider>
 );
}

/* ---- Nav Item ---- */

interface NavItemProps {
 item: { href: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> };
 location: string;
 expanded: boolean;
}

function NavItem({ item, location, expanded }: NavItemProps) {
 const isActive =
 location === item.href || location.startsWith(`${item.href}/`);

 const inner = (
 <Link
 href={item.href}
 className="flex items-center relative rounded-lg transition-colors no-underline"
 style={{
 height: 34,
 padding: expanded ? "0 10px" : "0",
 justifyContent: expanded ? "flex-start" : "center",
 gap: expanded ? 10 : 0,
 color: isActive ? "#0A0A0A" : "#404040",
 background: isActive ? "#F0EFED" : undefined,
 fontWeight: isActive ? 600 : 500,
 fontSize: 13,
 }}
 data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
 >
 {/* Active accent bar */}
 {isActive && (
 <div
 style={{
 position: "absolute",
 left: 0,
 top: 6,
 bottom: 6,
 width: 2,
 borderRadius: 1,
 background: "#0A0A0A",
 }}
 />
 )}
 <item.icon
 className="shrink-0"
 style={{
 width: 20,
 height: 20,
 color: isActive ? "#0A0A0A" : "#9CA3AF",
 }}
 />
 {expanded && (
 <span className="truncate whitespace-nowrap">{item.label}</span>
 )}
 </Link>
 );

 if (!expanded) {
 return (
 <Tooltip key={item.href}>
 <TooltipTrigger asChild>{inner}</TooltipTrigger>
 <TooltipContent
 side="right"
 className="bg-[#1a1a1a] text-white text-xs px-2.5 py-1 rounded-md"
 >
 {item.label}
 </TooltipContent>
 </Tooltip>
 );
 }

 return inner;
}

/* ---- User menu (expanded) ---- */

function UserMenuExpanded({ user }: { user: AuthUserWithOrg }) {
 return (
 <div className="p-2">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 className="flex items-center w-full gap-2.5 px-2 py-2 transition-colors outline-none rounded-lg hover:bg-black/[0.03]"
 data-testid="button-user-menu"
 >
 <Avatar
 className="h-7 w-7 border shrink-0"
 style={{ borderColor: "#E5E5E3" }}
 >
 <AvatarImage src={user.profileImageUrl || undefined} />
 <AvatarFallback
 className="bg-[#F0EFED] text-xs"
 style={{ color: "#0A0A0A" }}
 >
 {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
 </AvatarFallback>
 </Avatar>
 <div className="flex-1 text-left min-w-0">
 <div
 className="text-xs font-medium leading-none mb-0.5 truncate"
 style={{ color: "#0A0A0A" }}
 >
 {user.firstName
 ? `${user.firstName} ${user.lastName || ""}`
 : "Executive"}
 </div>
 <div className="text-[10px] truncate" style={{ color: "#9CA3AF" }}>
 {user.orgRole === "admin" ? "Admin" : "Member"}
 </div>
 </div>
 <ChevronDown
 className="h-3 w-3 shrink-0"
 style={{ color: "#9CA3AF" }}
 />
 </button>
 </DropdownMenuTrigger>
 <UserDropdownContent />
 </DropdownMenu>
 </div>
 );
}

/* ---- User menu (collapsed) ---- */

function UserMenuCollapsed({ user }: { user: AuthUserWithOrg }) {
 return (
 <div className="flex justify-center py-3">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button
 className="outline-none rounded-full transition-opacity hover:opacity-80"
 data-testid="button-user-menu"
 >
 <Avatar
 className="h-7 w-7 border"
 style={{ borderColor: "#E5E5E3" }}
 >
 <AvatarImage src={user.profileImageUrl || undefined} />
 <AvatarFallback
 className="bg-[#F0EFED] text-xs"
 style={{ color: "#0A0A0A" }}
 >
 {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
 </AvatarFallback>
 </Avatar>
 </button>
 </DropdownMenuTrigger>
 <UserDropdownContent />
 </DropdownMenu>
 </div>
 );
}

/* ---- Shared dropdown content ---- */

function UserDropdownContent() {
 return (
 <DropdownMenuContent
 align="end"
 side="right"
 className="w-48 bg-white border-[#E5E5E3]"
 data-testid="menu-user"
 >
 <DropdownMenuItem asChild>
 <Link
 href="/profile"
 className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
 style={{ color: "#404040" }}
 >
 <Settings className="mr-2 h-3.5 w-3.5" />
 <span>Company Profile</span>
 </Link>
 </DropdownMenuItem>
 <DropdownMenuItem asChild>
 <Link
 href="/settings/team"
 className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
 style={{ color: "#404040" }}
 data-testid="nav-link-team"
 >
 <Users className="mr-2 h-3.5 w-3.5" />
 <span>Team</span>
 </Link>
 </DropdownMenuItem>
 <DropdownMenuItem asChild>
 <Link
 href="/connections"
 className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
 style={{ color: "#404040" }}
 data-testid="nav-link-connections"
 >
 <Plug className="mr-2 h-3.5 w-3.5" />
 <span>Connections</span>
 </Link>
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-[#E5E5E3]" />
 <DropdownMenuItem asChild>
 <a
 href="/api/logout"
 className="flex items-center cursor-pointer w-full text-xs px-2 py-1.5"
 style={{ color: "#404040" }}
 >
 <LogOut className="mr-2 h-3.5 w-3.5" />
 <span>Sign Out</span>
 </a>
 </DropdownMenuItem>
 </DropdownMenuContent>
 );
}
