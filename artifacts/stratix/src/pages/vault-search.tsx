import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  X,
  FileText,
  Folder,
  Sparkles,
  Type,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Calendar,
  Tag,
  FileIcon,
  FileType2,
  File,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VaultProject {
  id: number;
  name: string;
}

interface SearchResult {
  documentId: number;
  documentTitle: string;
  chunkId: number;
  chunkText: string;
  projectId: number | null;
  projectName: string | null;
  score: number;
  scoreBreakdown: { semantic?: number; fulltext?: number };
  highlights: string[];
  metadata: { fileType: string; createdAt: string; tags: string | null };
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  searchMode: string;
  projectsSearched: number[];
}

interface SavedQuery {
  id: number;
  name: string;
  description: string | null;
  query: string;
  searchMode: string;
  projectIds: number[];
  filters: { fileTypes?: string[]; dateRange?: { from: string; to: string } } | null;
  isShared: string;
  useCount: number;
  createdAt: string;
}

type SearchMode = "hybrid" | "semantic" | "fulltext";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODE_CONFIG: Record<
  SearchMode,
  { label: string; icon: React.ReactNode; description: string }
> = {
  hybrid: {
    label: "Hybrid",
    icon: <Layers size={14} />,
    description: "Best of both -- recommended",
  },
  semantic: {
    label: "Semantic",
    icon: <Sparkles size={14} />,
    description: "Meaning-based search",
  },
  fulltext: {
    label: "Full-Text",
    icon: <Type size={14} />,
    description: "Keyword matching",
  },
};

const FILE_TYPES = ["pdf", "docx", "txt", "csv", "xlsx", "md"] as const;
const PAGE_SIZE = 20;

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText size={14} className="text-red-400" />;
    case "docx":
      return <FileType2 size={14} className="text-blue-400" />;
    case "txt":
      return <File size={14} className="text-gray-400" />;
    default:
      return <FileIcon size={14} className="text-muted-foreground" />;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ------------------------------------------------------------------ */
