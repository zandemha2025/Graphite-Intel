import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  useListOpenaiConversations,
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useListDocuments,
  getListDocumentsQueryKey,
  useListConversationDocuments,
  getListConversationDocumentsQueryKey,
  useLinkDocumentToConversation,
  useUnlinkDocumentFromConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Trash2, Loader2, Paperclip, X, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number | string;
  role: string;
  content: string;
};

function getSuggestedStarters(profile?: { companyName: string; industry: string; stage: string; competitors?: string; strategicPriorities?: string } | null): string[] {
  if (!profile) {
    return [
      "What are our biggest competitive threats this quarter?",
      "How should we think about expanding into a new market?",
      "Help me prepare for a board meeting on our growth strategy.",
      "What acquisition criteria should we use for our next M&A target?",
      "What metrics should we be tracking at our current stage?",
    ];
  }
  const starters: string[] = [
    `What are the biggest competitive threats facing ${profile.companyName} in the ${profile.industry} space right now?`,
    `How should ${profile.companyName} think about market expansion at the ${profile.stage} stage?`,
    `Help me structure a board presentation on our growth strategy as a ${profile.stage} company in ${profile.industry}.`,
  ];
  if (profile.competitors) {
    starters.push(`Analyze the competitive positioning of ${profile.companyName} vs. ${profile.competitors.split(",")[0].trim()}.`);
  } else {
    starters.push(`What acquisition criteria should ${profile.companyName} use for its next M&A target in ${profile.industry}?`);
  }
  if (profile.strategicPriorities) {
    starters.push(`How should we execute on this priority: "${profile.strategicPriorities.split(",")[0].trim()}"?`);
  } else {
    starters.push(`What are the key strategic priorities ${profile.companyName} should focus on over the next 12 months?`);
  }
  return starters;
}

