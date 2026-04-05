import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, apiPost } from "@/lib/api";

/* ---------- types ---------- */

type SearchMode = "hybrid" | "semantic" | "fulltext";

interface SearchResult {
  id: number;
  title: string;
  fileType: string;
  snippet: string;
  score: number;
  projectName?: string;
  tags?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

interface SavedQuery {
  id: number;
  name: string;
  query: string;
  searchMode: SearchMode;
  filters: SearchFilters;
}

interface SearchFilters {
  fileTypes: string[];
  dateFrom: string;
  dateTo: string;
  tags: string[];
}

/* ---------- helpers ---------- */

const FILE_TYPES = ["pdf", "docx", "txt", "csv", "xlsx", "md"];
const PAGE_SIZE = 10;

function fileIcon(type: string) {
  if (type.includes("pdf")) return FileText;
  if (type.includes("sheet") || type.includes("csv") || type.includes("excel"))
    return FileSpreadsheet;
  if (type.includes("image")) return FileImage;
  return File;
}

/* ---------- component ---------- */

export default function VaultSearchPage() {
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [filters, setFilters] = useState<SearchFilters>({
    fileTypes: [],
    dateFrom: "",
    dateTo: "",
    tags: [],
  });
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* --- saved queries --- */

  const { data: savedQueries } = useQuery<SavedQuery[]>({
    queryKey: ["vault-saved-queries"],
    queryFn: () => api<SavedQuery[]>("/vault/saved-queries"),
  });

  const saveQueryMutation = useMutation({
    mutationFn: () =>
      apiPost("/vault/saved-queries", {
        name: saveName,
        query,
        searchMode: mode,
        filters,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-saved-queries"] });
      toast.success("Query saved");
      setShowSave(false);
      setSaveName("");
    },
    onError: () => toast.error("Failed to save query"),
  });

  /* --- search --- */

  const executeSearch = useCallback(
    async (q: string, m: SearchMode, f: SearchFilters, p: number) => {
      if (!q.trim()) {
        setResults(null);
        return;
      }
      setSearching(true);
      try {
        const body: Record<string, unknown> = {
          query: q,
          searchMode: m,
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        };
        const activeFilters: Record<string, unknown> = {};
        if (f.fileTypes.length > 0) activeFilters.fileTypes = f.fileTypes;
        if (f.dateFrom) activeFilters.dateFrom = f.dateFrom;
        if (f.dateTo) activeFilters.dateTo = f.dateTo;
        if (f.tags.length > 0) activeFilters.tags = f.tags;
        if (Object.keys(activeFilters).length > 0) body.filters = activeFilters;

        const res = await apiPost<SearchResponse>("/vault/query", body);
        setResults(res.results);
        setTotal(res.total);
      } catch {
        toast.error("Search failed");
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  /* --- debounced search on query change --- */

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      executeSearch(query, mode, filters, 0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, mode, filters, executeSearch]);

  /* --- pagination --- */

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goPage = (p: number) => {
    setPage(p);
    executeSearch(query, mode, filters, p);
  };

  /* --- filter toggles --- */

  const toggleFileType = (ft: string) => {
    setFilters((prev) => ({
      ...prev,
      fileTypes: prev.fileTypes.includes(ft)
        ? prev.fileTypes.filter((t) => t !== ft)
        : [...prev.fileTypes, ft],
    }));
  };

  const loadSavedQuery = (sq: SavedQuery) => {
    setQuery(sq.query);
    setMode(sq.searchMode);
    setFilters(sq.filters);
    setPage(0);
  };

  /* --- mode buttons --- */

  const modes: { value: SearchMode; label: string }[] = [
    { value: "hybrid", label: "Hybrid" },
    { value: "semantic", label: "Semantic" },
    { value: "fulltext", label: "Full-text" },
  ];

  return (
    <Page title="Vault Search" subtitle="Search across all vault documents">
      <div className="flex gap-6">
        {/* Sidebar filters */}
        <aside className="w-56 shrink-0 space-y-6">
          {/* Search mode */}
          <div>
            <h3 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
              Mode
            </h3>
            <div className="flex flex-col gap-1">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${
                    mode === m.value
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#404040] hover:bg-[#F6F5F4]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* File type filter */}
          <div>
            <h3 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
              File Type
            </h3>
            <div className="space-y-1">
              {FILE_TYPES.map((ft) => (
                <label
                  key={ft}
                  className="flex items-center gap-2 text-sm text-[#404040] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.fileTypes.includes(ft)}
                    onChange={() => toggleFileType(ft)}
                    className="rounded border-[#E5E5E3] text-[#0A0A0A] focus:ring-[#0A0A0A]"
                  />
                  {ft.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <h3 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
              Date Range
            </h3>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
                className="flex h-8 w-full rounded-lg border border-[#E5E5E3] bg-white px-2 text-xs text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
                className="flex h-8 w-full rounded-lg border border-[#E5E5E3] bg-white px-2 text-xs text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          {/* Saved queries */}
          {(savedQueries ?? []).length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider mb-2">
                Saved Queries
              </h3>
              <div className="flex flex-wrap gap-1">
                {savedQueries!.map((sq) => (
                  <button
                    key={sq.id}
                    onClick={() => loadSavedQuery(sq)}
                    className="rounded-full bg-[#F3F3F1] px-2.5 py-1 text-xs text-[#404040] hover:bg-[#E5E5E3] transition-colors"
                  >
                    {sq.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Search vault documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {query.trim() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSave(true)}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            )}
          </div>

          {/* Active filters */}
          {(filters.fileTypes.length > 0 ||
            filters.dateFrom ||
            filters.dateTo) && (
            <div className="flex items-center gap-1 mb-4 flex-wrap">
              {filters.fileTypes.map((ft) => (
                <span
                  key={ft}
                  className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F1] px-2 py-0.5 text-xs text-[#404040]"
                >
                  {ft.toUpperCase()}
                  <button onClick={() => toggleFileType(ft)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filters.dateFrom && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F1] px-2 py-0.5 text-xs text-[#404040]">
                  From: {filters.dateFrom}
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, dateFrom: "" }))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F1] px-2 py-0.5 text-xs text-[#404040]">
                  To: {filters.dateTo}
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, dateTo: "" }))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* No query state */}
          {!query.trim() && results === null && (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#E5E5E3] rounded-xl">
              <Search className="h-8 w-8 text-[#9CA3AF] mb-2" />
              <p className="text-sm text-[#9CA3AF]">
                Enter a query to search vault documents
              </p>
            </div>
          )}

          {/* Loading */}
          {searching && (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Results */}
          {!searching && results !== null && (
            <>
              <p className="text-xs text-[#9CA3AF] mb-3">
                {total} result{total !== 1 ? "s" : ""} found
              </p>
              {results.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] py-8 text-center">
                  No results match your query.
                </p>
              ) : (
                <div className="space-y-2">
                  {results.map((r) => {
                    const Icon = fileIcon(r.fileType);
                    return (
                      <Card key={r.id} hoverable className="flex items-start gap-3 p-4">
                        <Icon className="h-5 w-5 text-[#9CA3AF] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#0A0A0A] truncate">
                              {r.title}
                            </p>
                            {r.projectName && (
                              <Badge variant="info" className="shrink-0">
                                {r.projectName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#404040] mt-1 line-clamp-2">
                            {r.snippet}
                          </p>
                          {r.tags && r.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {r.tags.map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            variant={r.score >= 0.7 ? "success" : r.score >= 0.4 ? "warning" : "default"}
                          >
                            {(r.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => goPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-[#404040]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => goPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save query dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent>
          <DialogTitle>Save Query</DialogTitle>
          <DialogDescription>
            Save this search for quick access later.
          </DialogDescription>
          <div className="mt-4">
            <Input
              placeholder="Query name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowSave(false)}>
              Cancel
            </Button>
            <Button
              disabled={!saveName.trim()}
              loading={saveQueryMutation.isPending}
              onClick={() => saveQueryMutation.mutate()}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
