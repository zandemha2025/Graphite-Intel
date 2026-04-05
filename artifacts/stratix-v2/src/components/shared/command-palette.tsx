import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocation } from "wouter";
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
  Plus,
  Clock,
  Search,
  User,
  Shield,
  Users,
  Activity,
  Share2,
} from "lucide-react";

const NAVIGATION_ITEMS = [
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "Notebooks", path: "/notebooks", icon: BookOpen },
  { label: "Boards", path: "/boards", icon: LayoutGrid },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Workflows", path: "/workflows", icon: Workflow },
  { label: "Playbooks", path: "/playbooks", icon: BookMarked },
  { label: "Ads", path: "/ads", icon: Megaphone },
  { label: "Context", path: "/context", icon: Brain },
  { label: "Vault", path: "/vault", icon: Lock },
  { label: "Connections", path: "/connections", icon: Cable },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Knowledge", path: "/knowledge", icon: BookOpen },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Security", path: "/security", icon: Shield },
  { label: "Team", path: "/settings/team", icon: Users },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Shared", path: "/shared", icon: Share2 },
];

const ACTION_ITEMS = [
  { label: "New Report", path: "/reports/new", icon: Plus },
  { label: "New Workflow", path: "/workflow-builder", icon: Plus },
  { label: "New Board", path: "/boards", icon: Plus },
];

function getRecentPages(): { label: string; path: string }[] {
  try {
    const raw = localStorage.getItem("stratix:recent-pages");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentPage(label: string, path: string) {
  try {
    const items = getRecentPages().filter((i) => i.path !== path);
    items.unshift({ label, path });
    localStorage.setItem(
      "stratix:recent-pages",
      JSON.stringify(items.slice(0, 5)),
    );
  } catch {
    // noop
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const navigate = (path: string, label: string) => {
    addRecentPage(label, path);
    setLocation(path);
    setOpen(false);
  };

  const recents = getRecentPages();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 outline-none">
          <Command className="bg-white rounded-2xl border border-[#E5E5E3]/50 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 border-b border-[#E5E5E3]/60">
              <Search size={16} className="text-[#8A8A8A] flex-shrink-0" />
              <Command.Input
                placeholder="Search pages, actions..."
                className="flex-1 h-12 text-base bg-transparent outline-none placeholder:text-[#A3A3A3]"
              />
              <kbd className="text-[10px] text-[#A3A3A3] bg-[#F5F5F4] px-1.5 py-0.5 rounded border border-[#E5E5E3]/60 font-medium">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[320px] overflow-y-auto p-1.5">
              <Command.Empty className="py-8 text-center text-sm text-[#A3A3A3]">
                No results found.
              </Command.Empty>

              {recents.length > 0 && (
                <Command.Group
                  heading={
                    <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wide px-4 py-2 block">
                      Recent
                    </span>
                  }
                >
                  {recents.map((item) => (
                    <Command.Item
                      key={`recent-${item.path}`}
                      value={`recent ${item.label}`}
                      onSelect={() => navigate(item.path, item.label)}
                      className="flex items-center gap-2.5 py-2.5 px-4 text-sm text-[#404040] rounded-lg cursor-pointer data-[selected=true]:bg-[#F5F5F4]"
                    >
                      <Clock size={16} className="text-[#8A8A8A] flex-shrink-0" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group
                heading={
                  <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wide px-4 py-2 block">
                    Navigation
                  </span>
                }
              >
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.path}
                      value={item.label}
                      onSelect={() => navigate(item.path, item.label)}
                      className="flex items-center gap-2.5 py-2.5 px-4 text-sm text-[#404040] rounded-lg cursor-pointer data-[selected=true]:bg-[#F5F5F4]"
                    >
                      <Icon size={16} className="text-[#8A8A8A] flex-shrink-0" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>

              <Command.Group
                heading={
                  <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wide px-4 py-2 block">
                    Actions
                  </span>
                }
              >
                {ACTION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={`action-${item.path}`}
                      value={`action ${item.label}`}
                      onSelect={() => navigate(item.path, item.label)}
                      className="flex items-center gap-2.5 py-2.5 px-4 text-sm text-[#404040] rounded-lg cursor-pointer data-[selected=true]:bg-[#F5F5F4]"
                    >
                      <Icon size={16} className="text-[#8A8A8A] flex-shrink-0" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E5E5E3]/40 bg-[#FAFAF9]/50">
              <span className="text-[11px] text-[#A3A3A3]">
                Navigate with <kbd className="font-mono text-[10px]">↑↓</kbd> &middot; Select with{" "}
                <kbd className="font-mono text-[10px]">↵</kbd>
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
