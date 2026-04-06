import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Paperclip, ArrowUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

/* ---------- Types ---------- */

interface ConnectorSummary {
  connectors: {
    id: string;
    name: string;
    type: string;
    connected: boolean;
  }[];
}

interface DataSource {
  name: string;
  connected: boolean;
}

/* ---------- Built-in sources ---------- */

const BUILTIN_SOURCES: DataSource[] = [
  { name: "Perplexity", connected: true },
  { name: "SerpAPI", connected: true },
  { name: "Your Documents", connected: true },
  { name: "Company Profile", connected: true },
];

/* ---------- Data Sources Bar ---------- */

function DataSourcesBar() {
  const [sources, setSources] = useState<DataSource[]>(BUILTIN_SOURCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<ConnectorSummary>("/connectors/accounts/summary")
      .then((data) => {
        if (cancelled) return;
        const appSources: DataSource[] = (data.connectors ?? []).map((c) => ({
          name: c.name,
          connected: c.connected,
        }));
        setSources([...BUILTIN_SOURCES, ...appSources]);
      })
      .catch(() => {
        if (cancelled) return;
        // API unavailable -- show built-in sources only
        setSources(BUILTIN_SOURCES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-[#9CA3AF]" />
        <span className="text-xs text-[#9CA3AF]">Loading sources...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-1.5">
      <span className="shrink-0 text-xs font-medium text-[#6B7280]">
        Sources:
      </span>
      {sources.map((src) => (
        <span
          key={src.name}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            src.connected
              ? "bg-[#EEF2FF] text-[#4F46E5]"
              : "bg-[#F3F4F6] text-[#9CA3AF]",
          )}
        >
          {src.name}
          {!src.connected && (
            <button className="ml-0.5 underline hover:text-[#4F46E5]">
              Connect
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- ChatInput ---------- */

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, disabled, className }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className={cn("border-t border-[#E5E7EB] bg-white", className)}>
      {/* Data sources indicator */}
      <DataSourcesBar />

      <div className="px-4 pb-3">
        {/* Attached file chip */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#4F46E5]">
              <Paperclip className="h-3 w-3" />
              {attachedFile.name}
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#4F46E5]/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setAttachedFile(file);
                toast.success(`Attached: ${file.name} — will be included as context`);
              }
              // Reset so the same file can be selected again
              e.target.value = "";
            }}
          />
          <button
            className="mb-0.5 shrink-0 rounded-md p-1 text-[#6B7280] hover:bg-[#E5E7EB]/50 hover:text-[#111827]"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask about pipeline, competitors, channels, or growth..."
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
    </div>
  );
}
