import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api, apiPost, apiDelete, apiSSE, ApiError } from "@/lib/api";
import { ResultCell, type ResultCellData } from "@/components/explore/result-cell";
import { type Message, type Source } from "@/components/explore/conversation";
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
  Search,
  ArrowRight,
  Check,
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

/* ---------- Follow-up generation ---------- */

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const properNouns = text.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
  if (properNouns) {
    for (const pn of properNouns) {
      if (!topics.includes(pn) && topics.length < 3) topics.push(pn);
    }
  }
  const sentences = text.split(/[.!?]\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).slice(1);
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z]/g, "");
      if (
        clean.length > 3 &&
        clean[0] === clean[0]?.toUpperCase() &&
        clean[0] !== clean[0]?.toLowerCase() &&
        !topics.includes(clean) &&
        topics.length < 3
      ) {
        topics.push(clean);
      }
    }
  }
  return topics;
}

function generateFollowUps(content: string): string[] {
  const suggestions: string[] = [];
  const topics = extractTopics(content);
  const firstSentence = content.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence.length > 20) {
    const subject = firstSentence.slice(0, 60).replace(/[,;:].*/, "").trim();
    suggestions.push(`Tell me more about ${subject}`);
  }
  if (topics[0]) suggestions.push(`How does ${topics[0]} compare to alternatives?`);
  if (topics[1]) suggestions.push(`What are the key risks around ${topics[1]}?`);
  if (content.length > 500) {
    suggestions.push("Summarize the key takeaways in bullet points");
  } else if (content.length > 100) {
    suggestions.push("Go deeper on this analysis with more data");
  }
  if (suggestions.length < 2) suggestions.push("What are the strategic implications of this?");
  return suggestions.slice(0, 3);
}

/* ---------- Research Steps component ---------- */

interface ResearchStep {
  label: string;
  source?: string;
  done: boolean;
}

