import { Link, useLocation } from "wouter";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  MessageSquareText,
  Library,
  LogOut,
  ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Strategic Advisor", icon: MessageSquareText },
  { href: "/reports", label: "Report Library", icon: Library },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: auth } = useGetCurrentAuthUser();
  const user = auth?.user;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-xl z-10">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2" data-testid="link-home">
            <div className="h-8 w-8 bg-brand rounded flex items-center justify-center">
              <span className="font-serif font-bold text-brand-foreground text-lg leading-none">S</span>
            </div>
            <span className="font-serif font-semibold text-xl tracking-tight">Stratix</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-brand text-brand-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-brand-foreground" : "text-sidebar-foreground/60"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center w-full gap-3 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors outline-none"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8 border border-sidebar-border">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium leading-none mb-1">
                      {user.firstName ? `${user.firstName} ${user.lastName || ''}` : "Executive"}
                    </div>
                    <div className="text-xs text-sidebar-foreground/60 truncate w-32">
                      {user.email}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" data-testid="menu-user">
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="flex items-center text-destructive focus:text-destructive cursor-pointer w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle top noise texture for executive feel */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        <div className="flex-1 overflow-auto z-0">
          <div className="mx-auto max-w-6xl p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
