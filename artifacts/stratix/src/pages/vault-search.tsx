import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  X,
  FileText,
  Folder,
  Sparkles,
  Type,
  Layers,
} from "lucide-react";

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

type SearchMode = "hybrid" | "semantic" | "fulltext";

const MODE_CONFIG: Record<
  SearchMode,
  { label: string; icon: React.ReactNode; description: string }
> = {
  hybrid: {
    label: "Hybrid",
    icon: <Layers size={14} />,
    description: "Best of both — recommended",
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

export function VaultSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("hybrid");
  const [projects, setProjects] = useState<VaultProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<string[]>([]);

  // Load projects
  useEffect(() => {
    fetch("/api/vault/projects", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/vault/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: query.trim(),
          searchMode,
          projectIds: selectedProjectIds,
          filters: fileTypeFilter.length
            ? { fileTypes: fileTypeFilter }
            : undefined,
          limit: 20,
          offset: 0,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, searchMode, selectedProjectIds, fileTypeFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleProject = (id: number) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--workspace-text)",
          margin: "0 0 8px",
        }}
      >
        Search Vault
      </h1>
      <p
        style={{
          fontSize: "13px",
          color: "var(--workspace-text-muted)",
          margin: "0 0 24px",
        }}
      >
        Search across all your vault projects using AI-powered hybrid search.
      </p>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--workspace-surface, #1a1a2e)",
            border: "1px solid var(--workspace-border, #333)",
            borderRadius: "10px",
            padding: "0 14px",
          }}
        >
          <Search size={16} style={{ color: "var(--workspace-text-muted)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents, reports, and vault content..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--workspace-text)",
              fontSize: "14px",
              padding: "12px 0",
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            padding: "0 14px",
            borderRadius: "10px",
            border: "1px solid var(--workspace-border, #333)",
            background: showFilters
              ? "var(--workspace-accent, #3b82f6)"
              : "var(--workspace-surface, #1a1a2e)",
            color: showFilters ? "white" : "var(--workspace-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
          }}
        >
          <Filter size={14} />
          Filters
        </button>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: "0 20px",
            borderRadius: "10px",
            border: "none",
            background: "var(--workspace-accent, #3b82f6)",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            cursor:
              loading || !query.trim() ? "not-allowed" : "pointer",
            opacity: loading || !query.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Search mode toggle */}
      <div
        style={{ display: "flex", gap: "6px", marginBottom: showFilters ? "16px" : "24px" }}
      >
        {(Object.keys(MODE_CONFIG) as SearchMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border:
                searchMode === mode
                  ? "1px solid var(--workspace-accent, #3b82f6)"
                  : "1px solid var(--workspace-border, #333)",
              background:
                searchMode === mode
                  ? "rgba(59,130,246,0.1)"
                  : "transparent",
              color:
                searchMode === mode
                  ? "var(--workspace-accent, #3b82f6)"
                  : "var(--workspace-text-muted)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
            title={MODE_CONFIG[mode].description}
          >
            {MODE_CONFIG[mode].icon}
            {MODE_CONFIG[mode].label}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div
          style={{
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid var(--workspace-border, #333)",
            background: "var(--workspace-surface, #1a1a2e)",
            marginBottom: "24px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--workspace-text-muted)",
                marginBottom: "8px",
              }}
            >
              Projects
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: selectedProjectIds.includes(p.id)
                      ? "1px solid var(--workspace-accent, #3b82f6)"
                      : "1px solid var(--workspace-border, #333)",
                    background: selectedProjectIds.includes(p.id)
                      ? "rgba(59,130,246,0.1)"
                      : "transparent",
                    color: selectedProjectIds.includes(p.id)
                      ? "var(--workspace-accent, #3b82f6)"
                      : "var(--workspace-text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <Folder size={12} />
                  {p.name}
                </button>
              ))}
              {selectedProjectIds.length === 0 && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--workspace-text-muted)",
                    opacity: 0.6,
                  }}
                >
                  All projects (none selected)
                </span>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--workspace-text-muted)",
                marginBottom: "8px",
              }}
            >
              File Type
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {["pdf", "docx", "txt"].map((ft) => (
                <button
                  key={ft}
                  onClick={() =>
                    setFileTypeFilter((prev) =>
                      prev.includes(ft)
                        ? prev.filter((f) => f !== ft)
                        : [...prev, ft],
                    )
                  }
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: fileTypeFilter.includes(ft)
                      ? "1px solid var(--workspace-accent, #3b82f6)"
                      : "1px solid var(--workspace-border, #333)",
                    background: fileTypeFilter.includes(ft)
                      ? "rgba(59,130,246,0.1)"
                      : "transparent",
                    color: fileTypeFilter.includes(ft)
                      ? "var(--workspace-accent, #3b82f6)"
                      : "var(--workspace-text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--workspace-text-muted)",
              marginBottom: "4px",
            }}
          >
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </div>
          {results.map((result) => (
            <div
              key={`${result.documentId}-${result.chunkId}`}
              style={{
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid var(--workspace-border, #333)",
                background: "var(--workspace-surface, #1a1a2e)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <FileText
                  size={14}
                  style={{ color: "var(--workspace-accent, #3b82f6)" }}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--workspace-text)",
                  }}
                >
                  {result.documentTitle}
                </span>
                {result.projectName && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--workspace-text-muted)",
                      background: "var(--workspace-bg, #0f0f1a)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {result.projectName}
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    color: "var(--workspace-text-muted)",
                  }}
                >
                  Score: {result.score.toFixed(4)}
                </span>
              </div>

              {/* Highlighted text */}
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--workspace-text-muted)",
                  lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    result.highlights[0] ||
                    result.chunkText.slice(0, 200) + "...",
                }}
              />

              {/* Score breakdown */}
              {(result.scoreBreakdown.semantic ||
                result.scoreBreakdown.fulltext) && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "var(--workspace-text-muted)",
                    opacity: 0.7,
                  }}
                >
                  {result.scoreBreakdown.semantic && (
                    <span>Semantic: {result.scoreBreakdown.semantic.toFixed(4)}</span>
                  )}
                  {result.scoreBreakdown.fulltext && (
                    <span>Full-text: {result.scoreBreakdown.fulltext.toFixed(4)}</span>
                  )}
                  <span>{result.metadata.fileType.toUpperCase()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--workspace-text-muted)",
          }}
        >
          <Search size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontSize: "14px" }}>
            No results found for "{query}". Try a different search mode or
            broader terms.
          </p>
        </div>
      )}
    </div>
  );
}
