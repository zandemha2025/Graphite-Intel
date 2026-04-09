import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
  useGetCurrentAuthUser,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useDefinitions } from "@/hooks/use-definitions";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, Plus, Trash2, ArrowUp, Sparkles, Download, Copy, Share2,
  Info, ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { CodeBlock } from "@/components/solve/code-block";
import { ConfidenceBadge } from "@/components/solve/confidence-badge";
import { SourcePanel } from "@/components/solve/source-panel";
import { QueryInspector } from "@/components/solve/query-inspector";
import { ShareModal } from "@/components/solve/share-modal";
import { AnalysisModes, getPlaceholderForMode, type AnalysisMode } from "@/components/solve/analysis-modes";
import { ResponseActions } from "@/components/solve/response-actions";

/* ── Safe Markdown — catches rendering errors ── */

function SafeMarkdown({ children }: { children: string }) {
  if (!children || typeof children !== "string") {
    return <p className="text-body-sm text-[var(--text-muted)]">No content</p>;
  }
  return (
    <ErrorBoundary fallback={<pre className="whitespace-pre-wrap text-body-sm text-[var(--text-secondary)]">{children}</pre>}>
      <ReactMarkdown components={{
        code: ({ className, children: codeChildren, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            return <CodeBlock language={match[1]} code={String(codeChildren).replace(/\n$/, "")} />;
          }
          return <code className={className} {...props}>{codeChildren}</code>;
        }
      }}>{children}</ReactMarkdown>
    </ErrorBoundary>
  );
}

/* ── Types ── */

type SourceChunk = {
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  snippet: string;
  similarity: number;
};

type Message = {
  id: number | string;
  role: string;
  content: string;
  sources?: SourceChunk[] | null;
  confidence?: number;
  dataSources?: string[];
};

type ResearchDepth = "quick" | "standard" | "deep";

/* ── Session Dropdown ── */

function SessionDropdown({
  sessions,
  activeId,
  activeTitle,
  onSelect,
  onCreate,
  onDelete,
  isCreating,
}: {
  sessions: Array<{ id: number; title: string; createdAt: string }>;
  activeId: number | null;
  activeTitle: string;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-[8px] text-heading-sm text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
      >
        {activeTitle}
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => { onCreate(); setOpen(false); }}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-body-sm font-medium text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors border-b border-[var(--border)]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Session
          </button>
          <div className="max-h-64 overflow-y-auto py-1">
            {!Array.isArray(sessions) || sessions.length === 0 ? (
              <p className="px-3 py-4 text-center text-caption text-[var(--text-muted)]">No sessions yet</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { onSelect(s.id); setOpen(false); }}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    activeId === s.id ? "bg-[var(--accent-muted)]" : "hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <span className="text-body-sm text-[var(--text-primary)] truncate flex-1">{s.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                    className="p-0.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--error)] transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Empty State ── */

function SolveEmpty({ onCreate, isCreating, userName }: { onCreate: (msg?: string) => void; isCreating: boolean; userName?: string }) {
  const suggestions = [
    { emoji: "🔍", text: "Analyze my competitive landscape" },
    { emoji: "📊", text: "Build a market entry strategy" },
    { emoji: "📋", text: "Generate a quarterly strategy brief" },
    { emoji: "💰", text: "Research pricing models in my industry" },
  ];

  const quickActions: string[] = [];

  const firstName = userName?.split(" ")[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[600px] text-center">
        <Sparkles className="h-8 w-8 text-[var(--accent)] mx-auto mb-4" />
        {firstName && (
          <p className="text-body-lg text-[var(--text-muted)] mb-1">Hi, {firstName}!</p>
        )}
        <h1 className="font-editorial text-[32px] font-medium text-[var(--text-primary)] leading-tight">
          What can I help you with?
        </h1>
        <p className="mt-3 text-body-lg text-[var(--text-secondary)]">
          Describe your business question. I'll produce strategy-grade analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onCreate(s.text)}
              disabled={isCreating}
              className="flex items-start gap-3 text-left p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              <span className="text-lg">{isCreating ? "" : s.emoji}</span>
              {isCreating ? (
                <span className="text-body-sm text-[var(--text-muted)] leading-relaxed flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                  Starting session...
                </span>
              ) : (
                <span className="text-body-sm text-[var(--text-secondary)] leading-relaxed">{s.text}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border)]">
          <p className="text-caption text-[var(--text-muted)] mb-4">Quick actions</p>
          <div className="flex flex-wrap justify-center gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                className="text-caption text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[12px] text-[var(--text-muted)] leading-relaxed">
          Connect data sources in Settings for more personalized results.
        </p>
      </div>
    </div>
  );
}

