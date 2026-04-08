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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Trash2, ArrowUp, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
            {sessions.length === 0 ? (
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
              className="flex items-start gap-3 text-left p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="text-body-sm text-[var(--text-secondary)] leading-relaxed">{s.text}</span>
            </button>
          ))}
        </div>
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

/* ── Source Attribution Badges ── */

function SourceBadges({ sources }: { sources: SourceChunk[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
      <span className="text-[11px] text-[var(--text-muted)] leading-6">Sources:</span>
      {sources.map((s, i) => (
        <span
          key={`${s.documentId}-${s.chunkIndex}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/8 border border-[var(--accent)]/15 text-[11px] text-[var(--text-secondary)]"
        >
          <span className="truncate max-w-[140px]">{s.documentTitle}</span>
          <span className="text-[var(--accent)] font-medium">{Math.round(s.similarity * 100)}%</span>
        </span>
      ))}
    </div>
  );
}

/* ── Input Bar ── */

function SolveInput({
  value,
  onChange,
  onSend,
  isStreaming,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (content: string, depth: ResearchDepth) => void;
  isStreaming: boolean;
}) {
  const [depth, setDepth] = useState<ResearchDepth>(
    () => (localStorage.getItem("stratix:depth") as ResearchDepth) || "standard"
  );

  const handleDepthChange = (newDepth: ResearchDepth) => {
    localStorage.setItem("stratix:depth", newDepth);
    setDepth(newDepth);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isStreaming) return;
    onSend(value.trim(), depth);
  };

  return (
    <div className="shrink-0 px-2 sm:px-4 pb-4">
      <div className="max-w-[720px] mx-auto">
        {/* Depth toggle row */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[12px] text-[var(--text-muted)]">Research depth</span>
          <DepthToggle depth={depth} onChange={handleDepthChange} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
            <button
              type="button"
              aria-label="Attach files"
              title="Attach files (coming soon)"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-0.5 opacity-50 cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>

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
              placeholder="Ask me..."
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

  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: conversations = [] } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() },
  });

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
      }
    );
  }, [createConversation, queryClient]);

  const handleDelete = useCallback((id: number) => {
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (activeId === id) setActiveId(null);
        },
      }
    );
  }, [deleteConversation, queryClient, activeId]);

  const handleSend = useCallback(async (content: string, depth: ResearchDepth) => {
    if (!content?.trim() || !activeId || isStreaming) return;

    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistic user message
    queryClient.setQueryData(
      getGetOpenaiConversationQueryKey(activeId),
      (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const typedOld = old as { messages: Message[] };
        return { ...typedOld, messages: [...typedOld.messages, { id: Date.now().toString(), role: "user", content }] };
      }
    );

    try {
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, research_depth: depth }),
        credentials: "include",
      });

      if (!response.body) {
        toast({ title: "No response from server", variant: "destructive" });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
          const data = JSON.parse(dataMatch[1]);

          if (event === "content") {
            accumulated += data.delta;
            setStreamingContent(accumulated);
          } else if (event === "complete") {
            queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          }
        }
      }
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [activeId, isStreaming, queryClient, toast]);

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
      </div>

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
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-5 w-5 rounded-[4px] bg-[var(--accent)] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">S</span>
                        </div>
                        <span className="text-caption text-[var(--text-muted)]">Stratix</span>
                      </div>
                      <div className="prose-warm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceBadges sources={msg.sources} />
                        )}
                      </div>
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
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
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
          />
        </>
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
