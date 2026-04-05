import { useState } from "react";
import { Send, Paperclip, Database } from "lucide-react";
import { DepthToggle } from "./DepthToggle";
import type { ResearchDepth } from "./DepthToggle";

type Props = {
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: (content: string, depth: ResearchDepth) => void;
  isStreaming: boolean;
  linkedDocsCount: number;
  sourceCount: number;
  onToggleDocPicker: () => void;
  showDocPicker: boolean;
  docPickerSlot?: React.ReactNode;
};

export function ExploreInputBar({
  inputValue,
  onInputChange,
  onSend,
  isStreaming,
  linkedDocsCount,
  sourceCount,
  onToggleDocPicker,
  showDocPicker,
  docPickerSlot,
}: Props) {
  const [depth, setDepth] = useState<ResearchDepth>("standard");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    onSend(inputValue.trim(), depth);
  };

  return (
    <div
      className="shrink-0"
      style={{
        borderTop: "1px solid var(--explore-border, #E5E7EB)",
        background: "var(--explore-input-bg, #FFFFFF)",
      }}
    >
      {/* Depth toggle row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <DepthToggle value={depth} onChange={setDepth} />

        {sourceCount > 0 && (
          <span
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: "var(--explore-muted, #9CA3AF)" }}
          >
            <Database className="w-3 h-3" />
            {sourceCount} source{sourceCount !== 1 ? "s" : ""} connected
          </span>
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pb-3 pt-1">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleDocPicker}
            className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors relative"
            style={{
              border: `1px solid ${
                showDocPicker || linkedDocsCount > 0
                  ? "var(--explore-accent, #4F46E5)"
                  : "var(--explore-border, #E5E7EB)"
              }`,
              color:
                showDocPicker || linkedDocsCount > 0
                  ? "var(--explore-accent, #4F46E5)"
                  : "var(--explore-muted, #9CA3AF)",
              background: "var(--explore-input-bg, #FFFFFF)",
            }}
            title="Attach documents"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {linkedDocsCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] flex items-center justify-center font-bold rounded-full"
                style={{
                  background: "var(--explore-accent, #4F46E5)",
                  color: "#FFFFFF",
                }}
              >
                {linkedDocsCount}
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
            placeholder="Ask anything about your business..."
            className="w-full px-4 py-2.5 text-sm rounded-lg pr-10 focus:outline-none focus:ring-2"
            style={{
              border: "1px solid var(--explore-border, #E5E7EB)",
              color: "var(--explore-text, #1F2937)",
              background: "var(--explore-surface, #F9FAFB)",
              "--tw-ring-color": "#C7D2FE",
            } as React.CSSProperties}
            disabled={isStreaming}
            data-testid="input-explore"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
            style={{
              background: "var(--explore-accent, #4F46E5)",
              color: "#FFFFFF",
            }}
            disabled={!inputValue.trim() || isStreaming}
            data-testid="btn-send-explore"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
