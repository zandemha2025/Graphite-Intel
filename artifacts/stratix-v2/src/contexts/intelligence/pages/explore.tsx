import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PanelLeftClose,
  PanelLeftOpen,
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
  "bg-gradient-to-br from-[#FED7D7] to-[#FEB2B2]", // coral
  "bg-gradient-to-br from-[#FEEBC8] to-[#FBD38D]", // peach
  "bg-gradient-to-br from-[#C6F6D5] to-[#9AE6B4]", // mint
  "bg-gradient-to-br from-[#E9D8FD] to-[#D6BCFA]", // lavender
  "bg-gradient-to-br from-[#BEE3F8] to-[#90CDF4]", // sky
  "bg-gradient-to-br from-[#FED7E2] to-[#FBB6CE]", // rose
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [depth, setDepth] = useState<Depth>("Standard");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  return (
    <div className="h-full flex">
      {/* Session Sidebar */}
      <SessionList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={handleDelete}
        onNew={handleNewSession}
        isCollapsed={!sidebarOpen}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[#E5E5E3]/60 bg-white/80 backdrop-blur-sm px-5 py-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F5F5F4] transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">
            Explore
          </h1>
          <span className="text-sm text-[#A3A3A3]">
            AI-powered intelligence
          </span>
        </header>

        {/* Scrollable Notebook Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-[#FAFAF9]"
        >
          <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
            {/* Empty State — Rich Home View */}
            {pairs.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center flex-1 px-2 py-12 max-w-3xl mx-auto">
                {/* Welcome */}
                <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-1">
                  {getGreeting()}
                </h1>
                <p className="text-[#525252] text-sm mb-8">
                  What would you like to explore today?
                </p>

                {/* Recent conversations as gradient cards */}
                {conversations.length > 0 && (
                  <section className="w-full mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-medium text-[#525252]">
                        Recent conversations
                      </h2>
                      <button className="text-xs text-[#A3A3A3] hover:text-[#525252] transition-colors">
                        View all
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                      {conversations.slice(0, 6).map((conv, i) => (
                        <button
                          key={conv.id}
                          onClick={() => setActiveId(conv.id)}
                          className="flex-shrink-0 w-48 rounded-xl overflow-hidden border border-[#E5E5E3]/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 bg-white"
                        >
                          <div
                            className={`h-16 ${GRADIENTS[i % GRADIENTS.length]}`}
                          />
                          <div className="p-3">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate text-left">
                              {conv.title}
                            </p>
                            <p className="text-xs text-[#A3A3A3] mt-1 text-left">
                              {formatTime(conv.updatedAt)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.label)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E3] text-sm text-[#525252] hover:bg-[#F5F5F4] hover:border-[#D4D4D4] transition-all shadow-sm"
                    >
                      <s.icon className="w-4 h-4 text-[#A3A3A3]" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              <div className="flex items-center gap-2 px-5 py-4">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
                <span className="text-xs text-stone-400 ml-1">
                  Thinking...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Input Bar */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#FAFAF9] via-[#FAFAF9] to-transparent pt-6 pb-4 px-6">
          <div className="max-w-2xl mx-auto">
            {/* Mode toggle pills */}
            <div className="flex items-center gap-1 mb-2 justify-center">
              {(["Quick", "Standard", "Deep"] as Depth[]).map(
                (d) => (
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
                ),
              )}
            </div>

            {/* Input pill */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 bg-white rounded-2xl border border-[#E5E5E3] shadow-sm focus-within:shadow-md focus-within:border-[#1A1A1A]/20 transition-all px-4 py-3"
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
      </div>
    </div>
  );
}