/*  Debounce hook                                                      */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VaultSearch() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search state
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  // Save query dialog
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [saveQueryDesc, setSaveQueryDesc] = useState("");

  const debouncedQuery = useDebounce(query, 300);

  // Build the filters object for the API
  const filtersPayload = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (fileTypeFilter.length > 0) f.fileTypes = fileTypeFilter;
    if (tagFilter.trim()) f.tags = tagFilter.split(",").map((t) => t.trim()).filter(Boolean);
    if (dateFrom || dateTo) {
      f.dateRange = {
        from: dateFrom || "2000-01-01",
        to: dateTo || new Date().toISOString().split("T")[0],
      };
    }
    return Object.keys(f).length > 0 ? f : undefined;
  }, [fileTypeFilter, tagFilter, dateFrom, dateTo]);

  // Reset page when search params change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, searchMode, selectedProjectIds, fileTypeFilter, tagFilter, dateFrom, dateTo]);

  // ----- Fetch projects -----
  const { data: projects = [] } = useQuery<VaultProject[]>({
    queryKey: ["vault-projects"],
    queryFn: async () => {
      const res = await fetch("/api/vault/projects", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // ----- Fetch saved queries -----
  const { data: savedQueries = [] } = useQuery<SavedQuery[]>({
    queryKey: ["vault-saved-queries"],
    queryFn: async () => {
      const res = await fetch("/api/vault/saved-queries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // ----- Main search query -----
  const {
    data: searchResponse,
    isFetching: loading,
    refetch,
  } = useQuery<SearchResponse>({
    queryKey: ["vault-search", debouncedQuery, searchMode, selectedProjectIds, filtersPayload, page],
    queryFn: async () => {
      const res = await fetch("/api/vault/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: debouncedQuery.trim(),
          searchMode,
          projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
          filters: filtersPayload,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
    placeholderData: (prev) => prev,
  });

  const results = searchResponse?.results ?? [];
  const totalResults = searchResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // ----- Save query mutation -----
  const saveQueryMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await fetch("/api/vault/saved-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: payload.name,
          description: payload.description || null,
          query: query.trim(),
          searchMode,
          projectIds: selectedProjectIds,
          filters: filtersPayload ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save query");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-saved-queries"] });
      setSaveDialogOpen(false);
      setSaveQueryName("");
      setSaveQueryDesc("");
      toast({ title: "Query saved", description: "Your search has been saved for quick reuse." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save query. Please try again.", variant: "destructive" });
    },
  });

  // ----- Load saved query -----
  const loadSavedQuery = useCallback(
    (sq: SavedQuery) => {
      setQuery(sq.query);
      setSearchMode(sq.searchMode as SearchMode);
      setSelectedProjectIds(sq.projectIds ?? []);
      if (sq.filters?.fileTypes) setFileTypeFilter(sq.filters.fileTypes);
      if (sq.filters?.dateRange) {
        setDateFrom(sq.filters.dateRange.from ?? "");
        setDateTo(sq.filters.dateRange.to ?? "");
      }
      // Increment use count
      fetch(`/api/vault/saved-queries/${sq.id}/use`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    },
    [],
  );

  const toggleProject = (id: number) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const toggleFileType = (ft: string) => {
    setFileTypeFilter((prev) =>
      prev.includes(ft) ? prev.filter((f) => f !== ft) : [...prev, ft],
    );
  };

  const clearFilters = () => {
    setFileTypeFilter([]);
    setTagFilter("");
    setDateFrom("");
    setDateTo("");
    setSelectedProjectIds([]);
  };

  const hasActiveFilters =
    fileTypeFilter.length > 0 ||
    tagFilter.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    selectedProjectIds.length > 0;

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      {/* Header */}
      <h1 className="text-xl font-bold text-foreground mb-1">Search Vault</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Search across all your vault projects using AI-powered hybrid search.
      </p>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2.5 border border-input rounded-lg px-3">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, reports, and vault content..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm py-2.5 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-auto px-3"
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {fileTypeFilter.length + selectedProjectIds.length + (tagFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search mode toggle */}
      <div className="flex items-center gap-1.5 mb-4">
        {(Object.keys(MODE_CONFIG) as SearchMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              searchMode === mode
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground hover:text-foreground"
            }`}
            title={MODE_CONFIG[mode].description}
          >
            {MODE_CONFIG[mode].icon}
            {MODE_CONFIG[mode].label}
          </button>
        ))}

        {/* Save query button */}
        {query.trim() && (
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto text-xs">
                <Bookmark size={14} />
                Save Query
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search Query</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="sq-name" className="text-xs">Name</Label>
                  <Input
                    id="sq-name"
                    value={saveQueryName}
                    onChange={(e) => setSaveQueryName(e.target.value)}
                    placeholder="e.g. Q4 compliance docs"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="sq-desc" className="text-xs">Description (optional)</Label>
                  <Input
                    id="sq-desc"
                    value={saveQueryDesc}
                    onChange={(e) => setSaveQueryDesc(e.target.value)}
                    placeholder="Brief description"
                    className="mt-1"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Query: <span className="font-medium text-foreground">{query}</span>
                  <br />
                  Mode: {MODE_CONFIG[searchMode].label}
                  {selectedProjectIds.length > 0 && (
                    <>
                      <br />
                      Projects: {selectedProjectIds.length} selected
                    </>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </DialogClose>
                <Button
                  size="sm"
                  disabled={!saveQueryName.trim() || saveQueryMutation.isPending}
                  onClick={() =>
                    saveQueryMutation.mutate({
                      name: saveQueryName.trim(),
                      description: saveQueryDesc.trim(),
                    })
                  }
                >
                  {saveQueryMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Saved queries chips */}
      {savedQueries.length > 0 && !query.trim() && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Saved Searches</div>
          <div className="flex flex-wrap gap-1.5">
            {savedQueries.slice(0, 8).map((sq) => (
              <button
                key={sq.id}
                onClick={() => loadSavedQuery(sq)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-input text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
              >
                <Bookmark size={10} />
                {sq.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="p-4 rounded-lg border border-input bg-card mb-5 space-y-4">
          {/* Projects */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Folder size={12} />
              Projects
            </div>
            <div className="flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                    selectedProjectIds.includes(p.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Folder size={11} />
                  {p.name}
                </button>
              ))}
              {projects.length === 0 && (
                <span className="text-xs text-muted-foreground/60">No projects found</span>
              )}
            </div>
          </div>

          {/* File types */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileIcon size={12} />
              File Type
            </div>
            <div className="flex flex-wrap gap-2">
              {FILE_TYPES.map((ft) => (
                <label
                  key={ft}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer"
                >
                  <Checkbox
                    checked={fileTypeFilter.includes(ft)}
                    onCheckedChange={() => toggleFileType(ft)}
                  />
                  <span className="uppercase">{ft}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar size={12} />
              Date Range
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Tag size={12} />
              Tags
            </div>
            <Input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Comma-separated tags, e.g. compliance, finance"
              className="h-8 text-xs"
            />
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>
              <X size={12} />
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Searching...</span>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? "s" : ""} found
              {page > 0 && ` (page ${page + 1})`}
            </span>
          </div>

          {results.map((result) => (
            <div
              key={`${result.documentId}-${result.chunkId}`}
              className="p-4 rounded-lg border border-input bg-card hover:border-foreground/20 transition-colors"
            >
              {/* Title row */}
              <div className="flex items-center gap-2 mb-2">
                {getFileIcon(result.metadata.fileType)}
                <span className="text-sm font-semibold text-foreground">
                  {result.documentTitle}
                </span>
                {result.projectName && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {result.projectName}
                  </Badge>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatDate(result.metadata.createdAt)}
                </span>
              </div>

              {/* Highlighted snippet */}
              <div
                className="text-xs text-muted-foreground leading-relaxed [&_mark]:bg-yellow-500/30 [&_mark]:text-foreground [&_mark]:rounded-sm [&_mark]:px-0.5"
                dangerouslySetInnerHTML={{
                  __html:
                    result.highlights[0] ||
                    result.chunkText.slice(0, 250) + "...",
                }}
              />

              {/* Score & metadata row */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/70">
                <span>Score: {result.score.toFixed(4)}</span>
                {result.scoreBreakdown.semantic != null && (
                  <span>Semantic: {result.scoreBreakdown.semantic.toFixed(4)}</span>
                )}
                {result.scoreBreakdown.fulltext != null && (
                  <span>Full-text: {result.scoreBreakdown.fulltext.toFixed(4)}</span>
                )}
                <span className="uppercase">{result.metadata.fileType}</span>
                {result.metadata.tags && (
                  <span className="flex items-center gap-0.5">
                    <Tag size={9} /> {result.metadata.tags}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state - no query */}
      {!loading && !query.trim() && (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Enter a search query above to search across all vault documents.
          </p>
          <p className="text-xs mt-1 opacity-60">
            Hybrid mode combines keyword matching with AI-powered semantic understanding.
          </p>
        </div>
      )}

      {/* Empty state - no results */}
      {!loading && query.trim() && debouncedQuery.trim() && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            No results found for &quot;{debouncedQuery}&quot;.
          </p>
          <p className="text-xs mt-1 opacity-60">
            Try a different search mode, broader terms, or adjust your filters.
          </p>
        </div>
      )}
    </div>
  );
}
