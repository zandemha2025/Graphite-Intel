import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  Hammer,
  Radar,
  Plug,
  Settings,
  Search,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const pages: PaletteItem[] = [
  { id: "solve", label: "Solve", description: "Ask anything, get strategy-grade analysis", path: "/solve", icon: Sparkles },
  { id: "build", label: "Build", description: "Notebooks, boards, and reports", path: "/build", icon: Hammer },
  { id: "intelligence", label: "Intelligence", description: "Competitive monitoring and signals", path: "/intelligence", icon: Radar },
  { id: "connect", label: "Connect", description: "Data sources and integrations", path: "/connect", icon: Plug },
  { id: "settings", label: "Settings", description: "Account and workspace settings", path: "/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = pages.filter(
    (p) =>
      p.label.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      close();
      setLocation(path);
    },
    [close, setLocation],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      navigate(filtered[activeIndex].path);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#1A1918]/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-[520px] mx-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center px-1.5 rounded-[4px] bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-body-sm text-[var(--text-secondary)]">
              No results found
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === activeIndex
                    ? "bg-[var(--accent)]/8"
                    : "hover:bg-[var(--background)]"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
                    idx === activeIndex
                      ? "bg-[var(--accent)]/15"
                      : "bg-[var(--background)]"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${
                      idx === activeIndex
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[var(--text-primary)]">
                    {item.label}
                  </div>
                  <div className="text-[12px] text-[var(--text-secondary)] truncate">
                    {item.description}
                  </div>
                </div>
                {idx === activeIndex && (
                  <CornerDownLeft className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" />
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <CornerDownLeft className="h-3 w-3" />
            <span>open</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] ml-auto">
            <Command className="h-3 w-3" />
            <span>K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
