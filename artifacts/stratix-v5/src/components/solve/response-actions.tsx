import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  FileBarChart,
  Target,
  Pin,
  FileDown,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResponseActionsProps {
  content: string;
  conversationId: number;
}

/* ---- Pin to Board sub-panel ---- */

function BoardSelector({
  content,
  onDone,
}: {
  content: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinning, setPinning] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/boards", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.boards ?? [];
        setBoards(list);
      })
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePin = async (boardId: number) => {
    setPinning(boardId);
    try {
      const res = await fetch(`/api/boards/${boardId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format: "markdown" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Pin failed");
      toast({ title: "Pinned to board" });
      onDone();
    } catch {
      toast({ title: "Failed to pin to board", variant: "destructive" });
    } finally {
      setPinning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <span className="text-[12px] text-[var(--text-muted)]">Loading boards...</span>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
        <p className="text-[12px] text-[var(--text-muted)]">No boards found. Create one in Boards first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
      <span className="text-[11px] text-[var(--text-muted)] leading-6 w-full mb-1">
        Select a board:
      </span>
      {boards.map((b) => (
        <button
          key={b.id}
          onClick={() => handlePin(b.id)}
          disabled={pinning === b.id}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all disabled:opacity-50"
        >
          {pinning === b.id ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
          {b.name}
        </button>
      ))}
    </div>
  );
}

/* ---- Schedule Recurring sub-panel ---- */

function SchedulePanel({
  content,
  onDone,
}: {
  content: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<"daily" | "weekly">("weekly");
  const [submitting, setSubmitting] = useState(false);

  const handleSchedule = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/scheduled-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: content, schedule }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Schedule failed");
      toast({ title: `Scheduled ${schedule} recurring query` });
      onDone();
    } catch {
      toast({ title: "Failed to schedule query", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
      <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {(["daily", "weekly"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSchedule(s)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all capitalize ${
              schedule === s
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <button
        onClick={handleSchedule}
        disabled={submitting}
        className="px-3 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Scheduling..." : "Schedule"}
      </button>
    </div>
  );
}

/* ---- Main ResponseActions component ---- */

export function ResponseActions({ content, conversationId }: ResponseActionsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportType, setReportType] = useState("competitive_analysis");
  const [reportLoading, setReportLoading] = useState(false);
  const [trackedNames, setTrackedNames] = useState<string[]>([]);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [savingNotebook, setSavingNotebook] = useState(false);
  const [trackingName, setTrackingName] = useState<string | null>(null);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const extractCompanyNames = useCallback(() => {
    const boldPattern = /\*\*([A-Z][A-Za-z0-9&. ]+?)\*\*/g;
    const names = new Set<string>();
    let match;
    while ((match = boldPattern.exec(content)) !== null) {
      const name = match[1].trim();
      if (
        name.length > 2 &&
        name.length < 40 &&
        !/^(Note|Key|Summary|Overview|Step|Action|Recommendation|Conclusion|Pro|Con)s?$/i.test(name)
      ) {
        names.add(name);
      }
    }
    return Array.from(names).slice(0, 8);
  }, [content]);

  const handleSaveToNotebook = async () => {
    setSavingNotebook(true);
    try {
      const firstLine =
        content
          .split("\n")
          .find((l) => l.trim())
          ?.replace(/^#+\s*/, "")
          .slice(0, 80) || "Solve Response";
      const nbRes = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: firstLine }),
        credentials: "include",
      });
      if (!nbRes.ok) throw new Error("Failed to create notebook");
      const nb = await nbRes.json();

      await fetch(`/api/notebooks/${nb.id}/cells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content, title: firstLine, cellIndex: 0 }),
        credentials: "include",
      });

      toast({
        title: "Saved to notebook",
        description: firstLine,
        action: (
          <button
            onClick={() => setLocation(`/build/notebooks/${nb.id}`)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            Open <ExternalLink className="h-3 w-3" />
          </button>
        ),
      });
    } catch {
      toast({ title: "Failed to save to notebook", variant: "destructive" });
    } finally {
      setSavingNotebook(false);
    }
  };

  const handleSubmitReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          context: content.slice(0, 2000),
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Report generation failed");
      toast({
        title: "Report generation started",
        description: `Type: ${reportType.replace(/_/g, " ")}`,
        action: (
          <button
            onClick={() => setLocation("/intelligence?tab=reports")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            View <ExternalLink className="h-3 w-3" />
          </button>
        ),
      });
      setShowReportForm(false);
    } catch {
      toast({ title: "Failed to generate report", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const handleTrackCompetitor = async (name: string) => {
    setTrackingName(name);
    try {
      await fetch("/api/intelligence/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      setTrackedNames((prev) => [...prev, name]);
      toast({
        title: `Now tracking ${name}`,
        action: (
          <button
            onClick={() => setLocation("/intelligence?tab=radar")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            View <ExternalLink className="h-3 w-3" />
          </button>
        ),
      });
    } catch {
      toast({ title: `Failed to track ${name}`, variant: "destructive" });
    } finally {
      setTrackingName(null);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const title =
        content
          .split("\n")
          .find((l) => l.trim())
          ?.replace(/^#+\s*/, "")
          .slice(0, 80) || "Stratix Export";
      const res = await fetch("/api/exports/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "Failed to export PDF", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  const competitors = extractCompanyNames();
  const actionBtnClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] border border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 bg-transparent transition-all disabled:opacity-50";

  return (
    <div className="mt-3 space-y-2">
      {/* Button row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSaveToNotebook}
          disabled={savingNotebook}
          className={actionBtnClass}
        >
          {savingNotebook ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          ) : (
            <BookOpen className="h-3.5 w-3.5" />
          )}
          {savingNotebook ? "Saving..." : "Save to Notebook"}
        </button>

        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className={actionBtnClass}
        >
          <FileBarChart className="h-3.5 w-3.5" />
          Generate Report
        </button>

        {competitors.length > 0 && (
          <button
            onClick={() => setShowCompetitors(!showCompetitors)}
            className={actionBtnClass}
          >
            <Target className="h-3.5 w-3.5" />
            Track Competitors
          </button>
        )}

        <button
          onClick={() => setShowBoardSelector(!showBoardSelector)}
          className={actionBtnClass}
        >
          <Pin className="h-3.5 w-3.5" />
          Pin to Board
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className={actionBtnClass}
        >
          {exportingPdf ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          {exportingPdf ? "Exporting..." : "Export PDF"}
        </button>

        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className={actionBtnClass}
        >
          <Clock className="h-3.5 w-3.5" />
          Schedule Recurring
        </button>
      </div>

      {/* Report form (inline) */}
      {showReportForm && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="flex-1 text-[12px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="competitive_analysis">Competitive Analysis</option>
            <option value="market_intelligence">Market Intelligence</option>
            <option value="growth_strategy">Growth Strategy</option>
          </select>
          <button
            onClick={handleSubmitReport}
            disabled={reportLoading}
            className="px-3 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {reportLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      )}

      {/* Competitor pills */}
      {showCompetitors && competitors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)]">
          <span className="text-[11px] text-[var(--text-muted)] leading-6 w-full mb-1">
            Click to track:
          </span>
          {competitors.map((name) => {
            const isTracked = trackedNames.includes(name);
            return (
              <button
                key={name}
                onClick={() => !isTracked && handleTrackCompetitor(name)}
                disabled={isTracked || trackingName === name}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  isTracked
                    ? "bg-[var(--accent)]/10 border-[var(--accent)]/25 text-[var(--accent)]"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] cursor-pointer"
                } ${trackingName === name ? "opacity-50" : ""}`}
              >
                {trackingName === name ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--accent)]" />
                ) : (
                  <Target className="h-3 w-3" />
                )}
                {name}
                {isTracked && <span className="text-[10px]">tracking</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Board selector panel */}
      {showBoardSelector && (
        <BoardSelector
          content={content}
          onDone={() => setShowBoardSelector(false)}
        />
      )}

      {/* Schedule panel */}
      {showSchedule && (
        <SchedulePanel
          content={content}
          onDone={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}
