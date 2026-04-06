import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Lightbulb,
  Table,
  FileText,
  Bookmark,
  Copy,
  Share2,
  BarChart3,
  Check,
  ChevronDown,
  BookOpen,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { api, apiPost } from "@/lib/api";

export type CellType =
  | "key-finding"
  | "table"
  | "analysis"
  | "chart"
  | "comparison";

export interface ResultCellData {
  id: string;
  type: CellType;
  title: string;
  content: string;
  sources?: string[];
}

const cellIcons: Record<CellType, typeof Lightbulb> = {
  "key-finding": Lightbulb,
  table: Table,
  analysis: FileText,
  chart: BarChart3,
  comparison: Table,
};

const cellLabels: Record<CellType, string> = {
  "key-finding": "Key Finding",
  table: "Table",
  analysis: "Analysis",
  chart: "Chart",
  comparison: "Comparison",
};

/* ---------- Content type detection & rendering ---------- */

function detectContentType(
  content: string | undefined,
): "table" | "key-finding" | "stat" | "comparison" | "default" {
  if (!content) return "default";
  if (content.includes("|") && content.includes("---")) return "table";
  if (/key\s*(finding|takeaway)\s*:/i.test(content)) return "key-finding";
  if (/\$[\d,.]+[BMK]|\d{1,3}(\.\d+)?%/i.test(content)) return "stat";
  if (/\bvs\.?\b|\bcompared to\b/i.test(content)) return "comparison";
  return "default";
}

