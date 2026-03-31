import { Link, useLocation } from "wouter";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  MessageSquareText,
  Library,
  LogOut,
  Settings,
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Engagements", icon: MessageSquareText },
  { href: "/reports", label: "Report Library", icon: Library },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "Engagements",
  "/reports": "Report Library",
  "/reports/new": "Commission Report",
  "/profile": "Company Profile",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: auth } = useGetCurrentAuthUser();
  const user = auth?.user;

  const pageTitle = PAGE_TITLES[location] || (location.startsWith("/reports/") ? "Intelligence Brief" : "Stratix");

  return (
    <div className="flex h-screen bg-[#0D0C0B]">
      {/* Sidebar — same color as background, minimal chrome */}
      <div className="w-56 bg-[#0D0C0B] text-[#E8E4DC] flex flex-col border-r border-white/8 z-10">
        <div className="px-5 py-5 border-b border-white/8">
          <Link href="/dashboard" className="flex items-center gap-2.5" data-testid="link-home">
            <div className="h-6 w-6 border border-[#E8E4DC]/30 flex items-center justify-center">
              <span className="font-serif font-semibold text-[#E8E4DC] text-xs leading-none">S</span>
            </div>
            <span className="font-serif font-medium text-base tracking-tight text-[#E8E4DC] uppercase">Stratix</span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-medium transition-colors relative ${
                  isActive
                    ? "text-[#E8E4DC] border-l-2 border-[#E8E4DC] pl-[10px] bg-white/4"
                    : "text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 border-l-2 border-transparent pl-[10px] hover:bg-white/3"
                }`}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#E8E4DC]" : "text-[#E8E4DC]/40"}`} />
                <span className="uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-white/8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center w-full gap-2.5 px-2 py-2 hover:bg-white/4 transition-colors outline-none"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-7 w-7 border border-white/15">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-white/8 text-[#E8E4DC] text-xs">
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium leading-none mb-0.5 text-[#E8E4DC] truncate">
                      {user.firstName ? `${user.firstName} ${user.lastName || ''}` : "Executive"}
                    </div>
                    <div className="text-[10px] text-[#E8E4DC]/40 truncate">
                      {user.email}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-[#E8E4DC]/30 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#141311] border-white/10" data-testid="menu-user">
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex items-center cursor-pointer text-[#E8E4DC]/70 hover:text-[#E8E4DC] text-xs w-full px-2 py-1.5"
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    <span>Company Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="flex items-center text-[#E8E4DC]/70 hover:text-[#E8E4DC] cursor-pointer w-full text-xs px-2 py-1.5">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Minimal top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/8 bg-[#0D0C0B]">
          <h2 className="font-serif text-sm font-light tracking-[0.15em] uppercase text-[#E8E4DC]/60">
            {pageTitle}
          </h2>
        </div>

        <div className="flex-1 overflow-auto bg-[#0D0C0B]">
          <div className="mx-auto max-w-5xl p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
