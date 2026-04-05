import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Paperclip,
  Sparkles,
  BarChart3,
  Globe,
  TrendingUp,
  ArrowUp,
} from "lucide-react";
import { api, apiPost, apiDelete } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SessionList, type Conversation } from "@/components/explore/session-list";
import { MessagePair, type MessagePairData, type Source } from "@/components/explore/message-pair";

const BASE_URL = "/api";

type Depth = "Quick" | "Standard" | "Deep";

const GRADIENTS = [
  "from-[#FED7D7] to-[#FEB2B2]", // coral
  "from-[#FEEBC8] to-[#FBD38D]", // peach
  "from-[#C6F6D5] to-[#9AE6B4]", // mint
  "from-[#E9D8FD] to-[#D6BCFA]", // lavender
  "from-[#BEE3F8] to-[#90CDF4]", // sky
  "from-[#FED7E2] to-[#FBB6CE]", // rose
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "just now";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ApiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  createdAt: string;
}

interface ConversationDetail {
  id: number;
  title: string;
  messages: ApiMessage[];
}

function groupIntoPairs(
  messages: ApiMessage[],
  streamingContent: string,
  isStreaming: boolean,
): MessagePairData[] {
  const pairs: MessagePairData[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.role !== "user") continue;

    const next = messages[i + 1];
    const hasAssistant = next?.role === "assistant";

    pairs.push({
      id: String(msg.id),
      question: msg.content,
      answer: hasAssistant && next ? next.content : "",
      sources: hasAssistant && next ? next.sources ?? [] : [],
    });
  }

  // Append streaming pair if last message was user with no assistant reply
  if (isStreaming && pairs.length > 0) {
    const last = pairs[pairs.length - 1]!;
    last.answer = last.answer || streamingContent;
    last.isStreaming = !last.answer || last.answer === streamingContent;
  }

  return pairs;
}

const SUGGESTIONS = [
  { icon: Sparkles, label: "Summarize latest threat reports" },
  { icon: BarChart3, label: "Analyze Q4 revenue trends" },
  { icon: Globe, label: "Map competitor activity in EMEA" },
  { icon: TrendingUp, label: "Forecast market movement" },
];

