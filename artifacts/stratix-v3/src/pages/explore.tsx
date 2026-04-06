import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api, apiPost, apiDelete, apiSSE, ApiError } from "@/lib/api";
import { ResultCell, type ResultCellData } from "@/components/explore/result-cell";
import { Conversation, type Message, type Source } from "@/components/explore/conversation";
import { ChatInput } from "@/components/explore/chat-input";
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  Layout,
  Loader2,
} from "lucide-react";

type Depth = "quick" | "standard" | "deep";

interface ApiConversation {
  id: string;
  title?: string;
  created_at?: string;
}

/* ---------- Cell parsing ---------- */

function parseResponseIntoCells(
  content: string,
  sources?: Source[],
): ResultCellData[] {
  const cells: ResultCellData[] = [];
  const sourceNames = sources?.map((s) => s.name) ?? [];

  // Split by ## headings
  const sections = content.split(/(?=^## )/m).filter((s) => s.trim());

  if (sections.length > 1) {
    for (const section of sections) {
      const titleMatch = section.match(/^## (.+)\n?/);
      const title = titleMatch?.[1] ?? "Analysis";
      const body = section.replace(/^## .+\n?/, "").trim();
      const hasTable = body.includes("|") && body.includes("---");
      const hasComparison = /\bvs\.?\b|\bcompared to\b/i.test(body);
      const hasKeyFinding = /key\s*(finding|takeaway)\s*:/i.test(body);
      cells.push({
        id: crypto.randomUUID(),
        type: hasTable
          ? "table"
          : hasComparison
            ? "comparison"
            : hasKeyFinding
              ? "key-finding"
              : "key-finding",
        title,
        content: body,
        sources: sourceNames,
      });
    }
  } else {
    const hasTable = content.includes("|") && content.includes("---");
    const hasComparison = /\bvs\.?\b|\bcompared to\b/i.test(content);
    cells.push({
      id: crypto.randomUUID(),
      type: hasTable ? "table" : hasComparison ? "comparison" : "analysis",
      title: "Analysis",
      content,
      sources: sourceNames,
    });
  }

  return cells;
}

/* ---------- Recent activity cards for empty state ---------- */

interface RecentActivityItem {
  title: string;
  type: "report" | "notebook" | "board";
  time: string;
}

const activityIcons: Record<RecentActivityItem["type"], typeof FileText> = {
  report: FileText,
  notebook: BarChart3,
  board: Layout,
};

function RecentActivityCard({ item }: { item: RecentActivityItem }) {
  const Icon = activityIcons[item.type];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 transition-colors hover:bg-[#F9FAFB]">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF]">
        <Icon className="h-4 w-4 text-[#4F46E5]" />
      </div>
      <div>
        <div className="text-sm font-medium text-[#111827]">{item.title}</div>
        <div className="text-xs text-[#9CA3AF]">{item.time}</div>
      </div>
    </div>
  );
}

function useRecentActivity() {
  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      api<{ reports: { id: string; title: string; createdAt: string }[] }>("/reports?limit=1"),
      api<{ notebooks: { id: string; title: string; updatedAt: string }[] }>("/notebooks?limit=1"),
      api<{ boards: { id: string; title: string; updatedAt: string }[] }>("/boards?limit=1"),
    ]).then((results) => {
      if (cancelled) return;
      const activity: RecentActivityItem[] = [];

      if (results[0]?.status === "fulfilled") {
        const reports = results[0].value.reports ?? [];
        if (reports[0]) {
          activity.push({
            title: reports[0].title,
            type: "report",
            time: reports[0].createdAt
              ? `Created ${new Date(reports[0].createdAt).toLocaleDateString()}`
              : "Recent",
          });
        }
      }
      if (results[1]?.status === "fulfilled") {
        const notebooks = results[1].value.notebooks ?? [];
        if (notebooks[0]) {
          activity.push({
            title: notebooks[0].title,
            type: "notebook",
            time: notebooks[0].updatedAt
              ? `Updated ${new Date(notebooks[0].updatedAt).toLocaleDateString()}`
              : "Recent",
          });
        }
      }
      if (results[2]?.status === "fulfilled") {
        const boards = results[2].value.boards ?? [];
        if (boards[0]) {
          activity.push({
            title: boards[0].title,
            type: "board",
            time: boards[0].updatedAt
              ? `Updated ${new Date(boards[0].updatedAt).toLocaleDateString()}`
              : "Recent",
          });
        }
      }

      setItems(activity);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { items, loading };
}

/* ---------- Research phase management ---------- */

type ResearchPhase = "searching" | "analyzing" | "synthesizing" | "idle";

/* ---------- Main page ---------- */

export default function ExplorePage() {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cells, setCells] = useState<ResultCellData[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [depth, setDepth] = useState<Depth>("standard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [researchPhase, setResearchPhase] = useState<ResearchPhase>("idle");
  const [sourceCount, setSourceCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const { items: recentActivity, loading: recentActivityLoading } = useRecentActivity();

  /* Load conversation list on mount */
  useEffect(() => {
    api<ApiConversation[]>("/openai/conversations")
      .then((list) => {
        const items = list ?? [];
        setConversations(items);
        if (items.length > 0 && items[0]) {
          setActiveConvId(items[0].id);
        }
      })
      .catch(() => {
        // API might not be available yet -- ignore
      });
  }, []);

  /* Load messages when active conversation changes */
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setCells([]);
      return;
    }
    api<{ messages?: Message[] }>(`/openai/conversations/${activeConvId}`)
      .then((conv) => {
        const msgs = conv.messages ?? [];
        setMessages(msgs);
        // Rebuild cells from existing assistant messages
        const rebuilt: ResultCellData[] = [];
        for (const m of msgs) {
          if (m.role === "assistant" && m.content?.trim()) {
            rebuilt.push(
              ...parseResponseIntoCells(
                m.content,
                m.sources?.map((s) => ({ name: s })),
              ),
            );
          }
        }
        setCells(rebuilt);
      })
      .catch(() => {
        setMessages([]);
        setCells([]);
      });
  }, [activeConvId]);

  /* Create a new conversation */
  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await apiPost<ApiConversation>("/openai/conversations", {});
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
      setCells([]);
    } catch {
      // If API fails, just reset local state for offline use
      const localId = `local-${Date.now()}`;
      const localConv: ApiConversation = { id: localId, title: "New Explore" };
      setConversations((prev) => [localConv, ...prev]);
      setActiveConvId(localId);
      setMessages([]);
      setCells([]);
    }
  }, []);

  /* Delete a conversation */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDelete(`/openai/conversations/${id}`);
      } catch {
        // ignore
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
        setCells([]);
      }
    },
    [activeConvId],
  );

  /* Send a message with SSE streaming */
  const handleSend = useCallback(
    async (content: string) => {
      // Create conversation on first message if none active
      let convId = activeConvId;
      if (!convId) {
        try {
          const conv = await apiPost<ApiConversation>(
            "/openai/conversations",
            {},
          );
          convId = conv.id;
          setConversations((prev) => [conv, ...prev]);
          setActiveConvId(conv.id);
        } catch {
          convId = `local-${Date.now()}`;
          const localConv: ApiConversation = {
            id: convId,
            title: content.slice(0, 40),
          };
          setConversations((prev) => [localConv, ...prev]);
          setActiveConvId(convId);
        }
      }

      // Update conversation title if it has no title yet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId && !c.title
            ? { ...c, title: content.slice(0, 40) }
            : c,
        ),
      );

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);
      setResearchPhase("searching");
      setSourceCount(0);

      let assistantContent = "";
      let collectedSources: Source[] = [];
      const assistantId = `a-${Date.now()}`;

      abortRef.current = new AbortController();

      try {
        await apiSSE(
          `/openai/conversations/${convId}/messages`,
          { content, depth },
          (event, data) => {
            if (event === "sources") {
              try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                  collectedSources = parsed.map((s: Source | string) =>
                    typeof s === "string"
                      ? { name: s, url: "#", domain: s.toLowerCase().replace(/\s+/g, "") + ".com" }
                      : { name: s.name, url: s.url || "#", domain: s.domain || s.name.toLowerCase().replace(/\s+/g, "") + ".com" },
                  );
                } else if (parsed.sources) {
                  collectedSources = parsed.sources.map(
                    (s: Source | string) =>
                      typeof s === "string"
                        ? { name: s, url: "#", domain: s.toLowerCase().replace(/\s+/g, "") + ".com" }
                        : { name: s.name, url: s.url || "#", domain: s.domain || s.name.toLowerCase().replace(/\s+/g, "") + ".com" },
                  );
                }
                setSourceCount(collectedSources.length);
                setResearchPhase("analyzing");
              } catch {
                // ignore
              }
              return;
            }

            if (event === "done") {
              return;
            }

            // Handle token events (may come as "message" or "token")
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                assistantContent += parsed.choices[0].delta.content;
              } else if (typeof parsed.content === "string") {
                assistantContent += parsed.content;
              } else if (typeof parsed.token === "string") {
                assistantContent += parsed.token;
              }
            } catch {
              // Non-JSON data -- treat as raw token
              if (data && data !== "[DONE]") {
                assistantContent += data;
              }
            }

            // Advance to synthesizing once we have content
            if (assistantContent.length > 0) {
              setResearchPhase("synthesizing");
            }

            const sourceNames = collectedSources.map((s) => s.name);

            setMessages((prev) => {
              const existing = prev.find((m) => m.id === assistantId);
              if (existing) {
                return prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: assistantContent,
                        sources:
                          sourceNames.length > 0 ? sourceNames : m.sources,
                        sourceDetails:
                          collectedSources.length > 0
                            ? collectedSources
                            : m.sourceDetails,
                      }
                    : m,
                );
              }
              return [
                ...prev,
                {
                  id: assistantId,
                  role: "assistant" as const,
                  content: assistantContent,
                  sources: sourceNames.length > 0 ? sourceNames : undefined,
                  sourceDetails:
                    collectedSources.length > 0
                      ? collectedSources
                      : undefined,
                },
              ];
            });
          },
          abortRef.current.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          let errorContent: string;
          if (err instanceof ApiError) {
            switch (err.status) {
              case 401:
                errorContent = "Session expired. Please sign in again.";
                break;
              case 429:
                errorContent = "Rate limit reached. Please wait a moment.";
                break;
              case 500:
                errorContent = "Our servers are having trouble. Please try again.";
                break;
              default:
                errorContent = "Something went wrong. Please try again.";
            }
          } else if (err instanceof TypeError && (err as TypeError).message.includes("fetch")) {
            errorContent = "Connection lost. Check your internet.";
          } else {
            errorContent = "Something went wrong. Please try again.";
          }
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId);
            if (existing) return prev;
            return [
              ...prev,
              {
                id: assistantId,
                role: "assistant" as const,
                content: errorContent,
              },
            ];
          });
        }
      } finally {
        setStreaming(false);
        setResearchPhase("idle");

        // Parse finished response into cells
        if (assistantContent.trim()) {
          const newCells = parseResponseIntoCells(
            assistantContent,
            collectedSources.length > 0 ? collectedSources : undefined,
          );
          setCells((prev) => [...newCells, ...prev]);
        }
      }
    },
    [activeConvId, depth],
  );

  /* Handle follow-up suggestion click */
  const handleFollowUp = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#111827]">Explore</h1>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Explore
          </button>
        </div>
        <div className="flex rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-0.5">
          {(["quick", "standard", "deep"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                depth === d
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: sidebar + cells */}
        <div className="flex w-1/2 overflow-hidden border-r border-[#E5E7EB]">
          {/* Conversation sidebar */}
          <div
            className={cn(
              "flex flex-col border-r border-[#E5E7EB] bg-[#F9FAFB] transition-all",
              sidebarOpen
                ? "w-56 min-w-[14rem]"
                : "w-0 min-w-0 overflow-hidden",
            )}
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                History
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded p-0.5 text-[#9CA3AF] hover:text-[#6B7280]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                    activeConvId === conv.id
                      ? "bg-white text-[#111827]"
                      : "text-[#6B7280] hover:bg-white/60 hover:text-[#111827]",
                  )}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate text-xs">
                    {conv.title || "Untitled"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="hidden shrink-0 rounded p-0.5 text-[#9CA3AF] hover:text-red-500 group-hover:block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#9CA3AF]">
                  No conversations yet
                </div>
              )}
            </div>
          </div>

          {/* Results notebook */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-2.5">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded p-0.5 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
              <h2 className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
                Results Notebook
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cells.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-[#6B7280]">
                      Your intelligence results will appear here.
                    </p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      Each insight becomes a saveable cell you can export, share, or add to a board.
                    </p>
                  </div>

                  {/* Recent Activity section */}
                  {recentActivityLoading ? (
                    <div className="mt-8 flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading recent activity...
                    </div>
                  ) : recentActivity.length > 0 ? (
                    <div className="mt-8 w-full max-w-sm">
                      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                        Recent Activity
                      </h3>
                      <div className="flex flex-col gap-2">
                        {recentActivity.map((item) => (
                          <RecentActivityCard key={item.title} item={item} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {cells.map((cell) => (
                    <ResultCell key={cell.id} cell={cell} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Conversation */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="border-b border-[#E5E7EB] px-4 py-2.5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Conversation
            </h2>
          </div>
          <Conversation
            messages={messages}
            streaming={streaming}
            researchPhase={researchPhase}
            sourceCount={sourceCount}
            onFollowUp={handleFollowUp}
            className="flex-1"
          />
        </div>
      </div>

      {/* Bottom: Chat input */}
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
