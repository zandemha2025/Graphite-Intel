import { useState, useCallback, useEffect } from "react";
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
  useLinkDocumentToConversation,
  useUnlinkDocumentFromConversation,
  useListDocuments,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { SessionHistory } from "@/components/explore/SessionHistory";
import { ResultsPanel } from "@/components/explore/ResultsPanel";
import { ConversationPanel } from "@/components/explore/ConversationPanel";
import type { CellData } from "@/components/charts";
import type { ResearchDepth } from "@/components/explore/DepthToggle";
import { X, FileText } from "lucide-react";

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

function parseMessageToCells(content: string, messageId: string): CellData[] {
  const cells: CellData[] = [];
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  let lastIndex = 0;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore) {
      cells.push({
        id: `${messageId}-md-${lastIndex}`,
        type: "markdown",
        content: textBefore,
      });
    }
    try {
      const parsed = JSON.parse(match[1]) as CellData;
      if (["chart", "table", "stat"].includes(parsed.type)) {
        cells.push({ ...parsed, id: `${messageId}-${match.index}` });
      } else {
        cells.push({
          id: `${messageId}-code-${match.index}`,
          type: "markdown",
          content: match[0],
        });
      }
    } catch {
      cells.push({
        id: `${messageId}-code-${match.index}`,
        type: "markdown",
        content: match[0],
      });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex).trim();
  if (remaining) {
    cells.push({ id: `${messageId}-md-end`, type: "markdown", content: remaining });
  }

  return cells.length > 0 ? cells : [{ id: messageId, type: "markdown", content }];
}

function DocumentPicker({
  conversationId,
  onClose,
}: {
  conversationId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: allDocs = [] } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });
  const { data: linkedDocs = [] } = useListConversationDocuments(conversationId, {
    query: { queryKey: getListConversationDocumentsQueryKey(conversationId) },
  });
  const linkDoc = useLinkDocumentToConversation();
  const unlinkDoc = useUnlinkDocumentFromConversation();
  const linkedIds = new Set(linkedDocs.map((d) => d.id));
  const readyDocs = allDocs.filter((d) => d.status === "ready");

  const handleToggle = (docId: number) => {
    if (linkedIds.has(docId)) {
      unlinkDoc.mutate(
        { id: conversationId, data: { documentId: docId } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getListConversationDocumentsQueryKey(conversationId),
            }),
        }
      );
    } else {
      if (linkedIds.size >= 5) return;
      linkDoc.mutate(
        { id: conversationId, data: { documentId: docId } },
        {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getListConversationDocumentsQueryKey(conversationId),
            }),
        }
      );
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-72 rounded-lg shadow-lg z-10"
      style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "#9CA3AF" }}
        >
          Attach Documents
        </span>
        <button
          onClick={onClose}
          className="transition-colors"
          style={{ color: "#9CA3AF" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {readyDocs.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            No ready documents.
          </p>
          <p className="text-[10px] mt-1" style={{ color: "#9CA3AF", opacity: 0.7 }}>
            Upload from the Knowledge page.
          </p>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {readyDocs.map((doc) => {
            const linked = linkedIds.has(doc.id);
            const atLimit = !linked && linkedIds.size >= 5;
            return (
              <button
                key={doc.id}
                onClick={() => handleToggle(doc.id)}
                disabled={atLimit}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  atLimit ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
                style={{
                  borderBottom: "1px solid #F3F4F6",
                  background: linked ? "#EEF2FF" : "transparent",
                }}
              >
                <div
                  className="w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0"
                  style={{ borderColor: linked ? "#4F46E5" : "#D1D5DB" }}
                >
                  {linked && (
                    <span
                      className="w-1.5 h-1.5 rounded-sm"
                      style={{ background: "#4F46E5" }}
                    />
                  )}
                </div>
                <FileText className="w-3 h-3 shrink-0" style={{ color: "#9CA3AF" }} />
                <span className="text-xs truncate" style={{ color: "#374151" }}>
                  {doc.title}
                </span>
                <span
                  className="text-[10px] uppercase ml-auto shrink-0"
                  style={{ color: "#9CA3AF" }}
                >
                  {doc.fileType}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Explore() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSources, setStreamingSources] = useState<SourceChunk[] | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [cells, setCells] = useState<CellData[]>([]);

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

  // Rebuild cells whenever conversation messages update
  useEffect(() => {
    if (!activeConversation?.messages) {
      setCells([]);
      return;
    }
    const msgs = (activeConversation.messages as unknown as Message[]).filter(
      (m) => m.role === "assistant"
    );
    const allCells = msgs.flatMap((m, idx) =>
      parseMessageToCells(m.content, String(m.id ?? `msg-${idx}`))
    );
    setCells(allCells);
  }, [activeConversation?.messages]);

  const handleCreate = useCallback(() => {
    createConversation.mutate(
      { data: { title: "New Session" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setActiveConversationId(newConv.id);
          setShowDocPicker(false);
        },
      }
    );
  }, [createConversation, queryClient]);

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
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
            if (activeConversationId === id) {
              setActiveConversationId(null);
            }
            toast({ title: "Session deleted" });
          },
        }
      );
    },
    [deleteConversation, queryClient, activeConversationId, toast]
  );

  const handleSend = useCallback(
    async (content: string, depth: ResearchDepth) => {
      if (!content.trim() || !activeConversationId || isStreaming) return;

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
            messages: [...typedOld.messages, { id: tempId, role: "user", content }],
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

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ borderTop: "1px solid #E5E7EB" }}
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
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={55} minSize={30}>
            <ResultsPanel cells={cells} isStreaming={isStreaming} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="hover:bg-indigo-100 transition-colors"
            style={{ background: "#E5E7EB" } as React.CSSProperties}
          />
          <ResizablePanel defaultSize={45} minSize={25}>
            <ConversationPanel
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
                showDocPicker ? (
                  <DocumentPicker
                    conversationId={activeConversationId}
                    onClose={() => setShowDocPicker(false)}
                  />
                ) : undefined
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#EEF2FF" }}
          >
            <span className="text-3xl" style={{ color: "#4F46E5" }}>✦</span>
          </div>
          <h3 className="text-2xl font-semibold mb-2" style={{ color: "#111827" }}>
            Explore
          </h3>
          <p className="text-sm max-w-sm mb-6" style={{ color: "#6B7280" }}>
            Start a new session to ask questions and see structured insights rendered in
            the Results Notebook.
          </p>
          <button
            onClick={handleCreate}
            disabled={createConversation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "#4F46E5", color: "#FFFFFF" }}
            data-testid="btn-create-session"
          >
            {createConversation.isPending ? "Creating..." : "New Session"}
          </button>
        </div>
      )}
    </div>
  );
}
