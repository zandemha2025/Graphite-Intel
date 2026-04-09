import { useState, useMemo, useEffect, useCallback } from "react";
import { Code2, X } from "lucide-react";
import { CodeBlock } from "./code-block";

interface ExtractedBlock {
  language: string;
  code: string;
}

function extractCodeBlocks(content: string): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  // Match fenced code blocks with language tags, handling optional titles and \r\n
  const regex = /```(sql|python|javascript|js|py)[^\n\r]*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const lang = match[1].toLowerCase();
    const normalized = lang === "js" ? "javascript" : lang === "py" ? "python" : lang;
    const code = match[2].replace(/[\r\n]+$/, "");
    if (code.trim().length > 0) {
      blocks.push({ language: normalized, code });
    }
  }
  return blocks;
}

export function QueryInspector({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const blocks = useMemo(() => extractCodeBlocks(content), [content]);

  const handleClose = useCallback(() => setOpen(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (blocks.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 bg-transparent transition-all"
      >
        <Code2 className="h-3.5 w-3.5" />
        View queries ({blocks.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Side panel */}
          <div
            role="dialog"
            aria-label="Generated Queries"
            aria-modal="true"
            className="relative h-full w-full max-w-lg bg-[var(--surface)] border-l border-[var(--border)] shadow-xl overflow-y-auto"
            style={{
              animation: "queryInspectorSlideIn 200ms ease-out forwards",
            }}
          >
            {/* Inline keyframe definition */}
            <style>{`
              @keyframes queryInspectorSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[var(--accent)]" />
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Generated Queries
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold">
                  {blocks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                aria-label="Close queries panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Code blocks */}
            <div className="p-4 space-y-4">
              {blocks.map((block, i) => (
                <div key={i}>
                  <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1.5">
                    Query {i + 1} - {block.language.toUpperCase()}
                  </div>
                  <CodeBlock language={block.language} code={block.code} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
