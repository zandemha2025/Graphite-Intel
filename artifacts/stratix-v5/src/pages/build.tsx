import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListBoards, useCreateBoard, getListBoardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, BookText, LayoutGrid, Star, List, Grid3X3,
  Sparkles, FileBarChart, CalendarDays, Megaphone, Globe, Target,
  Shield, TrendingUp, BarChart3, Link, Rocket, Eye, MessageCircle,
  Newspaper, PieChart, Heart, DollarSign, GitBranch, Palette, Filter,
  Users, Mail, Calculator, ClipboardList, Coins, Flame, FileSpreadsheet,
  SlidersHorizontal, Scale, MessageSquare, UserCircle, Maximize, Cpu,
  GitCompare, ClipboardCheck, Radar, FileKey, BookOpen, X, Waves,
  Crosshair, Sunrise,
} from "lucide-react";
import { format } from "date-fns";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  searchTemplates,
  type Template,
  type TemplateCategory,
} from "@/lib/templates";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, FileBarChart, CalendarDays, Megaphone, Globe, Target,
  Shield, TrendingUp, BarChart3, Link, Rocket, Eye, MessageCircle,
  Newspaper, PieChart, Heart, DollarSign, GitBranch, Palette, Filter,
  Users, Mail, Calculator, ClipboardList, Coins, Flame, FileSpreadsheet,
  SlidersHorizontal, Scale, MessageSquare, UserCircle, Maximize, Cpu,
  GitCompare, ClipboardCheck, Radar, FileKey, BookOpen, LayoutGrid,
  Waves, Crosshair, Sunrise,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Sparkles;
}

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  strategy: "bg-indigo-100 text-indigo-700",
  intelligence: "bg-amber-100 text-amber-700",
  marketing: "bg-emerald-100 text-emerald-700",
  finance: "bg-rose-100 text-rose-700",
  research: "bg-sky-100 text-sky-700",
};

interface NotebookItem { id: number; title: string; updatedAt: string; cellCount: number; }

type ItemFilter = "all" | "notebooks" | "boards" | "favorites";
type ViewMode = "grid" | "list";

