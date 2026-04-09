import { useState, useCallback, type ReactNode } from "react";
import { Code2, Copy, Check, ChevronDown, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── SQL keyword highlighting ── */

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "JOIN",
  "LEFT", "RIGHT", "INNER", "OUTER", "ON", "AS", "AND", "OR", "NOT",
  "IN", "IS", "NULL", "LIKE", "BETWEEN", "EXISTS", "CASE", "WHEN",
  "THEN", "ELSE", "END", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "DISTINCT",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "LIMIT", "OFFSET", "UNION",
  "ALL", "WITH", "RECURSIVE", "OVER", "PARTITION", "ROW_NUMBER", "RANK",
]);

const PY_KEYWORDS = new Set([
  "def", "class", "import", "from", "return", "if", "elif", "else",
  "for", "while", "in", "not", "and", "or", "is", "None", "True",
  "False", "try", "except", "finally", "raise", "with", "as", "yield",
  "lambda", "pass", "break", "continue", "async", "await", "print",
]);

function highlightLine(line: string, language: string): ReactNode[] {
  const keywords = language === "sql" ? SQL_KEYWORDS : language === "python" ? PY_KEYWORDS : null;
  if (!keywords) {
    return [<span key="0">{line}</span>];
  }

  // Tokenize by word boundaries, preserving whitespace and punctuation
  const tokens = line.split(/(\b\w+\b)/g);
  return tokens.map((token, i) => {
    const upper = token.toUpperCase();
    const check = language === "python" ? token : upper;
    if (keywords.has(check)) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>
          {token}
        </span>
      );
    }
    // Highlight strings
    if (/^(['"]).*\1$/.test(token)) {
      return (
        <span key={i} style={{ color: "#3C8B4E" }}>
          {token}
        </span>
      );
    }
    // Highlight numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      return (
        <span key={i} style={{ color: "#8B7A3C" }}>
          {token}
        </span>
      );
    }
    return <span key={i}>{token}</span>;
  });
}

/* ── CodeBlock Component ── */

export function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingNotebook, setSavingNotebook] = useState(false);
  const { toast } = useToast();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for non-HTTPS or denied clipboard access
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({ title: "Failed to copy code", variant: "destructive" });
      }
    });
  }, [code, toast]);

  const handleSaveToNotebook = useCallback(async () => {
    setSavingNotebook(true);
    try {
      const title = `${language.toUpperCase()} snippet - ${code.split("\n")[0]?.slice(0, 60) || "Code"}`;
      const nbRes = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      if (!nbRes.ok) throw new Error("Failed to create notebook");
      const nb = await nbRes.json();

      await fetch(`/api/notebooks/${nb.id}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "code", content: code, language, order: 0 }),
        credentials: "include",
      });

      toast({ title: "Saved to notebook", description: title.slice(0, 60), action: (
          <a href={`/build/notebooks/${nb.id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">Open</a>
        ) });
    } catch {
      toast({ title: "Failed to save to notebook", variant: "destructive" });
    } finally {
      setSavingNotebook(false);
    }
  }, [code, language, toast]);

  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className="my-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2">
          <Code2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSaveToNotebook}
            disabled={savingNotebook}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors disabled:opacity-50"
            title="Save to Notebook"
          >
            {savingNotebook ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
            ) : (
              <BookOpen className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Notebook</span>
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3 text-[#3C8B4E]" /> : <Copy className="h-3 w-3" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center px-1.5 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Code body */}
      {!collapsed && (
        <div className="overflow-x-auto p-3">
          <pre className="text-[13px] leading-relaxed font-mono">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-[var(--text-muted)] opacity-40 w-8 text-right pr-3 shrink-0">
                  {i + 1}
                </span>
                <code>{highlightLine(line, language.toLowerCase())}</code>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
