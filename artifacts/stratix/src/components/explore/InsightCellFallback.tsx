import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  RefreshCw,
  User,
} from "lucide-react";
import { CellCard } from "./CellCard";
import type { CellData } from "@/components/charts";

type SourceChunk = {
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
};

type Props = {
  question: string;
  answerContent: string;
  answerCells: CellData[];
  sources?: SourceChunk[] | null;
  isStreaming?: boolean;
  index: number;
};

function SourcesCollapsible({ sources }: { sources: SourceChunk[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: "1px solid var(--explore-border, #E5E7EB)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: "var(--explore-surface, #F9FAFB)" }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3 h-3" style={{ color: "var(--explore-muted, #9CA3AF)" }} />
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--explore-muted, #9CA3AF)" }}
          >
            Sources ({sources.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3" style={{ color: "var(--explore-muted, #9CA3AF)" }} />
        ) : (
          <ChevronDown className="w-3 h-3" style={{ color: "var(--explore-muted, #9CA3AF)" }} />
        )}
      </button>
      {expanded && (
        <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
          {sources.map((s, i) => (
            <div
              key={i}
              className="px-3 py-2.5"
              style={{ background: "var(--explore-card-bg, #FFFFFF)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] font-medium truncate pr-2"
                  style={{ color: "var(--explore-text, #1F2937)" }}
                >
                  {s.documentTitle}
                </span>
                <span
                  className="text-[9px] shrink-0"
                  style={{ color: "var(--explore-muted, #9CA3AF)" }}
                >
                  {Math.round(s.similarity * 100)}% match
                </span>
              </div>
              <p
                className="text-[11px] line-clamp-2"
                style={{ color: "var(--explore-text-secondary, #6B7280)" }}
              >
                {s.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InsightCellFallback({
  question,
  answerContent,
  answerCells,
  sources,
  isStreaming,
  index,
}: Props) {
  const hasCells = answerCells.length > 0;
  const hasMarkdownOnly =
    answerCells.length > 0 && answerCells.every((c) => c.type === "markdown");

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--explore-card-bg, #FFFFFF)",
        border: "1px solid var(--explore-border, #E5E7EB)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Question header */}
      <div
        className="flex items-start gap-3 px-5 py-4"
        style={{
          borderBottom: "1px solid var(--explore-border-light, #F3F4F6)",
          background: "var(--explore-surface, #F9FAFB)",
        }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "var(--explore-accent-light, #EEF2FF)" }}
        >
          <User className="w-3 h-3" style={{ color: "var(--explore-accent, #4F46E5)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "var(--explore-muted, #9CA3AF)" }}
          >
            Question {index + 1}
          </span>
          <p
            className="text-sm font-medium mt-0.5"
            style={{ color: "var(--explore-heading, #111827)" }}
          >
            {question}
          </p>
        </div>
      </div>

      {/* Answer body */}
      <div className="px-5 py-4">
        {isStreaming && !answerContent ? (
          <div className="flex items-center gap-3 py-2">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "#A5B4FC",
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--explore-muted, #9CA3AF)" }}
            >
              Analyzing your data...
            </span>
          </div>
        ) : hasCells && !hasMarkdownOnly ? (
          /* Render structured cells (charts, tables, stats) */
          <div className="space-y-3">
            {answerCells.map((cell) => (
              <CellCard key={cell.id} cell={cell} />
            ))}
          </div>
        ) : (
          /* Render markdown content */
          <div
            className="prose prose-sm max-w-none"
            style={{
              "--tw-prose-body": "var(--explore-text, #1F2937)",
              "--tw-prose-headings": "var(--explore-heading, #111827)",
              "--tw-prose-links": "var(--explore-accent, #4F46E5)",
              "--tw-prose-bold": "var(--explore-heading, #111827)",
              "--tw-prose-code": "var(--explore-heading, #111827)",
              "--tw-prose-pre-bg": "var(--explore-surface, #F3F4F6)",
            } as React.CSSProperties}
          >
            <ReactMarkdown>{answerContent}</ReactMarkdown>
          </div>
        )}

        {/* Sources */}
        {sources && sources.length > 0 && (
          <div className="mt-4">
            <SourcesCollapsible sources={sources} />
          </div>
        )}
      </div>

      {/* Action bar */}
      {!isStreaming && answerContent && (
        <div
          className="flex items-center gap-1 px-5 py-2.5"
          style={{
            borderTop: "1px solid var(--explore-border-light, #F3F4F6)",
            background: "var(--explore-surface, #F9FAFB)",
          }}
        >
          {[
            { icon: Bookmark, label: "Save to Board" },
            { icon: Share2, label: "Share" },
            { icon: RefreshCw, label: "Refresh" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-gray-100"
              style={{ color: "var(--explore-muted, #9CA3AF)" }}
              title={label}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