function DocumentPicker({
  conversationId,
  onClose,
}: {
  conversationId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: allDocs = [] } = useListDocuments({ query: { queryKey: getListDocumentsQueryKey() } });
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
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListConversationDocumentsQueryKey(conversationId) });
          },
        },
      );
    } else {
      if (linkedIds.size >= 5) return;
      linkDoc.mutate(
        { id: conversationId, data: { documentId: docId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListConversationDocumentsQueryKey(conversationId) });
          },
        },
      );
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 shadow-lg z-10" style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--workspace-border)" }}>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--workspace-muted)" }}>Attach Documents</span>
        <button onClick={onClose} style={{ color: "var(--workspace-muted)" }} className="hover:opacity-70 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {readyDocs.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>No ready documents.</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>Upload from the Knowledge page.</p>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto divide-y" style={{ borderColor: "var(--workspace-border)" }}>
          {readyDocs.map((doc) => {
            const linked = linkedIds.has(doc.id);
            const atLimit = !linked && linkedIds.size >= 5;
            return (
              <button
                key={doc.id}
                onClick={() => handleToggle(doc.id)}
                disabled={atLimit}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${atLimit ? "opacity-40 cursor-not-allowed" : ""}`}
                style={{ background: linked ? "var(--workspace-muted-bg)" : "transparent", color: "var(--workspace-fg)" }}
              >
                <div className="w-3.5 h-3.5 border flex items-center justify-center shrink-0" style={{ borderColor: linked ? "var(--workspace-fg)" : "var(--workspace-border)" }}>
                  {linked && <span className="w-1.5 h-1.5" style={{ background: "var(--workspace-fg)" }} />}
                </div>
                <FileText className="w-3 h-3 shrink-0" style={{ color: "var(--workspace-muted)" }} />
                <span className="text-xs truncate">{doc.title}</span>
                <span className="text-[10px] uppercase ml-auto shrink-0" style={{ color: "var(--workspace-muted)" }}>{doc.fileType}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Chat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConversations } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() }
  });

  const { data: activeConversation } = useGetOpenaiConversation(
    activeConversationId as number,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number)
      }
    }
  );

  const { data: profile } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() }
  });

  const { data: linkedDocs = [] } = useListConversationDocuments(
    activeConversationId as number,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getListConversationDocumentsQueryKey(activeConversationId as number),
      },
    },
  );

  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, streamingContent]);

  const handleCreateNew = () => {
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setActiveConversationId(newConv.id);
          setShowDocPicker(false);
        }
      }
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          if (activeConversationId === id) {
            setActiveConversationId(null);
            setShowDocPicker(false);
          }
          toast({ title: "Conversation deleted" });
        }
      }
    );
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !activeConversationId || isStreaming) return;

    const userMessage = content.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    const tempId = Date.now().toString();
    queryClient.setQueryData(
      getGetOpenaiConversationQueryKey(activeConversationId),
      (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const typedOld = old as { messages: { id: string; role: string; content: string }[] };
        return { ...typedOld, messages: [...typedOld.messages, { id: tempId, role: "user", content: userMessage }] };
      }
    );

    try {
      const response = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
        credentials: "include",
      });

      const reader = response.body!.getReader();
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
          const data = JSON.parse(dataMatch[1]);

          if (event === "content") {
            setStreamingContent(prev => prev + data.delta);
          } else if (event === "complete") {
            queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeConversationId) });
            queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          }
        }
      }
    } catch (_err) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <div className="h-full flex overflow-hidden" style={{ borderTop: "1px solid var(--workspace-border)" }}>
      {/* Conversations sidebar — dark */}
      <div className="w-60 flex flex-col shrink-0" style={{ background: "#0D0C0B", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.20)", color: "rgba(232,228,220,0.75)" }}
            data-testid="btn-create-conversation"
            disabled={createConversation.isPending}
          >
            {createConversation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            New Conversation
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {loadingConversations ? (
              <div className="p-3 text-xs text-center" style={{ color: "rgba(232,228,220,0.30)" }}>Loading...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-3 text-xs text-center" style={{ color: "rgba(232,228,220,0.30)" }}>No conversations yet.</div>
            ) : (
              conversations?.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => { setActiveConversationId(conv.id); setShowDocPicker(false); }}
                  className="flex items-center justify-between p-2.5 cursor-pointer transition-colors group"
                  style={{
                    background: activeConversationId === conv.id ? "rgba(255,255,255,0.06)" : "transparent",
                    borderLeft: activeConversationId === conv.id ? "2px solid rgba(232,228,220,0.50)" : "2px solid transparent",
                    paddingLeft: "9px",
                    color: activeConversationId === conv.id ? "#E8E4DC" : "rgba(232,228,220,0.55)",
                  }}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="truncate pr-2 flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{conv.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(232,228,220,0.30)" }}>
                      {format(new Date(conv.createdAt), "MMM d")}
                    </p>
                  </div>
                  <button
                    className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: "rgba(232,228,220,0.35)" }}
                    onClick={(e) => handleDelete(conv.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area — light workspace */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--workspace-bg)" }}>
        {activeConversationId ? (
          <>
            {/* Context bar */}
            {(profile || linkedDocs.length > 0) && (
              <div className="border-b px-5 py-2 flex items-center gap-3 flex-wrap shrink-0" style={{ borderColor: "var(--workspace-border)", background: "var(--workspace-topbar)" }}>
                {profile && (
                  <>
                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>Context</span>
                    <span className="text-[10px]" style={{ color: "var(--workspace-fg)", opacity: 0.6 }}>
                      {profile.companyName} · {profile.industry} · {profile.stage}
                    </span>
                  </>
                )}
                {linkedDocs.length > 0 && (
                  <>
                    <span className="text-[9px] uppercase tracking-[0.2em] ml-2" style={{ color: "var(--workspace-muted)" }}>Docs</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {linkedDocs.map((d) => (
                        <span
                          key={d.id}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5"
                          style={{ background: "#FFFFFF", border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}
                        >
                          <FileText className="w-2.5 h-2.5" />
                          {d.title}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Title bar */}
            <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--workspace-border)" }}>
              <h2 className="font-serif text-xl font-light" style={{ color: "var(--workspace-fg)" }}>
                {activeConversation?.title || "New Conversation"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {activeConversation?.messages.map((msg: Message) => (
                <div key={msg.id} className={`flex max-w-3xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "user" ? (
                    <div
                      className="text-sm leading-relaxed max-w-[80%]"
                      style={{
                        background: "var(--workspace-muted-bg)",
                        border: "1px solid var(--workspace-border)",
                        padding: "12px 16px",
                        color: "var(--workspace-fg)",
                      }}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div
                      className="text-sm leading-relaxed max-w-[85%]"
                      style={{
                        background: "var(--workspace-card)",
                        border: "1px solid var(--workspace-border)",
                        padding: "16px 20px",
                        color: "var(--workspace-fg)",
                      }}
                    >
                      <div className="prose prose-sm max-w-none"
                        style={{
                          "--tw-prose-body": "var(--workspace-fg)",
                          "--tw-prose-headings": "var(--workspace-fg)",
                          "--tw-prose-lead": "var(--workspace-muted)",
                          "--tw-prose-links": "var(--workspace-fg)",
                          "--tw-prose-bold": "var(--workspace-fg)",
                          "--tw-prose-counters": "var(--workspace-muted)",
                          "--tw-prose-bullets": "var(--workspace-muted)",
                          "--tw-prose-hr": "var(--workspace-border)",
                          "--tw-prose-quotes": "var(--workspace-fg)",
                          "--tw-prose-quote-borders": "var(--workspace-border)",
                          "--tw-prose-captions": "var(--workspace-muted)",
                          "--tw-prose-code": "var(--workspace-fg)",
                          "--tw-prose-pre-code": "var(--workspace-fg)",
                          "--tw-prose-pre-bg": "var(--workspace-muted-bg)",
                          "--tw-prose-th-borders": "var(--workspace-border)",
                          "--tw-prose-td-borders": "var(--workspace-border)",
                        } as React.CSSProperties}
                      >
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex max-w-3xl mx-auto justify-start">
                  <div
                    className="text-sm leading-relaxed max-w-[85%]"
                    style={{
                      background: "var(--workspace-card)",
                      border: "1px solid var(--workspace-border)",
                      padding: "16px 20px",
                      color: "var(--workspace-fg)",
                    }}
                  >
                    {streamingContent ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 animate-bounce" style={{ background: "var(--workspace-muted)" }} />
                        <span className="w-1.5 h-1.5 animate-bounce delay-100" style={{ background: "var(--workspace-muted)" }} />
                        <span className="w-1.5 h-1.5 animate-bounce delay-200" style={{ background: "var(--workspace-muted)" }} />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="p-4 border-t shrink-0" style={{ borderColor: "var(--workspace-border)", background: "var(--workspace-bg)" }}>
              <div className="max-w-3xl mx-auto">
                {linkedDocs.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {linkedDocs.map((d) => (
                      <span
                        key={d.id}
                        className="flex items-center gap-1.5 text-[10px] px-2 py-1"
                        style={{ background: "var(--workspace-muted-bg)", border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}
                      >
                        <FileText className="w-2.5 h-2.5" />
                        {d.title}
                      </span>
                    ))}
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDocPicker((v) => !v)}
                      className="h-10 w-10 flex items-center justify-center transition-colors"
                      style={{
                        border: `1px solid ${showDocPicker || linkedDocs.length > 0 ? "var(--workspace-fg)" : "var(--workspace-border)"}`,
                        color: showDocPicker || linkedDocs.length > 0 ? "var(--workspace-fg)" : "var(--workspace-muted)",
                        background: "#FFFFFF",
                        position: "relative",
                      }}
                      title="Attach documents"
                      data-testid="btn-attach-documents"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {linkedDocs.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold" style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}>
                          {linkedDocs.length}
                        </span>
                      )}
                    </button>
                    {showDocPicker && activeConversationId && (
                      <DocumentPicker
                        conversationId={activeConversationId}
                        onClose={() => setShowDocPicker(false)}
                      />
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask a strategic question..."
                      className="w-full px-4 py-3 text-sm pr-12 focus:outline-none transition-colors"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid var(--workspace-border)",
                        color: "var(--workspace-fg)",
                      }}
                      disabled={isStreaming}
                      data-testid="input-chat"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
                      disabled={!inputValue.trim() || isStreaming}
                      data-testid="btn-send-message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-10">
            <div className="max-w-lg w-full">
              <h3 className="font-serif text-4xl font-light mb-3" style={{ color: "var(--workspace-fg)" }}>Strategic Advisor</h3>
              {profile ? (
                <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--workspace-muted)" }}>
                  Contextualized for {profile.companyName} — {profile.industry} · {profile.stage}. The advisor knows your business.
                </p>
              ) : (
                <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--workspace-muted)" }}>
                  Start a conversation to consult with the AI advisor, trained on global market data and executive decision-making frameworks.
                </p>
              )}

              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "var(--workspace-muted)" }}>Suggested Questions</p>
                <div className="space-y-1">
                  {getSuggestedStarters(profile).map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        handleCreateNew();
                        setTimeout(() => setInputValue(q), 500);
                      }}
                      className="block w-full text-left text-sm py-3 px-4 transition-colors"
                      style={{
                        color: "var(--workspace-fg)",
                        background: "#FFFFFF",
                        border: "1px solid var(--workspace-border)",
                        marginBottom: "6px",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--workspace-fg)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--workspace-border)")}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-2.5 text-xs uppercase tracking-widest font-medium transition-colors"
                style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
                disabled={createConversation.isPending}
                data-testid="btn-create-conversation-empty"
              >
                {createConversation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Begin Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
