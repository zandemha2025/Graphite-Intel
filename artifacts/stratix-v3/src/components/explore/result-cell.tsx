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
  Mail,
  Presentation,
  ClipboardList,
  TableProperties,
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

export type SourceType = "1p" | "3p" | "synthesized";

export interface SourceWithType {
  name: string;
  type: SourceType;
  url?: string;
}

export interface ResultCellData {
  id: string;
  type: CellType;
  title: string;
  content: string;
  sources?: string[];
  sourceDetails?: SourceWithType[];
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
    <div className="overflow-x-auto rounded-lg border border-[#27272A]">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-[#18181B]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-[#27272A] px-3 py-2 font-semibold text-[#FAFAFA]"
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
                "border-b border-[#27272A] last:border-b-0",
                ri % 2 === 1 ? "bg-[#18181B]/50" : "bg-[#18181B]",
              )}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[#A1A1AA]">
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
        <div className="my-2 rounded-r-lg border-l-4 border-[#6366F1] bg-[#6366F1]/10 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6366F1]">
            {label.trim()}
          </span>
          <div className="mt-1 text-sm font-medium leading-relaxed text-[#FAFAFA]">
            <ReactMarkdown>{after}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-r-lg border-l-4 border-[#6366F1] bg-[#6366F1]/10 px-4 py-3">
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
              className="not-prose mx-0.5 inline-block text-lg font-bold text-[#FAFAFA]"
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
            className="rounded-lg border border-[#27272A] bg-[#18181B] p-3"
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
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

/* ---------- Source type classification ---------- */

function classifySource(name: string, url?: string): SourceType {
  const lower = name.toLowerCase();
  // First-party sources
  if (
    lower.includes("salesforce") ||
    lower.includes("hubspot") ||
    lower.includes("gong") ||
    lower.includes("your ") ||
    lower.includes("google drive") ||
    lower.includes("company") ||
    lower.includes("crm") ||
    lower.includes("internal")
  ) {
    return "1p";
  }
  // Third-party sources
  if (
    lower.includes("perplexity") ||
    lower.includes("serpapi") ||
    lower.includes("firecrawl") ||
    lower.includes("web") ||
    (url && url.startsWith("http"))
  ) {
    return "3p";
  }
  // AI synthesis
  return "synthesized";
}

function SourceTypeBadge({ source }: { source: SourceWithType }) {
  switch (source.type) {
    case "1p":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#6366F1]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6366F1]">
          {source.name}
        </span>
      );
    case "3p":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#27272A] px-2 py-0.5 text-[10px] font-semibold text-[#A1A1AA]">
          {source.name}
        </span>
      );
    case "synthesized":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#27272A] bg-[#18181B] px-2 py-0.5 text-[10px] font-semibold text-[#71717A]">
          {source.name}
        </span>
      );
  }
}

