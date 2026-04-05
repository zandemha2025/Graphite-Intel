import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
  useListConversationDocuments,
  getListConversationDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { SessionHistory } from "@/components/explore/SessionHistory";
import { ExploreInputBar } from "@/components/explore/explore-input-bar";
import { InsightCellFallback } from "@/components/explore/InsightCellFallback";
import { DocumentPicker } from "@/components/explore/DocumentPicker";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import type { CellData } from "@/components/charts";
import type { ResearchDepth } from "@/components/explore/DepthToggle";
import { FileText } from "lucide-react";

/* ---------- types ---------- */

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

/** A paired Q&A group for rendering as one InsightCell */
type InsightPair = {
  question: string;
  answer: Message | null;
};

/* ---------- helpers ---------- */

function parseMessageToCells(content: string, messageId: string): CellData[] {
  const cells: CellData[] = [];
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  let lastIndex = 0;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore) {
      cells.push({ id: `${messageId}-md-${lastIndex}`, type: "markdown", content: textBefore });
    }
    try {
      const parsed = JSON.parse(match[1]) as CellData;
      if (["chart", "table", "stat"].includes(parsed.type)) {
        cells.push({ ...parsed, id: `${messageId}-${match.index}` });
      } else {
        cells.push({ id: `${messageId}-code-${match.index}`, type: "markdown", content: match[0] });
      }
    } catch {
      cells.push({ id: `${messageId}-code-${match.index}`, type: "markdown", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex).trim();
  if (remaining) {
    cells.push({ id: `${messageId}-md-end`, type: "markdown", content: remaining });
  }

  return cells.length > 0 ? cells : [{ id: messageId, type: "markdown", content }];
}

/** Group messages into Q&A pairs: each user message paired with the next assistant message */
function groupIntoPairs(messages: Message[]): InsightPair[] {
  const pairs: InsightPair[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      const next = messages[i + 1];
      pairs.push({
        question: msg.content,
        answer: next?.role === "assistant" ? next : null,
      });
      if (next?.role === "assistant") i++;
    }
  }
  return pairs;
}

/* ---------- Notebook (active session) ---------- */

function NotebookView({
  messages,
  isStreaming,
  streamingContent,
  streamingSources,
  inputValue,
  onInputChange,
  onSend,
  linkedDocs,
  showDocPicker,
  onToggleDocPicker,
  docPickerSlot,
}: {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  streamingSources: SourceChunk[] | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: (content: string, depth: ResearchDepth) => void;
  linkedDocs: { id: number; title: string }[];
  showDocPicker: boolean;
  onToggleDocPicker: () => void;
  docPickerSlot?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pairs = groupIntoPairs(messages);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const lastPair = pairs[pairs.length - 1];
  const streamingPairExists = lastPair && !lastPair.answer && isStreaming;

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ background: "var(--explore-bg, #F9FAFB)" }}
    >
      {/* Linked docs bar */}
      {linkedDocs.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-5 py-2 flex-wrap shrink-0"
          style={{ borderBottom: "1px solid var(--explore-border, #E5E7EB)" }}
        >
          {linkedDocs.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
              style={{
                background: "var(--explore-accent-light, #EEF2FF)",
                color: "var(--explore-accent, #4F46E5)",
                border: "1px solid #C7D2FE",
              }}
            >
              <FileText className="w-2.5 h-2.5" />
              {d.title}
            </span>
          ))}
        </div>
      )}

      {/* Scrollable notebook area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {pairs.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: "var(--explore-accent-light, #EEF2FF)" }}
              >
                <span
                  className="text-xl"
                  style={{ color: "var(--explore-accent, #4F46E5)" }}
                >
                  ?
                </span>
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "var(--explore-text, #374151)" }}
              >
                Ask your first question
              </p>
              <p
                className="text-xs max-w-xs"
                style={{ color: "var(--explore-muted, #9CA3AF)" }}
              >
                Insights will render as structured cells below.
              </p>
            </div>
          )}

          {pairs.map((pair, idx) => {
            if (!pair.answer && !streamingPairExists) return null;

            const answer = pair.answer;
            const isThisStreaming =
              !answer && streamingPairExists && idx === pairs.length - 1;

            const answerContent = isThisStreaming
              ? streamingContent
              : answer?.content ?? "";
            const answerCells = answerContent
              ? parseMessageToCells(
                  answerContent,
                  String(answer?.id ?? `streaming-${idx}`)
                )
              : [];
            const sources = isThisStreaming ? streamingSources : answer?.sources;

            return (
              <InsightCellFallback
                key={answer?.id ?? `streaming-${idx}`}
                question={pair.question}
                answerContent={answerContent}
                answerCells={answerCells}
                sources={sources}
                isStreaming={isThisStreaming}
                index={idx}
              />
            );
          })}

          {isStreaming && !streamingPairExists && (
            <div
              className="rounded-xl p-5 flex items-center gap-3"
              style={{
                background: "var(--explore-card-bg, #FFFFFF)",
                border: "1px solid var(--explore-border, #E5E7EB)",
              }}
            >
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: "#A5B4FC",
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--explore-muted, #9CA3AF)" }}
              >
                Analyzing your data...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom input bar */}
      <ExploreInputBar
        inputValue={inputValue}
        onInputChange={onInputChange}
        onSend={onSend}
        isStreaming={isStreaming}
        linkedDocsCount={linkedDocs.length}
        sourceCount={linkedDocs.length}
        onToggleDocPicker={onToggleDocPicker}
        showDocPicker={showDocPicker}
        docPickerSlot={docPickerSlot}
      />
    </div>
  );
}

