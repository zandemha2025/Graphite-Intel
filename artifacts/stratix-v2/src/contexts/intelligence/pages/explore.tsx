import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Paperclip,
  Sparkles,
  BarChart3,
  Globe,
  TrendingUp,
} from "lucide-react";
import { api, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionList, type Conversation } from "@/components/explore/session-list";
import { MessagePair, type MessagePairData, type Source } from "@/components/explore/message-pair";

const BASE_URL = "/api";

type Depth = "Quick" | "Standard" | "Deep";

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
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-5 py-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-stone-500 hover:bg-stone-100 transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <h1 className="text-lg font-semibold text-stone-900">
            Explore
          </h1>
          <span className="text-sm text-stone-400">
            AI-powered intelligence
          </span>
        </header>

        {/* Scrollable Notebook Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white"
        >
          <div className="max-w-3xl mx-auto py-8 px-6 space-y-6">
            {/* Empty State */}
            {pairs.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="h-12 w-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-stone-400" />
                </div>
                <h2 className="text-lg font-semibold text-stone-900 mb-1">
                  Start exploring
                </h2>
                <p className="text-sm text-stone-500 mb-8 text-center max-w-md">
                  Ask questions about your data, generate insights,
                  or start with a suggestion below.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.label)}
                      className="flex items-center gap-3 px-4 py-3 border border-stone-200 rounded-xl text-left text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                    >
                      <s.icon className="h-4 w-4 shrink-0 text-stone-400" />
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
        <div className="border-t border-stone-200 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {/* Depth Toggle */}
            <div className="flex items-center gap-1 mb-3">
              {(["Quick", "Standard", "Deep"] as Depth[]).map(
                (d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                      depth === d
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200",
                    )}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>

            {/* Input Row */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 rounded-xl border border-stone-200 bg-white p-2 focus-within:border-stone-400 transition-colors"
            >
              <button
                type="button"
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors shrink-0"
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
                className="flex-1 resize-none bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none py-2 max-h-32"
                style={{
                  height: "auto",
                  minHeight: "36px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 128) + "px";
                }}
              />

              <Button
                type="submit"
                size="sm"
                disabled={!inputValue.trim() || isStreaming}
                className="shrink-0 rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
