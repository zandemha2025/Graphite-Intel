import { ScrollArea } from "@/components/ui/scroll-area";
import { CellCard } from "./CellCard";
import type { CellData } from "@/components/charts";

type Props = {
  cells: CellData[];
  isStreaming: boolean;
};

export function ResultsPanel({ cells, isStreaming }: Props) {
  return (
    <div className="flex flex-col h-full" style={{ background: "#F9FAFB" }}>
      <div
        className="px-5 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
          Results Notebook
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          {cells.length} cell{cells.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {cells.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: "#EEF2FF" }}
              >
                <span className="text-xl" style={{ color: "#4F46E5" }}>✦</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "#374151" }}>
                No results yet
              </p>
              <p className="text-xs max-w-xs" style={{ color: "#9CA3AF" }}>
                Ask a question in the Conversation panel to see structured insights appear here.
              </p>
            </div>
          ) : (
            <>
              {cells.map((cell) => (
                <CellCard key={cell.id} cell={cell} />
              ))}
              {isStreaming && (
                <div
                  className="rounded-lg p-4 flex items-center gap-3"
                  style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
                >
                  <span className="flex gap-1">
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
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>
                    Generating insights...
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