/* ---------- Main Explore component ---------- */

export function Explore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSources, setStreamingSources] = useState<SourceChunk[] | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const { data: conversations = [] } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() },
  });

  const { data: activeConversation } = useGetOpenaiConversation(
    activeConversationId as number,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number),
      },
    }
  );

  const { data: linkedDocs = [] } = useListConversationDocuments(
    activeConversationId as number,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getListConversationDocumentsQueryKey(activeConversationId as number),
      },
    }
  );

  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const messages = (activeConversation?.messages as unknown as Message[]) ?? [];

  const handleCreate = useCallback(
    (initialMessage?: string) => {
      if (initialMessage) setPendingMessage(initialMessage);
      createConversation.mutate(
        { data: { title: "New Session" } },
        {
          onSuccess: (newConv) => {
            queryClient.invalidateQueries({
              queryKey: getListOpenaiConversationsQueryKey(),
            });
            setActiveConversationId(newConv.id);
            setShowDocPicker(false);
          },
        }
      );
    },
    [createConversation, queryClient]
  );

  const handleSelectSession = useCallback((id: number) => {
    setActiveConversationId(id);
    setShowDocPicker(false);
  }, []);

  const handleDelete = useCallback(
    (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteConversation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListOpenaiConversationsQueryKey(),
            });
            if (activeConversationId === id) setActiveConversationId(null);
            toast({ title: "Session deleted" });
          },
        }
      );
    },
    [deleteConversation, queryClient, activeConversationId, toast]
  );

  const handleSend = useCallback(
    async (content: string, depth: ResearchDepth) => {
      if (
        !content ||
        typeof content !== "string" ||
        !content.trim() ||
        !activeConversationId ||
        isStreaming
      )
        return;

      setInputValue("");
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingSources(null);

      const tempId = Date.now().toString();
      queryClient.setQueryData(
        getGetOpenaiConversationQueryKey(activeConversationId),
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const typedOld = old as { messages: Message[] };
          return {
            ...typedOld,
            messages: [
              ...typedOld.messages,
              { id: tempId, role: "user", content },
            ],
          };
        }
      );

      try {
        const response = await fetch(
          `/api/openai/conversations/${activeConversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, research_depth: depth }),
            credentials: "include",
          }
        );

        const reader = response.body!.getReader();
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
            } else if (event === "sources") {
              setStreamingSources(data.sources);
            } else if (event === "complete") {
              queryClient.invalidateQueries({
                queryKey: getGetOpenaiConversationQueryKey(activeConversationId),
              });
              queryClient.invalidateQueries({
                queryKey: getListOpenaiConversationsQueryKey(),
              });
            }
          }
        }
      } catch {
        toast({ title: "Failed to send message", variant: "destructive" });
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        setStreamingSources(null);
      }
    },
    [activeConversationId, isStreaming, queryClient, toast]
  );

  // Auto-send pending suggestion after conversation creation
  useEffect(() => {
    if (pendingMessage && activeConversationId && !isStreaming) {
      const msg = pendingMessage;
      setPendingMessage(null);
      handleSend(msg, "standard" as ResearchDepth);
    }
  }, [pendingMessage, activeConversationId, isStreaming, handleSend]);

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ borderTop: "1px solid var(--explore-border, #E5E7EB)" }}
    >
      <SessionHistory
        sessions={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectSession}
        onDelete={handleDelete}
        onCreate={handleCreate}
        isCreating={createConversation.isPending}
      />

      {activeConversationId ? (
        <NotebookView
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          streamingSources={streamingSources}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          linkedDocs={linkedDocs}
          showDocPicker={showDocPicker}
          onToggleDocPicker={() => setShowDocPicker((v) => !v)}
          docPickerSlot={
            showDocPicker && activeConversationId ? (
              <DocumentPicker
                conversationId={activeConversationId}
                onClose={() => setShowDocPicker(false)}
              />
            ) : undefined
          }
        />
      ) : (
        <ExploreEmptyState
          hasConversations={conversations.length > 0}
          onCreate={handleCreate}
          isCreating={createConversation.isPending}
        />
      )}
    </div>
  );
}
