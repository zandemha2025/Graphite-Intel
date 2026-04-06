import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp?: string;
}

interface ConversationProps {
  messages: Message[];
  streaming?: boolean;
  className?: string;
}

export function Conversation({ messages, streaming, className }: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center px-6", className)}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
            <span className="text-lg text-[#4F46E5]">S</span>
          </div>
          <h3 className="text-sm font-medium text-[#111827]">Start a conversation</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ask a question about your market, competitors, or strategy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-y-auto px-4 py-4", className)}>
      <div className="flex flex-col gap-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm leading-relaxed text-[#111827]">
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ) : (
              <div className="w-full text-sm leading-relaxed text-[#111827]">
                <div className="prose prose-sm max-w-none prose-headings:text-[#111827] prose-p:leading-relaxed prose-table:text-xs prose-th:bg-[#F9FAFB] prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-td:border-t prose-td:border-[#E5E7EB]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.sources.map((source) => (
                      <Badge
                        key={source}
                        variant="indigo"
                      >
                        {source}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streaming && !messages.some((m) => m.role === "assistant" && m.id.startsWith("a-")) && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-[#F3F4F6] px-3.5 py-2.5">
              <div className="flex gap-1">
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[#6B7280]"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