function SourcesFooter({ sources, sourceDetails }: { sources?: string[]; sourceDetails?: SourceWithType[] }) {
  const typedSources: SourceWithType[] = sourceDetails ??
    (sources ?? []).map((s) => ({
      name: s,
      type: classifySource(s),
    }));

  if (typedSources.length === 0) return null;

  const has1p = typedSources.some((s) => s.type === "1p");
  const has3p = typedSources.some((s) => s.type === "3p");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
        Sources:
      </span>
      {typedSources.map((source, i) => (
        <SourceTypeBadge key={`${source.name}-${i}`} source={source} />
      ))}
      {(has1p || has3p) && (
        <>
          <span className="text-[10px] text-[#3F3F46]">&rarr;</span>
          <SourceTypeBadge
            source={{ name: "Synthesized", type: "synthesized" }}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Export As dropdown (Feature 5) ---------- */

function ExportAsDropdown({ content, title }: { content: string; title: string }) {
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
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function exportAsEmail() {
    const email = `Hi team,\n\n${content.replace(/^#+\s/gm, "").replace(/\*\*/g, "").slice(0, 1500)}\n\nBest regards`;
    navigator.clipboard.writeText(email);
    toast.success("Email draft copied to clipboard");
    setOpen(false);
  }

  function exportAsSlide() {
    const lines = content.split("\n").filter((l) => l.trim());
    const bullets: string[] = [];
    for (const line of lines) {
      const cleaned = line.replace(/^[#*\-\s]+/, "").replace(/\*\*/g, "").trim();
      if (cleaned.length > 10 && bullets.length < 5) {
        bullets.push("- " + cleaned);
      }
    }
    const slide = `${title}\n\n${bullets.join("\n")}`;
    navigator.clipboard.writeText(slide);
    toast.success("Slide summary copied to clipboard");
    setOpen(false);
  }

  function exportAsBrief() {
    const sections = content.split(/\n(?=##?\s)/).filter((s) => s.trim());
    const findings = sections
      .map((s) => s.replace(/^#+\s+/, "").trim())
      .slice(0, 4);
    const brief = `EXECUTIVE BRIEF: ${title}\n${"=".repeat(40)}\n\nKEY FINDINGS:\n${findings.map((f, i) => `${i + 1}. ${f.split("\n")[0]}`).join("\n")}\n\nDETAIL:\n${content.slice(0, 2000)}\n\nRECOMMENDATION:\nReview the findings above and discuss next steps with the leadership team.`;
    navigator.clipboard.writeText(brief);
    toast.success("Executive brief copied to clipboard");
    setOpen(false);
  }

  function exportAsCSV() {
    // Extract tables from markdown
    const tableMatch = content.match(/(\|[^\n]+\|[\s\S]*?\n)(?=\n[^|]|\n?$)/);
    if (!tableMatch) {
      toast.error("No table data found in this cell");
      setOpen(false);
      return;
    }
    const rows = tableMatch[0]
      .trim()
      .split("\n")
      .filter((r) => !r.match(/^\|[\s\-:]+\|$/));
    const csv = rows
      .map((row) =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => `"${c.replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    navigator.clipboard.writeText(csv);
    toast.success("Table data copied as CSV");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
      >
        <ClipboardList className="h-3.5 w-3.5" />
        Export As
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-lg border border-[#27272A] bg-[#18181B] py-1 shadow-lg">
          <button
            onClick={exportAsEmail}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <Mail className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Email Draft
          </button>
          <button
            onClick={exportAsSlide}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <Presentation className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Slide Summary
          </button>
          <button
            onClick={exportAsBrief}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <FileText className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Executive Brief
          </button>
          <div className="mx-2 my-1 border-t border-[#27272A]" />
          <button
            onClick={exportAsCSV}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <TableProperties className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Data Table (CSV)
          </button>
        </div>
      )}
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
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
      >
        <Bookmark className="h-3.5 w-3.5" />
        Save
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-lg border border-[#27272A] bg-[#18181B] py-1 shadow-lg">
          <button
            onClick={() => {
              onSaveBoard?.();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <Bookmark className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Save to Board
          </button>
          <button
            onClick={() => {
              onSaveNotebook();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#A1A1AA]" />
            Save to Notebook
          </button>
          <div className="mx-2 my-1 border-t border-[#27272A]" />
          <button
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#A1A1AA] hover:bg-[#18181B]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#A1A1AA]" />
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
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#27272A] bg-[#18181B] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
          <p className="text-sm font-semibold text-[#FAFAFA]">Save to Board</p>
          <button onClick={onClose} className="rounded p-1 text-[#A1A1AA] hover:bg-[#27272A]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
            </div>
          ) : boards.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#A1A1AA]">
              No boards found. Create a board first.
            </div>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSave(board)}
                disabled={saving !== null}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#A1A1AA] transition-colors hover:bg-[#18181B] disabled:opacity-50"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <span className="flex-1 truncate">{board.title}</span>
                {saving === board.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366F1]" />}
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
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#27272A] bg-[#18181B] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
          <p className="text-sm font-semibold text-[#FAFAFA]">Save to Notebook</p>
          <button onClick={onClose} className="rounded p-1 text-[#A1A1AA] hover:bg-[#27272A]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[#71717A]" />
            </div>
          ) : notebooks.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#A1A1AA]">
              No notebooks found. Create a notebook first.
            </div>
          ) : (
            notebooks.map((nb) => (
              <button
                key={nb.id}
                onClick={() => handleSave(nb)}
                disabled={saving !== null}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#A1A1AA] transition-colors hover:bg-[#18181B] disabled:opacity-50"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <span className="flex-1 truncate">{nb.title}</span>
                {saving === nb.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366F1]" />}
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
        "rounded-lg border border-[#27272A] bg-[#18181B] p-5 transition-colors hover:border-[#3F3F46]",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#27272A]">
            <Icon className="h-3.5 w-3.5 text-[#A1A1AA]" />
          </span>
          <h4 className="text-sm font-semibold text-[#FAFAFA]">
            {cell.title}
          </h4>
        </div>
        {cell.sources && cell.sources.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#71717A]">
            {cell.sources.slice(0, 3).map((s, i) => (
              <span key={`${s}-${i}`} className="bg-[#27272A] px-1.5 py-0.5 rounded">[{i + 1}]</span>
            ))}
          </div>
        )}
      </div>

      {/* Rich content rendering */}
      <div className="prose-narrative text-[15px] leading-7">
        <RichContent content={cell.content} cellType={cell.type} />
      </div>

      {/* Sources footer with 1P/3P/Synthesized labels */}
      <SourcesFooter sources={cell.sources} sourceDetails={cell.sourceDetails} />

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-[#27272A] pt-3">
        <SaveDropdown
          onSaveBoard={handleSaveBoard}
          onSaveNotebook={handleSaveNotebook}
          onCopy={handleCopy}
          copied={copied}
        />
        <ExportAsDropdown content={cell.content} title={cell.title} />
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
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
