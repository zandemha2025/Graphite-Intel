import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListBoards, useCreateBoard, getListBoardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, BookText, LayoutGrid } from "lucide-react";
import { format } from "date-fns";

interface NotebookItem { id: number; title: string; updatedAt: string; cellCount: number; }

type Filter = "all" | "notebooks" | "boards";

export function Build() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"edited" | "name">("edited");
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);

  const { data: boards = [], isError: boardsError, refetch: refetchBoards } = useListBoards();
  const createBoard = useCreateBoard();

  useEffect(() => {
    fetch("/api/notebooks", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setNotebooks(d))
      .catch(() => {});
  }, []);

  const items = [
    ...((filter === "all" || filter === "notebooks") ? notebooks.map((n) => ({ ...n, kind: "notebook" as const, href: `/build/notebooks/${n.id}` })) : []),
    ...((filter === "all" || filter === "boards") ? (boards as Array<{ id: number; title: string; updatedAt: string }>).map((b) => ({ ...b, kind: "board" as const, cellCount: 0, href: `/build/boards/${b.id}` })) : []),
  ]
    .filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name"
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  const handleNewNotebook = async () => {
    try {
      // Auto-increment: find next available "Untitled Notebook" name
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
      }
    );
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
            {(["all", "notebooks", "boards"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-body-sm rounded-[var(--radius-sm)] transition-colors ${filter === f ? "text-[var(--text-primary)] font-medium bg-[var(--surface)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {/* New cards — filtered to match active filter */}
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

        {/* Items */}
        {items.map((item) => {
          const Icon = item.kind === "notebook" ? BookText : LayoutGrid;
          return (
            <div
              key={`${item.kind}-${item.id}`}
              onClick={() => setLocation(item.href)}
              className="flex flex-col h-40 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md transition-all cursor-pointer overflow-hidden"
            >
              <div className="flex-1 flex items-center justify-center bg-[var(--surface-secondary)]">
                <Icon className="h-8 w-8 text-[var(--border-strong)]" />
              </div>
              <div className="px-3 py-2.5">
                <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{item.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{format(new Date(item.updatedAt), "MMM d, yyyy")}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
