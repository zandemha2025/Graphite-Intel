import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { apiSSE } from "@/lib/api";
import { ResultCell, type ResultCellData } from "@/components/explore/result-cell";
import { Conversation, type Message } from "@/components/explore/conversation";
import { ChatInput } from "@/components/explore/chat-input";

type Depth = "quick" | "standard" | "deep";

export default function ExplorePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cells, setCells] = useState<ResultCellData[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [depth, setDepth] = useState<Depth>("standard");
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);

      let assistantContent = "";
      const assistantId = `a-${Date.now()}`;

      abortRef.current = new AbortController();

      try {
        await apiSSE(
          "/openai/conversations",
          {
            messages: [{ role: "user", content }],
            depth,
          },
          (_event, data) => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                assistantContent += parsed.choices[0].delta.content;
                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantId);
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m,
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: assistantId,
                      role: "assistant",
                      content: assistantContent,
                      sources: ["Perplexity", "Web"],
                    },
                  ];
                });
              }
            } catch {
              // Non-JSON data, append as text
              if (data && data !== "[DONE]") {
                assistantContent += data;
              }
            }
          },
          abortRef.current.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          // On error, show a fallback message
          const errorContent = "I encountered an issue processing your request. Please try again.";
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId);
            if (existing) return prev;
            return [
              ...prev,
              { id: assistantId, role: "assistant", content: errorContent },
            ];
          });
        }
      } finally {
        setStreaming(false);

        // Create a cell from the response
        if (assistantContent.trim()) {
          const newCell: ResultCellData = {
            id: `cell-${Date.now()}`,
            type: "key-finding",
            title: content.slice(0, 60) + (content.length > 60 ? "..." : ""),
            content: assistantContent,
            sources: ["Perplexity", "Web"],
          };
          setCells((prev) => [newCell, ...prev]);
        }
      }
    },
    [depth],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-3">
        <h1 className="text-lg font-semibold text-[#111827]">Explore</h1>
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
        {/* Left: Results Notebook */}
        <div className="flex w-1/2 flex-col overflow-hidden border-r border-[#E5E7EB]">
          <div className="border-b border-[#E5E7EB] px-4 py-2.5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Results Notebook
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cells.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-[#6B7280]">
                    Results will appear here as you explore.
                  </p>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Each insight becomes a saveable, composable cell.
                  </p>
                </div>
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

        {/* Right: Conversation */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="border-b border-[#E5E7EB] px-4 py-2.5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Conversation
            </h2>
          </div>
          <Conversation messages={messages} streaming={streaming} className="flex-1" />
        </div>
      </div>

      {/* Bottom: Chat input */}
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
