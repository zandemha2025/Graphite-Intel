import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Compass,
  LayoutGrid,
  Library,
  BookOpen,
  Zap,
  Database,
  Blocks,
  BarChart3,
  Shield,
  Users,
  Plug,
  Plus,
  FileText,
  Upload,
  Clock,
  Settings,
  Megaphone,
  Activity,
  Share2,
  type LucideIcon,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  route: string;
  shortcut?: string;
  keywords?: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const NAVIGATION_ITEMS: PaletteItem[] = [
  { id: "explore", label: "Explore", description: "AI chat & research", icon: Compass, route: "/explore", shortcut: "G E", keywords: "chat search ask" },
  { id: "boards", label: "Boards", description: "Kanban & dashboards", icon: LayoutGrid, route: "/boards", shortcut: "G B", keywords: "kanban dashboard grid" },
  { id: "reports", label: "Reports", description: "Report library", icon: Library, route: "/reports", shortcut: "G R", keywords: "report library list" },
  { id: "workflows", label: "Workflows", description: "Automation workflows", icon: Zap, route: "/workflows", shortcut: "G W", keywords: "automation pipeline" },
  { id: "builder", label: "Workflow Builder", description: "Visual workflow editor", icon: Blocks, route: "/workflow-builder", keywords: "build create editor visual" },
  { id: "knowledge", label: "Knowledge", description: "Document library", icon: BookOpen, route: "/knowledge", shortcut: "G K", keywords: "documents files library" },
  { id: "context", label: "Context", description: "Data sources & vault", icon: Database, route: "/context", keywords: "vault data sources" },
  { id: "playbooks", label: "Playbooks", description: "Reusable playbooks", icon: FileText, route: "/playbooks", keywords: "playbook template" },
  { id: "ads", label: "Ads", description: "Campaign management", icon: Megaphone, route: "/ads", keywords: "campaigns advertising" },
  { id: "analytics", label: "Analytics", description: "Usage analytics", icon: BarChart3, route: "/analytics", keywords: "metrics usage stats" },
  { id: "audit", label: "Audit Log", description: "Activity audit trail", icon: Shield, route: "/audit", keywords: "log trail security" },
  { id: "activity", label: "Activity Feed", description: "Recent activity", icon: Activity, route: "/activity", keywords: "feed recent" },
  { id: "shared", label: "Shared With Me", description: "Shared resources", icon: Share2, route: "/shared", keywords: "shared collaboration" },
  { id: "team", label: "Team", description: "Team management", icon: Users, route: "/settings/team", keywords: "members invite" },
  { id: "connections", label: "Connections", description: "Connected apps & data sources", icon: Plug, route: "/connections", keywords: "connect api services integrations pipedream" },
  { id: "profile", label: "Profile", description: "Account settings", icon: Settings, route: "/profile", keywords: "account settings preferences" },
];

const ACTION_ITEMS: PaletteItem[] = [
  { id: "new-report", label: "New Report", description: "Create a new report", icon: Plus, route: "/reports/new", keywords: "create report" },
  { id: "new-board", label: "New Board", description: "Create a new board", icon: Plus, route: "/boards/new", keywords: "create board" },
  { id: "new-workflow", label: "New Workflow", description: "Build a new workflow", icon: Plus, route: "/workflow-builder/new", keywords: "create workflow automation" },
  { id: "upload-doc", label: "Upload Document", description: "Add to knowledge base", icon: Upload, route: "/knowledge", keywords: "upload file document" },
];

// ---------------------------------------------------------------------------
// Recent pages – persisted in localStorage
// ---------------------------------------------------------------------------

const RECENT_KEY = "stratix:recent-pages";
const MAX_RECENT = 5;

function getRecentPages(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function pushRecentPage(route: string) {
  const ignored = ["/", "/login", "/org-setup", "/onboarding"];
  if (ignored.includes(route)) return;
  const recent = getRecentPages().filter((r) => r !== route);
  recent.unshift(route);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// ---------------------------------------------------------------------------
// Hook: track current page
// ---------------------------------------------------------------------------

function useTrackRecentPages() {
  const [location] = useLocation();
  useEffect(() => {
    pushRecentPage(location);
  }, [location]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  useTrackRecentPages();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (route: string) => {
      setOpen(false);
      setLocation(route);
    },
    [setLocation],
  );

  // Build recent items from localStorage, matching against known navigation items
  const recentItems = useMemo(() => {
    const all = [...NAVIGATION_ITEMS, ...ACTION_ITEMS];
    const recent = getRecentPages();
    return recent
      .map((route) => all.find((item) => item.route === route))
      .filter(Boolean) as PaletteItem[];
  }, [open]); // recalculate when palette opens

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 shadow-2xl border-[#E8E4DC]/10 bg-[#0D0C0B] max-w-[540px]"
        // Hide the default close button
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command
          className="bg-[#0D0C0B] text-[#E8E4DC] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[#E8E4DC]/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
        >
          <CommandInput
            placeholder="Type a command or search..."
            className="h-12 bg-transparent text-[#E8E4DC] placeholder:text-[#E8E4DC]/30 border-b border-[#E8E4DC]/10"
          />
          <CommandList className="max-h-[360px] overflow-y-auto">
            <CommandEmpty className="py-8 text-center text-sm text-[#E8E4DC]/40">
              No results found.
            </CommandEmpty>

            {/* Recent */}
            {recentItems.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {recentItems.map((item) => (
                    <PaletteRow
                      key={`recent-${item.id}`}
                      item={item}
                      onSelect={navigate}
                    />
                  ))}
                </CommandGroup>
                <CommandSeparator className="bg-[#E8E4DC]/5" />
              </>
            )}

            {/* Navigation */}
            <CommandGroup heading="Navigation">
              {NAVIGATION_ITEMS.map((item) => (
                <PaletteRow key={item.id} item={item} onSelect={navigate} />
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-[#E8E4DC]/5" />

            {/* Actions */}
            <CommandGroup heading="Actions">
              {ACTION_ITEMS.map((item) => (
                <PaletteRow key={item.id} item={item} onSelect={navigate} />
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-[#E8E4DC]/5 px-3 py-2 text-[10px] text-[#E8E4DC]/25">
            <span>Navigate with arrow keys</span>
            <span>
              <kbd className="rounded border border-[#E8E4DC]/10 px-1 py-0.5 text-[10px]">
                esc
              </kbd>{" "}
              to close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function PaletteRow({
  item,
  onSelect,
}: {
  item: PaletteItem;
  onSelect: (route: string) => void;
}) {
  const Icon = item.icon;
  return (
    <CommandItem
      value={`${item.label} ${item.keywords ?? ""}`}
      onSelect={() => onSelect(item.route)}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md text-[#E8E4DC]/70 data-[selected=true]:bg-[#E8E4DC]/5 data-[selected=true]:text-[#E8E4DC]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[#E8E4DC]/40" />
      <div className="flex flex-col gap-0 min-w-0">
        <span className="text-sm leading-tight">{item.label}</span>
        {item.description && (
          <span className="text-xs text-[#E8E4DC]/30 truncate leading-tight">
            {item.description}
          </span>
        )}
      </div>
      {item.shortcut && (
        <CommandShortcut className="ml-auto text-[10px] text-[#E8E4DC]/20">
          {item.shortcut}
        </CommandShortcut>
      )}
    </CommandItem>
  );
}
