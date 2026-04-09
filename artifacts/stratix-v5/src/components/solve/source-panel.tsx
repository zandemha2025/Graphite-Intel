import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react";

interface SourcePanelProps {
  sources: Array<{
    documentId: number;
    documentTitle: string;
    chunkIndex: number;
    snippet: string;
    similarity: number;
  }>;
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(sources) || sources.length === 0) return null;

  const uniqueDocs = new Set(sources.map((s) => s.documentId)).size;

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--surface)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            {sources.length} source{sources.length !== 1 ? "s" : ""} referenced
            {uniqueDocs !== sources.length && (
              <span className="text-[var(--text-muted)] font-normal">
                {" "}from {uniqueDocs} document{uniqueDocs !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Expanded source cards */}
      {expanded && (
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {sources.map((source, i) => {
            const relevance = Math.round((source.similarity ?? 0) * 100);
            const relevanceColor =
              relevance >= 80
                ? "#3C8B4E"
                : relevance >= 60
                ? "#8B7A3C"
                : "#8B8B8B";

            return (
              <div
                key={`${source.documentId}-${source.chunkIndex}-${i}`}
                className="px-3 py-2.5 hover:bg-[var(--surface)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/connect?tab=knowledge&doc=${source.documentId}`}
                        className="text-[12px] font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate flex items-center gap-1"
                      >
                        {source.documentTitle || "Untitled Document"}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                      </a>
                    </div>
                    {source.snippet && (
                      <p className="mt-1 text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                  <div
                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      color: relevanceColor,
                      backgroundColor: `${relevanceColor}15`,
                    }}
                  >
                    {relevance}% match
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