export default function ExplorePage() {
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [depth, setDepth] = useState<Depth>("Standard");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sidebar collapsed when no active conversation (home view)
  const sidebarCollapsed = activeId === null;

  // Fetch conversations list
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => api<Conversation[]>("/openai/conversations"),
  });

  // Fetch conversation detail when active changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    api<ConversationDetail>(`/openai/conversations/${activeId}`)
      .then((detail) => {
        if (!cancelled) setMessages(detail.messages);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const createConversation = useCallback(
    async (title: string): Promise<number> => {
      const conv = await apiPost<Conversation>("/openai/conversations", {
        title,
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveId(conv.id);
      return conv.id;
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await apiDelete(`/openai/conversations/${id}`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [activeId, queryClient],
  );

  const handleNewSession = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      let conversationId = activeId;

      // Create conversation if none active
      if (!conversationId) {
        const title =
          text.length > 50 ? text.slice(0, 50) + "..." : text;
        conversationId = await createConversation(title);
      }

      // Optimistically add user message
      const userMsg: ApiMessage = {
        id: Date.now(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsStreaming(true);
      setStreamingContent("");

      // SSE streaming via fetch
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `${BASE_URL}/openai/conversations/${conversationId}/messages`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text, depth }),
            signal: controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let sources: Source[] = [];
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventName = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                eventData = line.slice(5).trim();
              }
            }

            if (!eventData) continue;

            try {
              const parsed = JSON.parse(eventData);

              if (eventName === "content") {
                accumulated += parsed.delta ?? parsed.content ?? "";
                setStreamingContent(accumulated);
              } else if (eventName === "sources") {
                sources = parsed.sources ?? parsed ?? [];
              } else if (eventName === "complete") {
                // Use final content if provided
                if (parsed.content) {
                  accumulated = parsed.content;
                }
              }
            } catch {
              // If data isn't JSON, treat as raw text delta
              if (eventName === "content") {
                accumulated += eventData;
                setStreamingContent(accumulated);
              }
            }
          }
        }

        // Finalize: add assistant message
        const assistantMsg: ApiMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: accumulated,
          sources,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMsg: ApiMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content:
              "Sorry, something went wrong. Please try again.",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [activeId, createConversation, depth, isStreaming],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const pairs = groupIntoPairs(messages, streamingContent, isStreaming);
  const isHomeView = activeId === null && pairs.length === 0 && !isStreaming;

  // ---------- Chat Input (shared between both states) ----------
  const chatInput = (
    <div className={cn(
      "bg-white px-4 py-3",
      !isHomeView && "border-t border-[#E5E5E3]/60"
    )}>
      <div className="max-w-2xl mx-auto">
        {/* Mode toggle pills */}
        <div className="flex justify-center gap-1 mb-2">
          {(["Quick", "Standard", "Deep"] as Depth[]).map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                depth === d
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#A3A3A3] hover:text-[#525252]",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Input pill */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 bg-[#FAFAF9] rounded-2xl border border-[#E5E5E3] px-4 py-3 focus-within:border-[#1A1A1A]/20 focus-within:shadow-md transition-all"
        >
          <button
            type="button"
            className="text-[#A3A3A3] hover:text-[#525252] transition-colors shrink-0"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your intelligence..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#A3A3A3] outline-none py-0 max-h-32"
            style={{
              height: "auto",
              minHeight: "24px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height =
                Math.min(target.scrollHeight, 128) + "px";
            }}
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isStreaming}
            className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-[#2D2D2D] transition-colors disabled:opacity-30 shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  // ==================== HOME VIEW ====================
  if (isHomeView) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[640px] px-6 py-12 space-y-8">
            {/* Sparkle + Greeting */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Sparkles className="w-8 h-8 text-[#A3A3A3]" />
              </div>
              <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">
                {getGreeting()}, Alex
              </h1>
              <p className="text-[#A3A3A3] text-sm">
                What would you like to explore?
              </p>
            </div>

            {/* Recent conversations as gradient cards */}
            {conversations.length > 0 && (
              <div className="w-full">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {conversations.slice(0, 6).map((conv, i) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveId(conv.id)}
                      className="flex-shrink-0 w-40 rounded-xl overflow-hidden border border-[#E5E5E3]/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-white"
                    >
                      <div
                        className={cn(
                          "h-12 bg-gradient-to-br",
                          GRADIENTS[i % GRADIENTS.length]
                        )}
                      />
                      <div className="p-3">
                        <p className="text-xs font-medium text-[#1A1A1A] truncate text-left">
                          {conv.title}
                        </p>
                        <p className="text-[11px] text-[#A3A3A3] mt-1 text-left">
                          {formatTime(conv.updatedAt)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestion pills — 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.label)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E3] text-sm text-[#525252] hover:shadow-md hover:border-[#D4D4D4] transition-all shadow-sm text-left"
                >
                  <s.icon className="w-4 h-4 text-[#A3A3A3] shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Chat input */}
            {chatInput}
          </div>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE CONVERSATION VIEW ====================
  return (
    <div className="h-full flex">
      {/* Session Sidebar */}
      <SessionList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={handleDelete}
        onNew={handleNewSession}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[#E5E5E3]/60 bg-white px-5 py-3">
          <Sparkles className="h-4 w-4 text-[#A3A3A3]" />
          <h1 className="text-sm font-medium text-[#1A1A1A] truncate">
            {conversations.find((c) => c.id === activeId)?.title ?? "Explore"}
          </h1>
        </header>

        {/* Scrollable Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white"
        >
          <div className="max-w-3xl mx-auto py-6 px-6 space-y-6">
            {/* Message Pairs */}
            {pairs.map((pair) => (
              <MessagePair
                key={pair.id}
                pair={pair}
                onCopy={handleCopy}
                onSaveToBoard={() => {}}
                onShare={() => {}}
              />
            ))}

            {/* Streaming indicator when waiting for first token */}
            {isStreaming && streamingContent === "" && pairs.length > 0 && (
              <div className="flex items-center gap-2 py-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:300ms]" />
                <span className="text-xs text-[#A3A3A3] ml-1">
                  Thinking...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Input Bar */}
        {chatInput}
      </div>
    </div>
  );
}
