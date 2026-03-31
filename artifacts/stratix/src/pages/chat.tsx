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
import { Send, Plus, Trash2, Loader2, Bot, User, Paperclip, X, FileText, ChevronDown } from "lucide-react";
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
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#141311] border border-white/15 shadow-lg z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-[10px] uppercase tracking-widest text-[#E8E4DC]/50">Attach Documents</span>
        <button onClick={onClose} className="text-[#E8E4DC]/30 hover:text-[#E8E4DC]/70">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {readyDocs.length === 0 ? (
        <div className="px-4 py-5 text-center">
          <p className="text-xs text-[#E8E4DC]/35">No ready documents.</p>
          <p className="text-[10px] text-[#E8E4DC]/25 mt-1">Upload from the Knowledge page.</p>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto divide-y divide-white/6">
          {readyDocs.map((doc) => {
            const linked = linkedIds.has(doc.id);
            const atLimit = !linked && linkedIds.size >= 5;
            return (
              <button
                key={doc.id}
                onClick={() => handleToggle(doc.id)}
                disabled={atLimit}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  linked ? "bg-white/5 text-[#E8E4DC]/90" : "text-[#E8E4DC]/55 hover:bg-white/3 hover:text-[#E8E4DC]/80"
                } ${atLimit ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${linked ? "border-[#E8E4DC]/60 bg-[#E8E4DC]/10" : "border-white/25"}`}>
                  {linked && <span className="w-1.5 h-1.5 bg-[#E8E4DC]/70" />}
                </div>
                <FileText className="w-3 h-3 shrink-0 text-[#E8E4DC]/30" />
                <span className="text-xs truncate">{doc.title}</span>
                <span className="text-[10px] text-[#E8E4DC]/25 uppercase ml-auto shrink-0">{doc.fileType}</span>
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
      { data: { title: "New Engagement" } },
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
          toast({ title: "Engagement deleted" });
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
    <div className="h-[calc(100vh-8.5rem)] flex border border-white/10 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/8 flex flex-col bg-[#0D0C0B]">
        <div className="p-3 border-b border-white/8">
          <button
            onClick={handleCreateNew}
            className="w-full flex items-center justify-center gap-2 border border-white/15 py-2 text-xs uppercase tracking-widest text-[#E8E4DC]/70 hover:text-[#E8E4DC] hover:border-white/30 transition-colors"
            data-testid="btn-create-conversation"
            disabled={createConversation.isPending}
          >
            {createConversation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            New Engagement
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {loadingConversations ? (
              <div className="p-3 text-xs text-[#E8E4DC]/30 text-center">Loading...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-3 text-xs text-[#E8E4DC]/30 text-center">No engagements yet.</div>
            ) : (
              conversations?.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => { setActiveConversationId(conv.id); setShowDocPicker(false); }}
                  className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors group ${
                    activeConversationId === conv.id
                      ? 'bg-white/6 text-[#E8E4DC] border-l-2 border-[#E8E4DC]/50 pl-[9px]'
                      : 'text-[#E8E4DC]/55 hover:bg-white/3 border-l-2 border-transparent pl-[9px] hover:text-[#E8E4DC]/80'
                  }`}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="truncate pr-2 flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{conv.title}</p>
                    <p className="text-[10px] text-[#E8E4DC]/30 mt-0.5">
                      {format(new Date(conv.createdAt), "MMM d")}
                    </p>
                  </div>
                  <button
                    className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#E8E4DC]/30 hover:text-[#E8E4DC]/70 transition-opacity shrink-0"
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0D0C0B]">
        {activeConversationId ? (
          <>
            {/* Context bar */}
            {(profile || linkedDocs.length > 0) && (
              <div className="border-b border-white/8 px-5 py-2 flex items-center gap-3 bg-white/2 flex-wrap">
                {profile && (
                  <>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/25">Context</span>
                    <span className="text-[10px] text-[#E8E4DC]/45">
                      {profile.companyName} · {profile.industry} · {profile.stage}
                    </span>
                  </>
                )}
                {linkedDocs.length > 0 && (
                  <>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#E8E4DC]/25 ml-2">Docs</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {linkedDocs.map((d) => (
                        <span
                          key={d.id}
                          className="flex items-center gap-1 text-[10px] bg-white/6 border border-white/10 px-2 py-0.5 text-[#E8E4DC]/60"
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
            <div className="px-6 py-4 border-b border-white/8">
              <h2 className="font-serif text-xl font-light text-[#E8E4DC]">
                {activeConversation?.title || "New Engagement"}
              </h2>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8E4DC]/30 mt-0.5">Strategic Engagement</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {activeConversation?.messages.map((msg: Message) => (
                <div key={msg.id} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#E8E4DC]/60" />
                    </div>
                  )}

                  <div className={`text-sm leading-relaxed max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-white/6 border border-white/12 px-4 py-3 text-[#E8E4DC]/85"
                      : "px-0 py-0 text-[#E8E4DC]/80 prose prose-sm max-w-none"
                  }`}
                  style={{ borderRadius: 0 }}
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm prose-invert prose-headings:font-serif prose-headings:font-light prose-headings:text-[#E8E4DC]/90 prose-p:text-[#E8E4DC]/70 prose-strong:text-[#E8E4DC]/85 prose-li:text-[#E8E4DC]/70 max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 border border-white/12 flex items-center justify-center shrink-0 mt-0.5 bg-white/4">
                      <User className="w-3 h-3 text-[#E8E4DC]/50" />
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-4 max-w-3xl mx-auto justify-start">
                  <div className="w-7 h-7 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#E8E4DC]/60" />
                  </div>
                  <div className="text-sm leading-relaxed text-[#E8E4DC]/75 max-w-[85%]">
                    {streamingContent ? (
                      <div className="prose prose-sm prose-invert prose-headings:font-serif prose-headings:font-light prose-headings:text-[#E8E4DC]/90 prose-p:text-[#E8E4DC]/70 max-w-none">
                        <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 bg-[#E8E4DC]/30 animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-[#E8E4DC]/30 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 bg-[#E8E4DC]/30 animate-bounce delay-200" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0D0C0B] border-t border-white/8">
              <div className="max-w-3xl mx-auto">
                {linkedDocs.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {linkedDocs.map((d) => (
                      <span
                        key={d.id}
                        className="flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2 py-1 text-[#E8E4DC]/55"
                      >
                        <FileText className="w-2.5 h-2.5 text-[#E8E4DC]/35" />
                        {d.title}
                      </span>
                    ))}
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="relative flex items-center">
                  <div className="relative mr-2">
                    <button
                      type="button"
                      onClick={() => setShowDocPicker((v) => !v)}
                      className={`h-10 w-10 flex items-center justify-center border transition-colors ${
                        showDocPicker || linkedDocs.length > 0
                          ? "border-white/30 text-[#E8E4DC]/70 bg-white/5"
                          : "border-white/12 text-[#E8E4DC]/30 hover:text-[#E8E4DC]/60 hover:border-white/25"
                      }`}
                      title="Attach documents"
                      data-testid="btn-attach-documents"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      {linkedDocs.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E8E4DC] text-[#0D0C0B] text-[8px] flex items-center justify-center font-bold">
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
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask a strategic question..."
                    className="flex-1 bg-white/4 border border-white/12 px-4 py-3 text-sm text-[#E8E4DC] placeholder:text-[#E8E4DC]/25 focus:outline-none focus:border-white/25 transition-colors pr-12"
                    disabled={isStreaming}
                    data-testid="input-chat"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 h-8 w-8 flex items-center justify-center bg-[#E8E4DC] text-[#0D0C0B] hover:bg-[#D4CEC5] transition-colors disabled:opacity-40"
                    disabled={!inputValue.trim() || isStreaming}
                    data-testid="btn-send-message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-start justify-center p-10">
            <div className="max-w-lg">
              <div className="w-8 h-8 border border-white/15 flex items-center justify-center mb-8">
                <Bot className="w-4 h-4 text-[#E8E4DC]/50" />
              </div>
              <h3 className="font-serif text-4xl font-light text-[#E8E4DC] mb-3">Strategic Advisor</h3>
              {profile ? (
                <p className="text-sm text-[#E8E4DC]/45 mb-8 leading-relaxed">
                  Contextualized for {profile.companyName} — {profile.industry} · {profile.stage}. The advisor knows your business.
                </p>
              ) : (
                <p className="text-sm text-[#E8E4DC]/45 mb-8 leading-relaxed">
                  Start a new engagement to consult with the AI advisor, trained on global market data and executive decision-making frameworks.
                </p>
              )}

              <div className="space-y-2 mb-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/25 mb-3">Suggested Questions</p>
                {getSuggestedStarters(profile).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      handleCreateNew();
                      setTimeout(() => setInputValue(q), 500);
                    }}
                    className="block w-full text-left text-xs text-[#E8E4DC]/45 hover:text-[#E8E4DC]/75 py-2 border-b border-white/6 hover:border-white/15 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors"
                disabled={createConversation.isPending}
                data-testid="btn-create-conversation-empty"
              >
                {createConversation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Begin Engagement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
