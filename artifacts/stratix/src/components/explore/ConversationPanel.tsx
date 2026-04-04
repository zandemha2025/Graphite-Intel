import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Paperclip, FileText, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { DepthToggle } from "./DepthToggle";
import type { ResearchDepth } from "./DepthToggle";

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

type LinkedDoc = {
  id: number;
  title: string;
};

type Props = {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  streamingSources: SourceChunk[] | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: (content: string, depth: ResearchDepth) => void;
  linkedDocs: LinkedDoc[];
  showDocPicker: boolean;
  onToggleDocPicker: () => void;
  docPickerSlot?: React.ReactNode;
};

function SourcesPanel({ sources }: { sources: SourceChunk[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3 rounded overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        style={{ background: "#F9FAFB" }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3 h-3" style={{ color: "#9CA3AF" }} />
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "#9CA3AF" }}
          >
            Sources ({sources.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3" style={{ color: "#9CA3AF" }} />
        ) : (
          <ChevronDown className="w-3 h-3" style={{ color: "#9CA3AF" }} />
        )}
      </button>
      {expanded && (
        <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
          {sources.map((s, i) => (
            <div key={i} className="px-3 py-2.5" style={{ background: "#FFFFFF" }}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[11px] font-medium truncate pr-2"
                  style={{ color: "#1F2937" }}
                >
                  {s.documentTitle}
                </span>
                <span className="text-[9px] shrink-0" style={{ color: "#9CA3AF" }}>
                  {Math.round(s.similarity * 100)}% match
                </span>
              </div>
              <p className="text-[11px] line-clamp-2" style={{ color: "#6B7280" }}>
                {s.snippet}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConversationPanel({
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
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [depth, setDepth] = useState<ResearchDepth>("standard");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    onSend(inputValue.trim(), depth);
  };

  const userQuestions = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col h-full" style={{ background: "#FFFFFF" }}>
      <div
        className="px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
          Conversation
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          {userQuestions} question{userQuestions !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        ref={scrollRef}
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm mb-1" style={{ color: "#6B7280" }}>
              Ask your first question
            </p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>
              Structured insights will appear in the Results Notebook.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div
                className="text-sm leading-relaxed max-w-[85%] px-3 py-2 rounded-lg"
                style={{ background: "#EEF2FF", color: "#1F2937" }}
              >
                {msg.content}
              </div>
            ) : (
              <div
                className="text-sm leading-relaxed max-w-[95%] px-3 py-2.5 rounded-lg"
                style={{
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  color: "#1F2937",
                }}
              >
                <div
                  className="prose prose-sm max-w-none"
                  style={{
                    "--tw-prose-body": "#1F2937",
                    "--tw-prose-headings": "#111827",
                    "--tw-prose-links": "#4F46E5",
                    "--tw-prose-bold": "#111827",
                    "--tw-prose-code": "#111827",
                    "--tw-prose-pre-bg": "#F3F4F6",
                  } as React.CSSProperties}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesPanel sources={msg.sources} />
                )}
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div
              className="text-sm leading-relaxed max-w-[95%] px-3 py-2.5 rounded-lg"
              style={{
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                color: "#1F2937",
              }}
            >
              {streamingContent ? (
                <>
                  <div
                    className="prose prose-sm max-w-none"
                    style={{
                      "--tw-prose-body": "#1F2937",
                      "--tw-prose-headings": "#111827",
                    } as React.CSSProperties}
                  >
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                  {streamingSources && streamingSources.length > 0 && (
                    <SourcesPanel sources={streamingSources} />
                  )}
                </>
              ) : (
                <span className="flex gap-1 items-center h-5">
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
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4" style={{ borderTop: "1px solid #E5E7EB" }}>
        {linkedDocs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {linkedDocs.map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full"
                style={{ background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" }}
              >
                <FileText className="w-2.5 h-2.5" />
                {d.title}
              </span>
            ))}
          </div>
        )}

        <div className="mb-2">
          <DepthToggle value={depth} onChange={setDepth} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onToggleDocPicker}
              className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors relative"
              style={{
                border: `1px solid ${showDocPicker || linkedDocs.length > 0 ? "#4F46E5" : "#E5E7EB"}`,
                color: showDocPicker || linkedDocs.length > 0 ? "#4F46E5" : "#9CA3AF",
                background: "#FFFFFF",
              }}
              title="Attach documents"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {linkedDocs.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold rounded-full"
                  style={{ background: "#4F46E5", color: "#FFFFFF" }}
                >
                  {linkedDocs.length}
                </span>
              )}
            </button>
            {docPickerSlot}
          </div>

          <div className="flex-1 relative">
            <input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Ask a question..."
              className="w-full px-3 py-2.5 text-sm rounded-lg pr-10 focus:outline-none focus:ring-2"
              style={{
                border: "1px solid #E5E7EB",
                color: "#1F2937",
                background: "#F9FAFB",
                "--tw-ring-color": "#C7D2FE",
              } as React.CSSProperties}
              disabled={isStreaming}
              data-testid="input-explore"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
              style={{ background: "#4F46E5", color: "#FFFFFF" }}
              disabled={!inputValue.trim() || isStreaming}
              data-testid="btn-send-explore"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
