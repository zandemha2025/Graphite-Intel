import ReactMarkdown from "react-markdown";
import {
  User,
  Copy,
  Share2,
  Bookmark,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    <Card className="p-0 overflow-hidden">
      {/* Question */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white">
          <User className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm text-stone-900 leading-relaxed pt-0.5">
          {pair.question}
        </p>
      </div>

      {/* Answer */}
      <div className="px-5 pb-4 pl-14">
        <div className="prose prose-sm prose-stone max-w-none text-stone-700 leading-relaxed">
          <ReactMarkdown>{pair.answer}</ReactMarkdown>
        </div>

        {pair.isStreaming && (
          <div className="flex items-center gap-1 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {/* Sources */}
        {pair.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
            {pair.sources.map((source) => (
              <Badge key={source.id} variant="default" className="gap-1">
                <FileText className="h-3 w-3" />
                {source.title}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        {!pair.isStreaming && pair.answer && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-stone-100">
            <button
              onClick={() => onCopy(pair.answer)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-md transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            {onSaveToBoard && (
              <button
                onClick={onSaveToBoard}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-md transition-colors"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Save to Board
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-md transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
