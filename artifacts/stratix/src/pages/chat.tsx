import { useState, useRef, useEffect } from "wouter/preact"; // Wait, I should import from 'react'
import { useState as useReactState, useRef as useReactRef, useEffect as useReactEffect } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { 
  useListOpenaiConversations, 
  getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Trash2, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number | string;
  role: string;
  content: string;
};

export function Chat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversationId, setActiveConversationId] = useReactState<number | null>(null);
  const [inputValue, setInputValue] = useReactState("");
  const [streamingContent, setStreamingContent] = useReactState("");
  const [isStreaming, setIsStreaming] = useReactState(false);
  const scrollRef = useReactRef<HTMLDivElement>(null);
  
  const { data: conversations, isLoading: loadingConversations } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() }
  });

  const { data: activeConversation, isLoading: loadingActiveConversation } = useGetOpenaiConversation(
    activeConversationId as number,
    { 
      query: { 
        enabled: !!activeConversationId, 
        queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number) 
      } 
    }
  );

  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  // Auto-scroll to bottom
  useReactEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, streamingContent]);

  const handleCreateNew = () => {
    createConversation.mutate(
      { data: { title: "New Strategy Session" } },
      {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setActiveConversationId(newConv.id);
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
          if (activeConversationId === id) setActiveConversationId(null);
          toast({ title: "Conversation deleted" });
        }
      }
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeConversationId || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically update UI
    const tempId = Date.now().toString();
    const tempUserMsg = { id: tempId, role: "user", content: userMessage };
    
    // We update the cache to show the message immediately
    queryClient.setQueryData(
      getGetOpenaiConversationQueryKey(activeConversationId),
      (old: any) => {
        if (!old) return old;
        return { ...old, messages: [...old.messages, tempUserMsg] };
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
          }
        }
      }
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-border/60 bg-muted/20 flex flex-col">
        <div className="p-4 border-b border-border/60">
          <Button 
            onClick={handleCreateNew} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            data-testid="btn-create-conversation"
            disabled={createConversation.isPending}
          >
            {createConversation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            New Session
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {loadingConversations ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No sessions yet.</div>
            ) : (
              conversations?.map((conv) => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                    activeConversationId === conv.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-foreground'
                  }`}
                  data-testid={`conversation-${conv.id}`}
                >
                  <div className="truncate pr-4 flex-1">
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <p className={`text-xs mt-1 ${activeConversationId === conv.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(conv.createdAt), "MMM d")}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 opacity-0 group-hover:opacity-100 ${
                      activeConversationId === conv.id ? 'text-primary-foreground hover:bg-primary/80 hover:text-white' : 'text-muted-foreground hover:text-destructive'
                    }`}
                    onClick={(e) => handleDelete(conv.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        {activeConversationId ? (
          <>
            <div className="p-6 border-b border-border/60 bg-card/50 flex items-center justify-between">
              <div>
                <h2 className="font-serif font-semibold text-lg">{activeConversation?.title || "Strategic Session"}</h2>
                <p className="text-xs text-muted-foreground">AI Advisor initialized</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
              {activeConversation?.messages.map((msg: Message) => (
                <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded bg-brand flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-[85%] ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted/50 border border-border/50 rounded-tl-sm text-foreground prose prose-sm prose-slate dark:prose-invert max-w-none"
                  }`}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0 mt-1 border border-border">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isStreaming && (
                <div className="flex gap-4 max-w-4xl mx-auto justify-start">
                  <div className="w-8 h-8 rounded bg-brand flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="p-4 rounded-xl text-sm leading-relaxed bg-muted/50 border border-border/50 rounded-tl-sm text-foreground prose prose-sm max-w-[85%]">
                    {streamingContent ? (
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    ) : (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-2 h-2 rounded-full bg-brand/50 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-brand/50 animate-bounce delay-100" />
                        <span className="w-2 h-2 rounded-full bg-brand/50 animate-bounce delay-200" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-card border-t border-border/60">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask the advisor a strategic question..."
                  className="pr-12 py-6 rounded-xl border-border bg-muted/20 focus-visible:ring-brand shadow-sm text-base"
                  disabled={isStreaming}
                  data-testid="input-chat"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-2 h-10 w-10 bg-brand hover:bg-brand/90 text-white rounded-lg shadow-none"
                  disabled={!inputValue.trim() || isStreaming}
                  data-testid="btn-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">Strategic Advisor</h3>
            <p className="text-muted-foreground max-w-md">
              Start a new session to consult with the AI advisor. It is trained on global market data, management consulting frameworks, and executive decision-making.
            </p>
            <Button 
              onClick={handleCreateNew} 
              className="mt-8 bg-brand hover:bg-brand/90 text-white"
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Initialize Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