function getResearchSteps(phase: ResearchPhase, sourceCount: number): ResearchStep[] {
  return [
    { label: `Searching ${sourceCount > 0 ? sourceCount + " sources" : "sources"}`, done: phase === "analyzing" || phase === "synthesizing" },
    { label: "Analyzing data", done: phase === "synthesizing" },
    { label: "Synthesizing insights", done: false },
  ];
}

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
  const [collectedSources, setCollectedSources] = useState<Source[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [liveResearchSteps, setLiveResearchSteps] = useState<ResearchStep[]>([]);
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      setCollectedSources([]);
      setFollowUps([]);
      setLiveResearchSteps([]);
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
        // Generate follow-ups from last assistant message
        const lastAssistant = msgs.filter(m => m.role === "assistant").pop();
        if (lastAssistant?.content) {
          setFollowUps(generateFollowUps(lastAssistant.content));
        }
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
      setCollectedSources([]);
      setFollowUps([]);
      setLiveResearchSteps([]);
    } catch {
      const localId = `local-${Date.now()}`;
      const localConv: ApiConversation = { id: localId, title: "New Explore" };
      setConversations((prev) => [localConv, ...prev]);
      setActiveConvId(localId);
      setMessages([]);
      setCells([]);
      setCollectedSources([]);
      setFollowUps([]);
      setLiveResearchSteps([]);
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
        setCollectedSources([]);
        setFollowUps([]);
        setLiveResearchSteps([]);
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
      setCollectedSources([]);
      setFollowUps([]);
      setLiveResearchSteps([]);

      let assistantContent = "";
      let localSources: Source[] = [];
      const assistantId = `a-${Date.now()}`;

      abortRef.current = new AbortController();

      try {
        await apiSSE(
          `/openai/conversations/${convId}/messages`,
          { content, depth },
          (event, data) => {
            if (event === "step") {
              try {
                const parsed = JSON.parse(data);
                setLiveResearchSteps(prev => [...prev, { label: parsed.label, source: parsed.source, done: false }]);
              } catch {
                // ignore
              }
              return;
            }

            if (event === "step_complete") {
              try {
                const parsed = JSON.parse(data);
                setLiveResearchSteps(prev => prev.map(s =>
                  (parsed.source && s.source === parsed.source) || s.label.includes(parsed.label || "")
                    ? { ...s, done: true }
                    : s
                ));
                if (parsed.sources) {
                  // Classification result -- which sources were selected
                }
              } catch {
                // ignore
              }
              return;
            }

            if (event === "complete") {
              setLiveResearchSteps(prev => prev.map(s => ({ ...s, done: true })));
              setStreaming(false);
              setResearchPhase("idle");
              return;
            }

            if (event === "sources") {
              try {
                const parsed = JSON.parse(data);
                const sourceList = parsed.sources || (Array.isArray(parsed) ? parsed : []);
                localSources = sourceList.map((s: Source | string) =>
                  typeof s === "string"
                    ? { name: s, url: "#", domain: s.toLowerCase().replace(/\s+/g, "") + ".com" }
                    : {
                        name: (s as Source).name,
                        url: (s as Source).url || "#",
                        domain: (s as Source).domain || (s as Source).name.toLowerCase().replace(/\s+/g, "") + ".com",
                        type: (s as Source).type || undefined,
                      },
                );
                setSourceCount(localSources.length);
                setCollectedSources(localSources);
                setResearchPhase("analyzing");
              } catch {
                // ignore
              }
              return;
            }

            if (event === "done") {
              return;
            }

            if (event === "error") {
              try {
                const parsed = JSON.parse(data);
                const errorMsg = parsed.error || parsed.message || "An error occurred";
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: `Something went wrong: ${errorMsg}\n\nThis may be due to API configuration. Please check your intelligence data source settings in Integrations.`,
                  },
                ]);
              } catch {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant" as const,
                    content: "Something went wrong. Please try again.",
                  },
                ]);
              }
              setStreaming(false);
              setResearchPhase("idle");
              return;
            }

            // Handle token events
            try {
              const parsed = JSON.parse(data);
              if (typeof parsed.delta === "string") {
                assistantContent += parsed.delta;
              } else if (typeof parsed.content === "string") {
                assistantContent += parsed.content;
              } else if (typeof parsed.token === "string") {
                assistantContent += parsed.token;
              } else if (parsed.choices?.[0]?.delta?.content) {
                assistantContent += parsed.choices[0].delta.content;
              }
            } catch {
              if (data && data !== "[DONE]") {
                assistantContent += data;
              }
            }

            if (assistantContent.length > 0) {
              setResearchPhase("synthesizing");
            }

            const sourceNames = localSources.map((s) => s.name);

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
                          localSources.length > 0
                            ? localSources
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
                    localSources.length > 0
                      ? localSources
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
            localSources.length > 0 ? localSources : undefined,
          );
          setCells((prev) => [...newCells, ...prev]);
          setFollowUps(generateFollowUps(assistantContent));
        }
      }
    },
    [activeConvId, depth],
  );

  /* Handle search submit */
  const handleSearchSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || streaming) return;
    handleSend(trimmed);
    setInputValue("");
  }, [inputValue, streaming, handleSend]);

  /* Handle follow-up suggestion click */
  const handleFollowUp = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  const researchSteps = liveResearchSteps.length > 0
    ? liveResearchSteps
    : getResearchSteps(researchPhase, sourceCount);

  /* Classify source as 1P */
  function is1P(source: Source): boolean {
    const lower = source.name.toLowerCase();
    return (
      lower.includes("salesforce") ||
      lower.includes("hubspot") ||
      lower.includes("gong") ||
      lower.includes("your ") ||
      lower.includes("google drive") ||
      lower.includes("crm") ||
      lower.includes("internal")
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: History sidebar */}
      <div
        className={cn(
          "flex flex-col border-r border-[#E5E7EB] bg-[#F8F9FA] transition-all",
          sidebarOpen
            ? "w-[280px] min-w-[280px]"
            : "w-0 min-w-0 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
            History
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewConversation}
              className="rounded p-1 text-[#6B7280] hover:bg-white hover:text-[#4F46E5]"
              title="New Explore"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded p-1 text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                activeConvId === conv.id
                  ? "bg-white text-[#111827]"
                  : "text-[#6B7280] hover:bg-white/60 hover:text-[#111827]",
              )}
              onClick={() => setActiveConvId(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate text-[13px]">
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
            <div className="px-4 py-6 text-center text-xs text-[#9CA3AF]">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Results Notebook (primary) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search bar at TOP */}
        <div className="border-b border-[#E5E7EB] bg-white px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 focus-within:border-[#4F46E5] focus-within:ring-1 focus-within:ring-[#4F46E5]/20">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded p-0.5 text-[#9CA3AF] hover:text-[#6B7280]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <Search className="h-5 w-5 text-[#9CA3AF]" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-[15px] text-[#111827] outline-none placeholder:text-[#9CA3AF]"
              placeholder="What's happening with our enterprise pipeline?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              disabled={streaming}
            />
            <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
              {(["quick", "standard", "deep"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={cn(
                    "rounded px-2 py-0.5 capitalize transition-colors",
                    depth === d
                      ? "bg-[#4F46E5] text-white"
                      : "hover:text-[#6B7280]",
                  )}
                >
                  {d === "quick" ? "Quick" : d === "standard" ? "Standard" : "Deep"}
                </button>
              ))}
            </div>
            <button
              onClick={handleSearchSubmit}
              disabled={!inputValue.trim() || streaming}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                inputValue.trim() && !streaming
                  ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                  : "bg-[#E5E7EB] text-[#9CA3AF]",
              )}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cells.length === 0 && !streaming ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-[#6B7280] mb-2">
                Your intelligence results will appear here
              </p>
              <p className="text-[13px] text-[#9CA3AF] mb-6">
                Each insight becomes a saveable cell you can export, share, or add to a board.
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {[
                  "What's our customer acquisition cost by channel?",
                  "Analyze competitor marketing spend vs ours",
                  "Which accounts are at risk of churning?",
                  "What marketing channels have the best ROI?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleFollowUp(s)}
                    className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] transition-colors hover:border-[#4F46E5] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Recent Activity */}
              {!recentActivityLoading && recentActivity.length > 0 && (
                <div className="mt-10 max-w-sm mx-auto">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Recent Activity
                  </h3>
                  <div className="flex flex-col gap-2">
                    {recentActivity.map((item) => {
                      const icons = { report: FileText, notebook: BarChart3, board: Layout };
                      const Icon = icons[item.type];
                      return (
                        <div
                          key={item.title}
                          className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 transition-colors hover:border-[#D1D5DB]"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF]">
                            <Icon className="h-4 w-4 text-[#4F46E5]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#111827]">{item.title}</div>
                            <div className="text-xs text-[#9CA3AF]">{item.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-3xl">
              {/* Streaming indicator */}
              {streaming && researchPhase !== "idle" && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 mb-2">
                  <div className="flex items-center gap-4 text-sm">
                    {researchSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {step.done ? (
                          <Check className="h-4 w-4 text-[#059669]" />
                        ) : (
                          <Loader2 className="h-4 w-4 text-[#4F46E5] animate-spin" />
                        )}
                        <span className={step.done ? "text-[#6B7280]" : "text-[#111827]"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cells.map((cell) => (
                <ResultCell key={cell.id} cell={cell} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Research Panel */}
      <aside className="w-[280px] min-w-[280px] border-l border-[#E5E7EB] bg-[#F8F9FA] overflow-y-auto">
        {/* Research Steps */}
        {streaming && researchPhase !== "idle" && (
          <div className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Research Steps
            </h3>
            <div className="space-y-2">
              {researchSteps.map((step, idx) => {
                const isLatestActive = !step.done && researchSteps.slice(idx + 1).every(s => s.done || s === step);
                const isActiveStep = !step.done && (idx === researchSteps.length - 1 || researchSteps.findLastIndex(s => !s.done) === idx);
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {step.done ? (
                      <Check className="h-4 w-4 text-[#059669]" />
                    ) : isActiveStep ? (
                      <Loader2 className="h-4 w-4 text-[#4F46E5] animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-[#D1D5DB]" />
                    )}
                    <span className={step.done ? "text-[#6B7280]" : isActiveStep ? "text-[#111827]" : "text-[#9CA3AF]"}>
                      {step.label}
                    </span>
                    {step.source && (
                      <span className="text-[10px] text-[#9CA3AF] ml-auto">{step.source}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sources */}
        {collectedSources.length > 0 && (
          <div className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Sources ({collectedSources.length})
            </h3>
            <div className="space-y-1">
              {collectedSources.map((s, i) => (
                <a
                  key={`${s.name}-${i}`}
                  href={s.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm py-1.5 hover:bg-white rounded px-2 -mx-2 transition-colors"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#4F46E5] text-white text-[10px] font-medium">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#111827] text-sm truncate">{s.name}</div>
                    {s.domain && (
                      <div className="text-[#9CA3AF] text-xs truncate">{s.domain}</div>
                    )}
                  </div>
                  {(s.type === "1p" || (!s.type && is1P(s))) && (
                    <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] px-1.5 py-0.5 rounded font-medium shrink-0">
                      1P
                    </span>
                  )}
                  {s.type === "3p" && (
                    <span className="text-[10px] bg-[#F3F4F6] text-[#6B7280] px-1.5 py-0.5 rounded font-medium shrink-0">
                      3P
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <div className="p-4 border-b border-[#E5E7EB]">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Related Questions
            </h3>
            <div className="space-y-1">
              {followUps.map((q) => (
                <button
                  key={q}
                  onClick={() => handleFollowUp(q)}
                  className="w-full text-left text-sm text-[#4F46E5] hover:bg-white rounded px-2 py-2 -mx-2 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for research panel */}
        {collectedSources.length === 0 && followUps.length === 0 && !streaming && (
          <div className="p-4">
            <p className="text-[13px] text-[#9CA3AF]">
              Sources, research steps, and related questions will appear here as you explore.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