/** Render markdown tables as styled HTML tables */
function renderMarkdownTable(tableStr: string) {
  const lines = tableStr
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

  const headers = parseRow(lines[0] ?? "");
  // Skip separator line (lines[1])
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-[#F9FAFB]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-[#E5E7EB] px-3 py-2 font-semibold text-[#111827]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={cn(
                "border-b border-[#E5E7EB] last:border-b-0",
                ri % 2 === 1 ? "bg-[#F9FAFB]/50" : "bg-white",
              )}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[#374151]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Highlight key findings with an indigo left border */
function renderKeyFinding(content: string) {
  // Split into the "Key Finding:" label and the rest
  const match = content.match(
    /^(.*?)(key\s*(?:finding|takeaway)\s*:\s*)(.*)/is,
  );
  if (match) {
    const [, before = "", label = "", after = ""] = match;
    return (
      <div>
        {before && (
          <div className="prose-narrative max-w-none">
            <ReactMarkdown>{before}</ReactMarkdown>
          </div>
        )}
        <div className="my-2 rounded-r-lg border-l-4 border-[#4F46E5] bg-[#EEF2FF] px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#4F46E5]">
            {label.trim()}
          </span>
          <div className="mt-1 text-sm font-medium leading-relaxed text-[#111827]">
            <ReactMarkdown>{after}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-r-lg border-l-4 border-[#4F46E5] bg-[#EEF2FF] px-4 py-3">
      <div className="prose-narrative max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

/** Highlight big numbers / stats */
function renderStatContent(content: string) {
  // Find and highlight dollar amounts and percentages
  const parts = content.split(
    /(\$[\d,.]+\s*[BMKTbmkt](?:illion|illion)?|\d{1,3}(?:\.\d+)?%)/g,
  );

  return (
    <div className="prose-narrative max-w-none">
      {parts.map((part, i) => {
        if (/^\$[\d,.]+|^\d{1,3}(\.\d+)?%/.test(part)) {
          return (
            <span
              key={i}
              className="not-prose mx-0.5 inline-block text-lg font-bold text-[#111827]"
            >
              {part}
            </span>
          );
        }
        return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
      })}
    </div>
  );
}

/** Render comparison in side-by-side layout */
function renderComparison(content: string) {
  // Try to split by "vs" or "compared to"
  const splitMatch = content.split(/\bvs\.?\b|\bcompared to\b/i);
  if (splitMatch.length >= 2) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {splitMatch.slice(0, 2).map((side, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3"
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              {idx === 0 ? "Side A" : "Side B"}
            </div>
            <div className="prose-narrative max-w-none">
              <ReactMarkdown>{side.trim()}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="prose-narrative max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

/** Main rich content renderer */
function RichContent({ content, cellType }: { content: string; cellType: CellType }) {
  const detected = detectContentType(content);

  // For table type cells or detected tables, render as HTML table
  if (cellType === "table" || detected === "table") {
    // Extract table portion and surrounding text
    const lines = content.split("\n");
    const tableStart = lines.findIndex(
      (l) => l.includes("|") && l.trim().startsWith("|"),
    );
    const tableEnd =
      lines.length -
      1 -
      [...lines]
        .reverse()
        .findIndex((l) => l.includes("|") && l.trim().startsWith("|"));

    if (tableStart >= 0 && tableEnd >= tableStart) {
      const before = lines.slice(0, tableStart).join("\n").trim();
      const tableContent = lines.slice(tableStart, tableEnd + 1).join("\n");
      const after = lines.slice(tableEnd + 1).join("\n").trim();

      return (
        <div>
          {before && (
            <div className="prose-narrative mb-3 max-w-none">
              <ReactMarkdown>{before}</ReactMarkdown>
            </div>
          )}
          {renderMarkdownTable(tableContent)}
          {after && (
            <div className="prose-narrative mt-3 max-w-none">
              <ReactMarkdown>{after}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
  }

  // Key findings with indigo left border
  if (cellType === "key-finding" || detected === "key-finding") {
    return renderKeyFinding(content);
  }

  // Stats with large bold numbers
  if (detected === "stat") {
    return renderStatContent(content);
  }

  // Comparison side-by-side
  if (cellType === "comparison" || detected === "comparison") {
    return renderComparison(content);
  }

  // Default markdown rendering
  return (
    <div className="prose-narrative max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

/* ---------- Save dropdown ---------- */

function SaveDropdown({
  onSaveBoard,
  onSaveNotebook,
  onCopy,
  copied,
}: {
  onSaveBoard?: () => void;
  onSaveNotebook: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Save
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              onSaveBoard?.();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#374151] hover:bg-[#F9FAFB]"
          >
            <Bookmark className="h-3.5 w-3.5 text-[#6B7280]" />
            Save to Board
          </button>
          <button
            onClick={() => {
              onSaveNotebook();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#374151] hover:bg-[#F9FAFB]"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#6B7280]" />
            Save to Notebook
          </button>
          <div className="mx-2 my-1 border-t border-[#E5E7EB]" />
          <button
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#374151] hover:bg-[#F9FAFB]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#6B7280]" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Save to Board Dialog ---------- */

interface BoardListItem {
  id: string;
  title: string;
}

function SaveToBoardDialog({
  open,
  onClose,
  cellContent,
  cellTitle,
}: {
  open: boolean;
  onClose: () => void;
  cellContent: string;
  cellTitle: string;
}) {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ boards: BoardListItem[] }>("/boards")
      .then((r) => setBoards(r.boards ?? []))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSave(board: BoardListItem) {
    setSaving(board.id);
    try {
      await apiPost(`/boards/${board.id}/cards`, {
        title: cellTitle,
        type: "insight",
        content: cellContent,
      });
      toast.success(`Saved to ${board.title}`);
      onClose();
    } catch {
      toast.error("Failed to save to board");
    } finally {
      setSaving(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-sm font-semibold text-[#111827]">Save to Board</p>
          <button onClick={onClose} className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
            </div>
          ) : boards.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              No boards found. Create a board first.
            </div>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSave(board)}
                disabled={saving !== null}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="flex-1 truncate">{board.title}</span>
                {saving === board.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F46E5]" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Save to Notebook Dialog ---------- */

interface NotebookListItem {
  id: string;
  title: string;
}

function SaveToNotebookDialog({
  open,
  onClose,
  cellContent,
  cellTitle,
}: {
  open: boolean;
  onClose: () => void;
  cellContent: string;
  cellTitle: string;
}) {
  const [notebooks, setNotebooks] = useState<NotebookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api<{ notebooks: NotebookListItem[] }>("/notebooks")
      .then((r) => setNotebooks(r.notebooks ?? []))
      .catch(() => setNotebooks([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSave(notebook: NotebookListItem) {
    setSaving(notebook.id);
    try {
      await apiPost(`/notebooks/${notebook.id}/cells`, {
        type: "markdown",
        content: `## ${cellTitle}\n\n${cellContent}`,
      });
      toast.success(`Saved to ${notebook.title}`);
      onClose();
    } catch {
      toast.error("Failed to save to notebook");
    } finally {
      setSaving(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-sm font-semibold text-[#111827]">Save to Notebook</p>
          <button onClick={onClose} className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
            </div>
          ) : notebooks.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              No notebooks found. Create a notebook first.
            </div>
          ) : (
            notebooks.map((nb) => (
              <button
                key={nb.id}
                onClick={() => handleSave(nb)}
                disabled={saving !== null}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="flex-1 truncate">{nb.title}</span>
                {saving === nb.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4F46E5]" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main cell component ---------- */

interface ResultCellProps {
  cell: ResultCellData;
  onSave?: () => void;
  className?: string;
}

export function ResultCell({ cell, onSave, className }: ResultCellProps) {
  const Icon = cellIcons[cell.type];
  const [copied, setCopied] = useState(false);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(cell.content).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSaveBoard() {
    setBoardDialogOpen(true);
  }

  function handleSaveNotebook() {
    setNotebookDialogOpen(true);
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success("Link copied to clipboard");
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[#E5E7EB] bg-white p-4 transition-colors hover:bg-[#FAFAFA]",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[#4F46E5]" />
          <Badge variant="indigo">{cellLabels[cell.type]}</Badge>
        </div>
      </div>

      {/* Title */}
      <h4 className="mb-2 text-sm font-semibold text-[#111827]">
        {cell.title}
      </h4>

      {/* Rich content rendering */}
      <RichContent content={cell.content} cellType={cell.type} />

      {/* Sources */}
      {cell.sources && cell.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cell.sources.map((source) => (
            <Badge key={source} variant="indigo">
              {source}
            </Badge>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1 border-t border-[#E5E7EB] pt-3">
        <SaveDropdown
          onSaveBoard={handleSaveBoard}
          onSaveNotebook={handleSaveNotebook}
          onCopy={handleCopy}
          copied={copied}
        />
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      {/* Dialogs */}
      <SaveToBoardDialog
        open={boardDialogOpen}
        onClose={() => setBoardDialogOpen(false)}
        cellContent={cell.content}
        cellTitle={cell.title}
      />
      <SaveToNotebookDialog
        open={notebookDialogOpen}
        onClose={() => setNotebookDialogOpen(false)}
        cellContent={cell.content}
        cellTitle={cell.title}
      />
    </div>
  );
}
