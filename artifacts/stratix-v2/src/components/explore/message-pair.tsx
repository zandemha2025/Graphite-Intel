import ReactMarkdown from "react-markdown";
import {
  Copy,
  Share2,
  Bookmark,
  FileText,
} from "lucide-react";

export interface Source {
  id: string;
  title: string;
  url?: string;
}

export interface MessagePairData {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  isStreaming?: boolean;
}

interface MessagePairProps {
  pair: MessagePairData;
  onCopy: (text: string) => void;
  onSaveToBoard?: () => void;
  onShare?: () => void;
}

export function MessagePair({
  pair,
  onCopy,
  onSaveToBoard,
  onShare,
}: MessagePairProps) {
  return (
    <div className="space-y-4">
      {/* User message — right-aligned bubble */}
      <div className="flex justify-end">
        <div className="bg-[#F5F5F4] rounded-2xl px-4 py-3 max-w-[80%]">
          <p className="text-sm text-[#1A1A1A] leading-relaxed">
            {pair.question}
          </p>
        </div>
      </div>

      {/* AI response — left-aligned, no background, full width */}
      <div className="max-w-full">
        <div className="prose prose-sm prose-stone max-w-none text-[#525252] leading-relaxed">
          <ReactMarkdown>{pair.answer}</ReactMarkdown>
        </div>

        {pair.isStreaming && (
          <div className="flex items-center gap-1 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {/* Source badges */}
        {pair.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {pair.sources.map((source) => (
              <span
                key={source.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5F5F4] text-[11px] font-medium text-[#525252] border border-[#E5E5E3]"
              >
                <FileText className="h-3 w-3 text-[#A3A3A3]" />
                {source.title}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {!pair.isStreaming && pair.answer && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[#E5E5E3]/40">
            <button
              onClick={() => onCopy(pair.answer)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F5F5F4] rounded-md transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            {onSaveToBoard && (
              <button
                onClick={onSaveToBoard}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F5F5F4] rounded-md transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save to Board
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F5F5F4] rounded-md transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
