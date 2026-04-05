import { Compass, Sparkles, TrendingUp, BarChart3, Target } from "lucide-react";

type Props = {
  hasConversations: boolean;
  onCreate: (initialMessage?: string) => void;
  isCreating: boolean;
};

export function ExploreEmptyState({ hasConversations, onCreate, isCreating }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--explore-accent-light, #EEF2FF)" }}
      >
        <Compass className="w-7 h-7" style={{ color: "var(--explore-accent, #4F46E5)" }} />
      </div>
      <h3
        className="text-2xl font-semibold mb-2"
        style={{ color: "var(--explore-heading, #111827)" }}
      >
        {!hasConversations ? "Welcome to Explore" : "Explore"}
      </h3>
      <p
        className="text-sm max-w-sm mb-8"
        style={{ color: "var(--explore-text-secondary, #6B7280)" }}
      >
        {!hasConversations
          ? "Ask strategic questions and get structured insights with charts, tables, and analysis."
          : "Start a new session to ask questions and see structured insights."}
      </p>

      {!hasConversations && (
        <div className="grid grid-cols-2 gap-2.5 max-w-md mb-8 w-full">
          {[
            { icon: TrendingUp, text: "Who are my top competitors and how do they position?" },
            { icon: BarChart3, text: "What does the market landscape look like for my industry?" },
            { icon: Target, text: "What strategic moves should I prioritize this quarter?" },
            { icon: Sparkles, text: "Summarize recent trends affecting my business" },
          ].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onCreate(suggestion.text)}
              className="flex items-start gap-2.5 text-left p-3 rounded-lg transition-colors hover:bg-gray-50"
              style={{ border: "1px solid var(--explore-border, #E5E7EB)" }}
            >
              <suggestion.icon
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--explore-accent, #4F46E5)" }}
              />
              <span
                className="text-xs leading-relaxed"
                style={{ color: "var(--explore-text-secondary, #6B7280)" }}
              >
                {suggestion.text}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => onCreate()}
        disabled={isCreating}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
        style={{ background: "var(--explore-accent, #4F46E5)", color: "#FFFFFF" }}
        data-testid="btn-create-session"
      >
        {isCreating ? "Creating..." : "New Session"}
      </button>
    </div>
  );
}