export function Build() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"edited" | "name">("edited");
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("stratix:favorites") || "[]"));
    } catch {
      return new Set();
    }
  });

  // Template browser state
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | "all">("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const filteredTemplates = searchTemplates(templateSearch, templateCategory);

  const { data: boards = [], isError: boardsError, refetch: refetchBoards } = useListBoards();
  const createBoard = useCreateBoard();

  useEffect(() => {
    fetch("/api/notebooks", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotebooks(Array.isArray(d) ? d : []))
      .catch(() => setNotebooks([]));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("stratix:favorites", JSON.stringify([...favorites]));
    } catch {
      // localStorage unavailable
    }
  }, [favorites]);

  const safeBoards = Array.isArray(boards) ? boards as Array<{ id: number; title: string; updatedAt: string }> : [];
  const safeNotebooks = Array.isArray(notebooks) ? notebooks : [];

  const allItems = [
    ...((filter === "all" || filter === "notebooks" || filter === "favorites") ? safeNotebooks.map((n) => ({ ...n, kind: "notebook" as const, href: `/build/notebooks/${n.id}` })) : []),
    ...((filter === "all" || filter === "boards" || filter === "favorites") ? safeBoards.map((b) => ({ ...b, kind: "board" as const, cellCount: 0, href: `/build/boards/${b.id}` })) : []),
  ];

  const items = allItems
    .filter((i) => {
      const isFavorite = favorites.has(`${i.kind}-${i.id}`);
      if (filter === "favorites") return isFavorite && (!search || i.title.toLowerCase().includes(search.toLowerCase()));
      return !search || i.title.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) =>
      sortBy === "name"
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  const toggleFavorite = (kind: string, id: number) => {
    const key = `${kind}-${id}`;
    const newFavorites = new Set(favorites);
    if (newFavorites.has(key)) {
      newFavorites.delete(key);
    } else {
      newFavorites.add(key);
    }
    setFavorites(newFavorites);
  };

  const handleNewNotebook = async () => {
    try {
      const base = "Untitled Notebook";
      const existing = new Set(notebooks.map((n) => n.title));
      let computedTitle = base;
      if (existing.has(base)) {
        let i = 2;
        while (existing.has(`${base} ${i}`)) i++;
        computedTitle = `${base} ${i}`;
      }

      const res = await fetch("/api/notebooks", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: computedTitle, description: "" }),
      });
      if (res.ok) { const nb = await res.json(); setLocation(`/build/notebooks/${nb.id}`); }
    } catch { toast({ title: "Failed to create notebook", variant: "destructive" }); }
  };

  const handleNewBoard = () => {
    createBoard.mutate(
      { data: { title: "Untitled Board", type: "live" } },
      {
        onSuccess: (board) => {
          queryClient.invalidateQueries({ queryKey: getListBoardsQueryKey() });
          setLocation(`/build/boards/${board.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create board", variant: "destructive" });
        },
      }
    );
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      const base = template.title;
      const existing = new Set(notebooks.map((n) => n.title));
      let computedTitle = base;
      if (existing.has(base)) {
        let i = 2;
        while (existing.has(`${base} ${i}`)) i++;
        computedTitle = `${base} ${i}`;
      }

      const res = await fetch("/api/notebooks", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: computedTitle, description: template.description }),
      });

      if (!res.ok) {
        toast({ title: "Failed to create notebook", variant: "destructive" });
        return;
      }

      const nb = await res.json();

      // Populate cells from template
      for (const cell of template.cells) {
        await fetch(`/api/notebooks/${nb.id}/cells`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: cell.type, content: cell.content }),
        });
      }

      toast({ title: "Template applied", description: `Created "${computedTitle}" with ${template.cells.length} cells` });
      setLocation(`/build/notebooks/${nb.id}`);
    } catch {
      toast({ title: "Failed to apply template", variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Build</h1>

      <div className="flex items-center justify-between mt-6 gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {(["all", "notebooks", "boards", "favorites"] as ItemFilter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-body-sm rounded-[var(--radius-sm)] transition-colors ${filter === f ? "text-[var(--text-primary)] font-medium bg-[var(--surface)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {f === "favorites" ? "Favorites" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "edited" | "name")}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-body-sm text-[var(--text-secondary)]"
          >
            <option value="edited">Last edited</option>
            <option value="name">Name A-Z</option>
          </select>

          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-4">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${viewMode === "grid" ? "bg-[var(--surface)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-[var(--radius-sm)] transition-colors ${viewMode === "list" ? "bg-[var(--surface)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {boardsError && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20">
          <p className="text-body-sm text-[var(--error)]">Failed to load boards. The server returned an error.</p>
          <button
            onClick={() => refetchBoards()}
            className="ml-4 shrink-0 px-3 py-1.5 text-body-sm font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {/* Templates Section */}
      {(filter === "all" || filter === "notebooks") && (
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-[var(--text-primary)]">Start from Template</h2>
              <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                {TEMPLATES.length}+ templates
              </span>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 mb-4">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setTemplateCategory(cat.key)}
                className={`px-3 py-1.5 text-body-sm rounded-[var(--radius-sm)] transition-colors ${
                  templateCategory === cat.key
                    ? "text-[var(--text-primary)] font-medium bg-[var(--surface)] border border-[var(--border-strong)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Template search */}
          <div className="relative max-w-xs mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Filter templates..."
              className="w-full pl-10 pr-4 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = getIcon(template.icon);
              return (
                <div
                  key={template.id}
                  className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all overflow-hidden group"
                >
                  <div className="flex-1 flex items-center justify-center bg-[var(--surface-secondary)] py-6 relative">
                    <Icon className="h-8 w-8 text-[var(--accent)]" />
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="absolute top-2 right-2 px-2 py-1 text-[10px] font-medium rounded-[var(--radius-sm)] bg-white/80 hover:bg-white text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Preview
                    </button>
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{template.title}</p>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{template.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${CATEGORY_COLORS[template.category]}`}>
                        {template.category}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{template.cells.length} cells</span>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="mt-3 w-full px-3 py-1.5 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Search className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-body-sm text-[var(--text-muted)]">No templates match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)}>
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
              <div>
                <h3 className="text-[18px] font-medium text-[var(--text-primary)]">{previewTemplate.title}</h3>
                <p className="text-body-sm text-[var(--text-muted)] mt-0.5">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {previewTemplate.cells.map((cell, idx) => (
                <div
                  key={idx}
                  className="rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      cell.type === "markdown" ? "bg-blue-100 text-blue-700" :
                      cell.type === "ai-prompt" ? "bg-purple-100 text-purple-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {cell.type === "ai-prompt" ? "AI Prompt" : cell.type === "markdown" ? "Markdown" : "Code"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Cell {idx + 1}</span>
                  </div>
                  <pre className="px-3 py-2.5 text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto bg-[var(--surface)]">
                    {cell.content}
                  </pre>
                </div>
              ))}
            </div>
            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-body-sm rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 text-body-sm font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-12 py-12">
          <div className="w-24 h-24 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mb-4">
            <BookText className="h-12 w-12 text-[var(--text-muted)]" />
          </div>
          <p className="text-body-md text-[var(--text-secondary)] mt-2">Your workspace is empty.</p>
          <p className="text-body-sm text-[var(--text-muted)] mt-1">Create a notebook or board, or start from a template.</p>
        </div>
      )}

      {/* Items Grid View */}
      {items.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {(filter === "all" || filter === "notebooks") && (
          <button onClick={handleNewNotebook} className="flex flex-col items-center justify-center h-40 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
            <Plus className="h-6 w-6 text-[var(--text-muted)] mb-2" />
            <span className="text-body-sm text-[var(--text-primary)]">New Notebook</span>
          </button>
        )}
        {(filter === "all" || filter === "boards") && (
          <button onClick={handleNewBoard} className="flex flex-col items-center justify-center h-40 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
            <Plus className="h-6 w-6 text-[var(--text-muted)] mb-2" />
            <span className="text-body-sm text-[var(--text-primary)]">New Board</span>
          </button>
        )}

          {items.map((item) => {
            const Icon = item.kind === "notebook" ? BookText : LayoutGrid;
            const itemKey = `${item.kind}-${item.id}`;
            const isFavorite = favorites.has(itemKey);
            return (
              <div
                key={itemKey}
                className="flex flex-col h-40 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="flex-1 flex items-center justify-center bg-[var(--surface-secondary)] relative cursor-pointer" onClick={() => setLocation(item.href)}>
                  <Icon className="h-8 w-8 text-[var(--border-strong)]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.kind, item.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-[var(--radius-sm)] bg-white/80 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                  </button>
                </div>
                <div className="px-3 py-2.5 cursor-pointer" onClick={() => setLocation(item.href)}>
                  <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{format(new Date(item.updatedAt), "MMM d, yyyy")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items List View */}
      {items.length > 0 && viewMode === "list" && (
        <div className="space-y-2 mt-6">
          {items.map((item) => {
            const Icon = item.kind === "notebook" ? BookText : LayoutGrid;
            const itemKey = `${item.kind}-${item.id}`;
            const isFavorite = favorites.has(itemKey);
            return (
              <div
                key={itemKey}
                onClick={() => setLocation(item.href)}
                className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer group"
              >
                <Icon className="h-5 w-5 text-[var(--border-strong)] shrink-0" />
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{format(new Date(item.updatedAt), "MMM d, yyyy")}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.kind, item.id);
                  }}
                  className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-secondary)] transition-all opacity-0 group-hover:opacity-100"
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