/* ── Research Depth Toggle ── */

function DepthToggle({
  depth,
  onChange,
}: {
  depth: ResearchDepth;
  onChange: (d: ResearchDepth) => void;
}) {
  const options: { value: ResearchDepth; label: string }[] = [
    { value: "quick", label: "Quick" },
    { value: "standard", label: "Standard" },
    { value: "deep", label: "Deep" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
            depth === o.value
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Data Source Badges ── */

function DataSourceBadges({ dataSources }: { dataSources: string[] }) {
  if (!Array.isArray(dataSources) || dataSources.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-[11px] text-[var(--text-muted)] leading-6">Data sources:</span>
      {dataSources.map((source, i) => (
        <span
          key={`${source}-${i}`}
          className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]"
        >
          {source}
        </span>
      ))}
    </div>
  );
}

/* ── Context Indicator ── */

function ContextIndicator({
  sources,
  hasProfile,
  researchDepth,
}: {
  sources?: SourceChunk[] | null;
  hasProfile: boolean;
  researchDepth: ResearchDepth;
}) {
  const badges: { label: string; color: string }[] = [];

  if (hasProfile) {
    badges.push({ label: "Company Profile", color: "bg-[#e8ddd3] text-[#6b5744]" });
  }

  const docCount = sources?.length ?? 0;
  if (docCount > 0) {
    const uniqueDocs = new Set(sources!.map((s) => s.documentId)).size;
    badges.push({
      label: `${uniqueDocs} document${uniqueDocs !== 1 ? "s" : ""}`,
      color: "bg-[#dde4e8] text-[#4a5c6b]",
    });
  }

  if (researchDepth === "standard" || researchDepth === "deep") {
    badges.push({ label: "Web research", color: "bg-[#e3dde8] text-[#5c4a6b]" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
      <span className="text-[11px] text-[var(--text-muted)]">Grounded in:</span>
      {badges.map((b, i) => (
        <span
          key={i}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${b.color}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

/* ── Context Nudge ── */

function ContextNudge({ hasProfile }: { hasProfile: boolean }) {
  const [, setLocation] = useLocation();

  if (hasProfile) return null;

  return (
    <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[#ddd3c4] bg-[#f5efe8]">
      <Info className="h-4 w-4 text-[#9a7b5a] shrink-0" />
      <span className="text-[13px] text-[#6b5744] flex-1">
        Connect your data for insights specific to <strong>your</strong> business
      </span>
      <button
        onClick={() => setLocation("/connect")}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity shrink-0"
      >
        Connect <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Input Bar ── */

function SolveInput({
  value,
  onChange,
  onSend,
  isStreaming,
  selectedFiles = [],
  onFilesChange,
  analysisMode,
  onAnalysisModeChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (content: string, depth: ResearchDepth) => void;
  isStreaming: boolean;
  selectedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  analysisMode: AnalysisMode;
  onAnalysisModeChange: (m: AnalysisMode) => void;
}) {
  const [depth, setDepth] = useState<ResearchDepth>(
    () => (localStorage.getItem("stratix:depth") as ResearchDepth) || "standard"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDepthChange = (newDepth: ResearchDepth) => {
    localStorage.setItem("stratix:depth", newDepth);
    setDepth(newDepth);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isStreaming) return;
    onSend(value.trim(), depth);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesChange?.(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesChange?.(newFiles);
  };

  return (
    <div className="shrink-0 px-2 sm:px-4 pb-4">
      <div className="max-w-[720px] mx-auto">
        {/* Depth toggle + analysis modes */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12px] text-[var(--text-muted)] shrink-0">Depth</span>
          <DepthToggle depth={depth} onChange={handleDepthChange} />
        </div>
        <div className="mb-2 px-1">
          <AnalysisModes mode={analysisMode} onChange={onAnalysisModeChange} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
            <button
              type="button"
              aria-label="Attach files"
              onClick={handleAttachClick}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-0.5"
            >
              <Plus className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Attach files"
            />

            <textarea
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                // Auto-grow textarea
                const el = e.target;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder={getPlaceholderForMode(analysisMode)}
              rows={1}
              aria-label="Message input"
              className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none min-h-[28px] max-h-[120px] leading-7 overflow-y-auto"
              disabled={isStreaming}
            />

            <button
              type="submit"
              disabled={!value.trim() || isStreaming}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--text-inverted)] transition-opacity disabled:opacity-30 mb-0.5"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* File chips */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 px-1">
            {selectedFiles.map((file, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/25 text-[12px]"
              >
                <span className="text-[var(--text-secondary)] truncate max-w-[100px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <div className="text-center text-caption text-[var(--text-muted)] mt-2 px-1">
          ⌘K to search · ⇧⏎ for new line
        </div>

        {value.length > 500 && (
          <span className="block text-right text-caption text-[var(--text-muted)] mt-1 pr-1">
            {value.length} characters
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Solve Page ── */

export function Solve() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: authData } = useGetCurrentAuthUser();
  const rawName = (authData?.user as Record<string, string> | undefined)?.name;
  const rawEmail = (authData?.user as Record<string, string> | undefined)?.email;
  // Show first name if available, otherwise extract and format username from email
  const emailPrefix = rawEmail?.includes("@") ? rawEmail.split("@")[0] : rawEmail;
  // Capitalize and clean up email prefix: "nazeemahmed2023" -> "Nazeem"
  const formattedPrefix = emailPrefix
    ? emailPrefix.replace(/[0-9_.-]+$/g, "").replace(/([a-z])([A-Z])/g, "$1 $2").split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ").split(" ")[0] || emailPrefix
    : undefined;
  const userName = rawName || formattedPrefix;

  const { definitions } = useDefinitions();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [lastDepth, setLastDepth] = useState<ResearchDepth>("standard");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("general");
  const [hasProfile, setHasProfile] = useState(false);
  const [nudgeShown, setNudgeShown] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Check if company profile exists
  useEffect(() => {
    fetch("/api/context/health", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.hasProfile) setHasProfile(true); })
      .catch(() => {});
  }, []);

  const { data: rawConversations, isError: conversationsError } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() },
  });
  const conversations = Array.isArray(rawConversations) ? rawConversations : [];

  const { data: activeConversation } = useGetOpenaiConversation(
    activeId as number,
    { query: { enabled: !!activeId, queryKey: getGetOpenaiConversationQueryKey(activeId as number) } }
  );

  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const messages = (activeConversation?.messages as unknown as Message[]) ?? [];

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingContent]);

  const handleCreate = useCallback((initialMessage?: string) => {
    if (initialMessage) setPendingMessage(initialMessage);
    createConversation.mutate(
      { data: { title: initialMessage || "New Session" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setActiveId(newConv.id);
        },
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 401) {
            toast({ title: "Session expired", description: "Please log in again." });
            window.location.href = "/login";
          } else {
            toast({ title: "Failed to create session", variant: "destructive" });
          }
        },
      }
    );
  }, [createConversation, queryClient, toast]);

  const handleDelete = useCallback((id: number) => {
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (activeId === id) setActiveId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete session", variant: "destructive" });
        },
      }
    );
  }, [deleteConversation, queryClient, activeId, toast]);

  const handleExportConversation = useCallback(() => {
    if (!activeConversation || !messages.length) {
      toast({ title: "No conversation to export", variant: "destructive" });
      return;
    }

    const markdown = messages
      .map((msg) => {
        const role = msg.role === "user" ? "**You**" : "**Stratix**";
        return `${role}\n\n${msg.content}`;
      })
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(markdown).then(() => {
      toast({ title: "Conversation copied to clipboard" });
    }).catch(() => {
      toast({ title: "Failed to copy conversation", variant: "destructive" });
    });
  }, [activeConversation, messages, toast]);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Message copied to clipboard" });
    }).catch(() => {
      toast({ title: "Failed to copy message", variant: "destructive" });
    });
  }, [toast]);

  const handleShareMessage = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  const handleSend = useCallback(async (content: string, depth: ResearchDepth) => {
    if (!content?.trim() || !activeId || isStreaming) return;

    const savedInput = content;
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");
    setLastDepth(depth);

    // Optimistic user message
    queryClient.setQueryData(
      getGetOpenaiConversationQueryKey(activeId),
      (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const typedOld = old as { messages: Message[] };
        return { ...typedOld, messages: [...typedOld.messages, { id: Date.now().toString(), role: "user", content }] };
      }
    );

    let accumulated = "";

    try {
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          research_depth: depth,
          analysis_mode: analysisMode,
          context: {
            definitions: definitions.map((d) => ({ term: d.term, value: d.value })),
          },
        }),
        credentials: "include",
      });

      if (response.status === 401) {
        toast({ title: "Session expired", description: "Please log in again." });
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast({ title: errData?.error || "Failed to get response", variant: "destructive" });
        setInputValue(savedInput);
        return;
      }

      if (!response.body) {
        toast({ title: "Server didn't respond. Please try again.", variant: "destructive" });
        setInputValue(savedInput);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          let data: Record<string, string>;
          try {
            data = JSON.parse(dataMatch[1]);
          } catch {
            continue; // skip malformed SSE chunks
          }

          if (event === "content") {
            accumulated += data.delta;
            setStreamingContent(accumulated);
          } else if (event === "complete") {
            // Store confidence, data sources, and source chunks on the latest assistant message
            const completeData = data as Record<string, unknown>;
            const confidence = typeof completeData.confidence === "number" ? completeData.confidence : undefined;
            const dataSources = Array.isArray(completeData.data_sources) ? (completeData.data_sources as string[]) : undefined;
            const sourcesUsed = Array.isArray(completeData.sources_used) ? (completeData.sources_used as SourceChunk[]) : undefined;
            if (confidence !== undefined || dataSources !== undefined || sourcesUsed !== undefined) {
              queryClient.setQueryData(
                getGetOpenaiConversationQueryKey(activeId),
                (old: unknown) => {
                  if (!old || typeof old !== "object") return old;
                  const typedOld = old as { messages: Message[] };
                  const msgs = [...typedOld.messages];
                  // Find last assistant message and attach metadata
                  for (let i = msgs.length - 1; i >= 0; i--) {
                    if (msgs[i].role === "assistant") {
                      msgs[i] = {
                        ...msgs[i],
                        ...(confidence !== undefined ? { confidence } : {}),
                        ...(dataSources !== undefined ? { dataSources } : {}),
                        ...(sourcesUsed !== undefined ? { sources: sourcesUsed } : {}),
                      };
                      break;
                    }
                  }
                  return { ...typedOld, messages: msgs };
                }
              );
            }
            queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          }
        }
      }
    } catch {
      // If we received partial content, show what we got
      if (accumulated) {
        toast({ title: "Response interrupted", description: "Partial answer shown above. Try sending again.", variant: "destructive" });
      } else {
        toast({ title: "Failed to send message", description: "Check your connection and try again.", variant: "destructive" });
        setInputValue(savedInput);
      }
    } finally {
      setIsStreaming(false);
      // Keep partial streaming content visible until the query refetches if we got something
      if (!accumulated) {
        setStreamingContent("");
      }
    }
  }, [activeId, isStreaming, queryClient, toast, definitions, analysisMode]);

  // Auto-send pending
  useEffect(() => {
    if (pendingMessage && activeId && !isStreaming) {
      const msg = pendingMessage;
      setPendingMessage(null);
      handleSend(msg, "standard");
    }
  }, [pendingMessage, activeId, isStreaming, handleSend]);

  const activeTitle = activeId
    ? conversations.find((c) => c.id === activeId)?.title || "Session"
    : "New Task";

  return (
    <div className="h-full flex flex-col">
      {/* Minimal top bar */}
      <div className="shrink-0 h-12 flex items-center justify-between px-4">
        <SessionDropdown
          sessions={conversations}
          activeId={activeId}
          activeTitle={activeTitle}
          onSelect={setActiveId}
          onCreate={() => handleCreate()}
          onDelete={setDeleteTarget}
          isCreating={createConversation.isPending}
        />
        {activeId && (
          <button
            onClick={handleExportConversation}
            className="flex items-center justify-center h-7 w-7 rounded-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
            title="Export conversation"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Session load error */}
      {conversationsError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20">
          <p className="text-caption text-[var(--error)]">Couldn't load sessions. Your messages will still work.</p>
        </div>
      )}

      {/* Chat area or empty state */}
      {activeId ? (
        <>
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            <div className="max-w-[720px] mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-[20px] rounded-br-[4px] bg-[var(--text-primary)] text-[var(--text-inverted)] px-5 py-3 text-[15px] leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-[4px] bg-[var(--accent)] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">S</span>
                        </div>
                        <span className="text-caption text-[var(--text-muted)]">Stratix</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          <button
                            onClick={() => handleCopyMessage(msg.content)}
                            className="p-1.5 rounded hover:bg-[var(--surface-elevated)] transition-colors"
                            title="Copy message"
                          >
                            <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          </button>
                          <button
                            onClick={handleShareMessage}
                            className="p-1.5 rounded hover:bg-[var(--surface-elevated)] transition-colors"
                            title="Share message"
                          >
                            <Share2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          </button>
                        </div>
                      </div>
                      <ContextIndicator
                        sources={msg.sources}
                        hasProfile={hasProfile}
                        researchDepth={lastDepth}
                      />
                      <div className="prose-warm">
                        <SafeMarkdown>{msg.content}</SafeMarkdown>
                        {msg.sources && msg.sources.length > 0 && (
                          <SourcePanel sources={msg.sources} />
                        )}
                        {msg.dataSources && msg.dataSources.length > 0 && (
                          <DataSourceBadges dataSources={msg.dataSources} />
                        )}
                        {msg.confidence !== undefined && (
                          <ConfidenceBadge confidence={msg.confidence} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <QueryInspector content={msg.content} />
                      </div>
                      <ResponseActions content={msg.content} conversationId={activeId!} />
                      {/* Context nudge on first AI response only */}
                      {(() => {
                        const aiMessages = messages.filter((m) => m.role === "assistant");
                        const isFirst = aiMessages.length > 0 && aiMessages[0].id === msg.id;
                        if (isFirst && !nudgeShown) {
                          return <ContextNudge hasProfile={hasProfile} />;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming */}
              {isStreaming && streamingContent && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-[4px] bg-[var(--accent)] flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">S</span>
                    </div>
                    <span className="text-caption text-[var(--text-muted)]">Stratix</span>
                  </div>
                  <div className="prose-warm">
                    <SafeMarkdown>{streamingContent}</SafeMarkdown>
                    <span className="inline-block w-0.5 h-5 bg-[var(--accent)] animate-pulse ml-0.5" />
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-[4px] bg-[var(--accent)] flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">S</span>
                  </div>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </span>
                  <span className="text-caption text-[var(--text-muted)]">Analyzing...</span>
                </div>
              )}
            </div>
          </div>

          <SolveInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            isStreaming={isStreaming}
            selectedFiles={selectedFiles}
            onFilesChange={setSelectedFiles}
            analysisMode={analysisMode}
            onAnalysisModeChange={setAnalysisMode}
          />
        </>
      ) : (
        <>
          <SolveEmpty onCreate={handleCreate} isCreating={createConversation.isPending} userName={userName} />
          <SolveInput
            value={inputValue}
            onChange={setInputValue}
            onSend={(content) => handleCreate(content)}
            isStreaming={false}
            selectedFiles={selectedFiles}
            onFilesChange={setSelectedFiles}
            analysisMode={analysisMode}
            onAnalysisModeChange={setAnalysisMode}
          />
        </>
      )}

      {/* Share modal */}
      {activeId && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          conversationId={activeId}
          conversationTitle={activeTitle}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              This conversation will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget !== null) {
                  handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
