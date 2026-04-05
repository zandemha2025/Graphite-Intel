import { Link, useLocation } from "wouter";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
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
  Link2,
  ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/boards", label: "Boards", icon: LayoutGrid },
  { href: "/workflows", label: "Workflows", icon: Zap },
  { href: "/workflow-builder", label: "Builder", icon: Blocks },
  { href: "/reports", label: "Report Library", icon: Library },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/context", label: "Context", icon: Database },
  { href: "/playbooks", label: "Playbooks", icon: ClipboardList },
];

const ADMIN_NAV_ITEMS = [
  { href: "/audit", label: "Audit Log", icon: Shield },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const PAGE_BREADCRUMBS: Record<string, { section?: string; title: string }> = {
  "/explore": { title: "Explore" },
  "/chat": { title: "Explore" },
  "/dashboard": { title: "Boards" },
  "/boards": { title: "Boards" },
  "/reports": { section: "Reports", title: "Report Library" },
  "/reports/new": { section: "Reports", title: "New Report" },
  "/workflows": { title: "Workflows" },
  "/profile": { section: "Settings", title: "Company Profile" },
  "/knowledge": { title: "Knowledge" },
  "/settings/team": { section: "Settings", title: "Team" },
  "/context": { title: "Context" },
  "/vault": { title: "Context" },
  "/workflow-builder": { title: "Workflow Builder" },
  "/audit": { section: "Admin", title: "Audit Log" },
  "/analytics": { section: "Admin", title: "Analytics" },
  "/settings/integrations": { section: "Settings", title: "Integrations" },
  "/playbooks": { title: "Playbooks" },
  "/playbooks/new": { section: "Playbooks", title: "New Playbook" },
};

function useOrgName() {
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/org")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.name) setOrgName(data.name);
      })
      .catch(() => {});
  }, []);

  return orgName;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: auth } = useGetCurrentAuthUser();
  const user = auth?.user as AuthUserWithOrg | null;
  const orgName = useOrgName();

  const breadcrumb =
    PAGE_BREADCRUMBS[location] ||
    (location.startsWith("/boards/") ? { section: "Boards", title: "Board" } :
    location.startsWith("/reports/") ? { section: "Reports", title: "Intelligence Brief" } :
    location.startsWith("/workflows/new/") ? { section: "Workflows", title: "Launch Workflow" } :
    location.startsWith("/workflows/") ? { section: "Workflows", title: "Workflow Run" } :
    location.startsWith("/boards/") ? { section: "Boards", title: "Board" } :
    location.startsWith("/context") ? { title: "Context" } :
    location.startsWith("/vault/") ? { section: "Vault", title: "Project" } :
    location.startsWith("/workflow-builder/") ? { section: "Builder", title: "Edit Workflow" } :
    location.startsWith("/playbooks/runs/") ? { section: "Playbooks", title: "Run" } :
    location.startsWith("/playbooks/") ? { section: "Playbooks", title: "Edit Playbook" } :
    { title: "Stratix" });

  const isAdmin = user?.orgRole === "admin" || user?.orgRole === "owner";

  const isFullBleed =
    location === "/chat" || location.startsWith("/chat/") ||
    location === "/explore" || location.startsWith("/explore/") ||
    location.startsWith("/boards/");

  return (
    <div className="flex h-screen" style={{ background: "#0D0C0B" }}>
      {/* Sidebar — dark chrome frame */}
      <div className="w-56 flex flex-col border-r z-10 shrink-0" style={{ background: "#0D0C0B", color: "#E8E4DC", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link href="/explore" className="flex items-center gap-2.5" data-testid="link-home">
            <div className="h-6 w-6 border flex items-center justify-center" style={{ borderColor: "rgba(232,228,220,0.30)" }}>
              <span className="font-serif font-semibold text-xs leading-none" style={{ color: "#E8E4DC" }}>S</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif font-medium text-base tracking-tight uppercase leading-none" style={{ color: "#E8E4DC" }}>Stratix</span>
              {orgName && (
                <span className="text-[9px] uppercase tracking-wider truncate mt-0.5" style={{ color: "rgba(232,228,220,0.35)" }}>{orgName}</span>
              )}
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-medium transition-colors relative`}
                style={{
                  color: isActive ? "#E8E4DC" : "rgba(232,228,220,0.50)",
                  borderLeft: isActive ? "2px solid #E8E4DC" : "2px solid transparent",
                  paddingLeft: "10px",
                  background: isActive ? "rgba(255,255,255,0.04)" : undefined,
                }}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: isActive ? "#E8E4DC" : "rgba(232,228,220,0.40)" }} />
                <span className="uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-[9px] uppercase tracking-[0.2em] font-medium" style={{ color: "rgba(232,228,220,0.25)" }}>
                  Admin
                </span>
              </div>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-xs font-medium transition-colors relative`}
                    style={{
                      color: isActive ? "#E8E4DC" : "rgba(232,228,220,0.50)",
                      borderLeft: isActive ? "2px solid #E8E4DC" : "2px solid transparent",
                      paddingLeft: "10px",
                      background: isActive ? "rgba(255,255,255,0.04)" : undefined,
                    }}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: isActive ? "#E8E4DC" : "rgba(232,228,220,0.40)" }} />
                    <span className="uppercase tracking-wider">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {user && (
          <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center w-full gap-2.5 px-2 py-2 transition-colors outline-none hover:bg-white/4"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-7 w-7 border border-white/15">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-white/8 text-xs" style={{ color: "#E8E4DC" }}>
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium leading-none mb-0.5 truncate" style={{ color: "#E8E4DC" }}>
                      {user.firstName ? `${user.firstName} ${user.lastName || ''}` : "Executive"}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "rgba(232,228,220,0.40)" }}>
                      {user.orgRole === "admin" ? "Admin" : "Member"} · {user.email}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 shrink-0" style={{ color: "rgba(232,228,220,0.30)" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#141311] border-white/10" data-testid="menu-user">
                <DropdownMenuItem asChild>
                  <Link
                    href="/profile"
                    className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
                    style={{ color: "rgba(232,228,220,0.70)" }}
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    <span>Company Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings/team"
                    className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
                    style={{ color: "rgba(232,228,220,0.70)" }}
                    data-testid="nav-link-team"
                  >
                    <Users className="mr-2 h-3.5 w-3.5" />
                    <span>Team</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings/integrations"
                    className="flex items-center cursor-pointer text-xs w-full px-2 py-1.5"
                    style={{ color: "rgba(232,228,220,0.70)" }}
                    data-testid="nav-link-integrations"
                  >
                    <Link2 className="mr-2 h-3.5 w-3.5" />
                    <span>Integrations</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/8" />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="flex items-center cursor-pointer w-full text-xs px-2 py-1.5" style={{ color: "rgba(232,228,220,0.70)" }}>
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Main Content Area — light workspace */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--workspace-bg)" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3.5 border-b shrink-0" style={{ background: "var(--workspace-topbar)", borderColor: "var(--workspace-border)" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--workspace-muted)" }}>
            {breadcrumb.section && (
              <>
                <span className="uppercase tracking-wider">{breadcrumb.section}</span>
                <span style={{ color: "var(--workspace-border)" }}>/</span>
              </>
            )}
            <span className="uppercase tracking-wider font-medium" style={{ color: "var(--workspace-fg)" }}>
              {breadcrumb.title}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto" style={{ background: "var(--workspace-bg)" }}>
          {isFullBleed ? (
            children
          ) : (
            <div className="p-8">
              {children}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
