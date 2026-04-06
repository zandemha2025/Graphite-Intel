import { useState, useRef, type KeyboardEvent } from "react";
import { Paperclip, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, disabled, className }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  return (
    <div className={cn("border-t border-[#E5E7EB] bg-white px-4 py-3", className)}>
      <div className="flex items-end gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
        <button
          className="mb-0.5 shrink-0 rounded-md p-1 text-[#6B7280] hover:bg-[#E5E7EB]/50 hover:text-[#111827]"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask a question about your intelligence..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
          disabled={disabled}
        />

        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={cn(
            "mb-0.5 shrink-0 rounded-md p-1.5 transition-colors",
            value.trim() && !disabled
              ? "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
              : "bg-[#E5E7EB] text-[#9CA3AF]",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
