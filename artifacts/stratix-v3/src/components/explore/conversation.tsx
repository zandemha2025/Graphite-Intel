import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ExternalLink, Search, Brain, Sparkles, FileText } from "lucide-react";

export interface Source {
  name: string;
  url?: string;
  domain?: string;
  type?: "1p" | "3p";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  sourceDetails?: Source[];
  followUps?: string[];
  timestamp?: string;
}

/* ---------- Follow-up generation ---------- */

/** Extract notable noun phrases / proper nouns from text */
function extractTopics(text: string): string[] {
  const topics: string[] = [];

  // Extract capitalized multi-word terms (proper nouns / named entities)
  const properNouns = text.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
  if (properNouns) {
    for (const pn of properNouns) {
      if (!topics.includes(pn) && topics.length < 3) topics.push(pn);
    }
  }

  // Extract single capitalized words that aren't sentence starters
  const sentences = text.split(/[.!?]\s+/);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).slice(1); // skip first word (sentence start)
    for (const word of words) {
      const clean = word.replace(/[^a-zA-Z]/g, "");
      if (
        clean.length > 3 &&
        clean[0] === clean[0]?.toUpperCase() &&
        clean[0] !== clean[0]?.toLowerCase() &&
        !topics.includes(clean) &&
        topics.length < 3
      ) {
        topics.push(clean);
      }
    }
  }

  return topics;
}

function generateFollowUps(content: string): string[] {
  const suggestions: string[] = [];
  const topics = extractTopics(content);

  // First sentence summary question
  const firstSentence = content.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence.length > 20) {
    const subject = firstSentence.slice(0, 60).replace(/[,;:].*/, "").trim();
    suggestions.push(`Tell me more about ${subject}`);
  }

  // Topic-based questions from extracted terms
  if (topics[0]) {
    suggestions.push(`How does ${topics[0]} compare to alternatives?`);
  }
  if (topics[1]) {
    suggestions.push(`What are the key risks around ${topics[1]}?`);
  }

  // Content-length based contextual question
  if (content.length > 500) {
    suggestions.push("Summarize the key takeaways in bullet points");
  } else if (content.length > 100) {
    suggestions.push("Go deeper on this analysis with more data");
  }

  // Ensure we always have at least 2 suggestions
  if (suggestions.length < 2) {
    suggestions.push("What are the strategic implications of this?");
  }
  if (suggestions.length < 2) {
    suggestions.push("How has this changed over the past year?");
  }

  return suggestions.slice(0, 3);
}

/* ---------- Source citations panel ---------- */

function classifySourceType(source: Source): "1p" | "3p" | "synthesized" {
  const lower = source.name.toLowerCase();
  if (
    lower.includes("salesforce") ||
    lower.includes("hubspot") ||
    lower.includes("gong") ||
    lower.includes("your ") ||
    lower.includes("google drive") ||
    lower.includes("crm") ||
    lower.includes("internal")
  ) {
    return "1p";
  }
  if (
    lower.includes("perplexity") ||
    lower.includes("serpapi") ||
    lower.includes("firecrawl") ||
    lower.includes("web") ||
    (source.url && source.url.startsWith("http"))
  ) {
    return "3p";
  }
  return "synthesized";
}

function SourceTypeLabel({ type }: { type: "1p" | "3p" | "synthesized" }) {
  switch (type) {
    case "1p":
      return (
        <span className="rounded-full bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#4F46E5]">
          1P
        </span>
      );
    case "3p":
      return (
        <span className="rounded-full bg-[#F3F4F6] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#6B7280]">
          3P
        </span>
      );
    case "synthesized":
      return (
        <span className="rounded-full border border-[#E5E7EB] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#9CA3AF]">
          AI
        </span>
      );
  }
}

function SourceCitationsPanel({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
        <FileText className="h-3.5 w-3.5" />
        Sources
      </div>
      <div className="flex flex-col gap-1.5">
        {sources.map((source, idx) => {
          const sourceType = classifySourceType(source);
          return (
            <a
              key={`${source.name}-${idx}`}
              href={source.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-white"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#4F46E5] text-[10px] font-semibold text-white">
                {idx + 1}
              </span>
              <SourceTypeLabel type={sourceType} />
              <span className="flex-1 truncate font-medium text-[#111827] group-hover:text-[#4F46E5]">
                {source.name}
              </span>
              {source.domain && (
                <span className="shrink-0 text-[#9CA3AF]">{source.domain}</span>
              )}
              <ExternalLink className="h-3 w-3 shrink-0 text-[#9CA3AF] opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Follow-up suggestions ---------- */

function FollowUpSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] transition-colors hover:border-[#4F46E5] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/* ---------- Research progress indicator ---------- */

interface ResearchStep {
  label: string;
  icon: typeof Search;
  active: boolean;
  complete: boolean;
}

function ResearchProgressIndicator({
  phase,
  sourceCount,
}: {
  phase: "searching" | "analyzing" | "synthesizing" | "idle";
  sourceCount: number;
}) {
  if (phase === "idle") return null;

  const steps: ResearchStep[] = [
    {
      label: "Searching sources",
      icon: Search,
      active: phase === "searching",
      complete: phase === "analyzing" || phase === "synthesizing",
    },
    {
      label: "Analyzing data",
      icon: Brain,
      active: phase === "analyzing",
      complete: phase === "synthesizing",
    },
    {
      label: "Synthesizing insights",
      icon: Sparkles,
      active: phase === "synthesizing",
      complete: false,
    },
  ];

  return (
    <div className="mb-4 flex justify-start">
      <div className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
        <div className="flex items-center gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-2">
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-px w-6",
                      step.complete || step.active
                        ? "bg-[#4F46E5]"
                        : "bg-[#E5E7EB]",
                    )}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      step.active
                        ? "animate-pulse bg-[#4F46E5] text-white"
                        : step.complete
                          ? "bg-[#4F46E5] text-white"
                          : "bg-[#E5E7EB] text-[#9CA3AF]",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      step.active
                        ? "font-medium text-[#4F46E5]"
                        : step.complete
                          ? "font-medium text-[#111827]"
                          : "text-[#9CA3AF]",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {sourceCount > 0 && (
          <div className="mt-2 text-xs text-[#6B7280]">
            Found {sourceCount} source{sourceCount !== 1 ? "s" : ""}
          </div>
        )}
        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className={cn(
              "h-full rounded-full bg-[#4F46E5] transition-all duration-1000 ease-out",
              phase === "searching" && "w-1/3",
              phase === "analyzing" && "w-2/3",
              phase === "synthesizing" && "w-11/12",
            )}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Inline citation badge in markdown ---------- */

function InlineCitationContent({
  content,
  sourceDetails,
}: {
  content: string;
  sourceDetails?: Source[];
}) {
  if (!sourceDetails || sourceDetails.length === 0) {
    return (
      <div className="prose-narrative max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  // Split content into parts: text and citation references [N]
  const parts = content.split(/(\[\d+\])/g);

  return (
    <div className="prose-narrative max-w-none">
      {parts.map((part, i) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
          const num = parseInt(citationMatch[1] ?? "0", 10);
          const source = sourceDetails[num - 1];
          if (source) {
            return (
              <a
                key={i}
                href={source.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="not-prose ml-0.5 mr-0.5 inline-flex h-4 w-4 items-center justify-center rounded bg-[#4F46E5] text-[9px] font-semibold leading-none text-white no-underline hover:bg-[#4338CA]"
                title={`${source.name}${source.domain ? ` — ${source.domain}` : ""}`}
              >
                {num}
              </a>
            );
          }
        }
        // Render non-citation text as markdown
        if (part.trim()) {
          return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
        }
        return null;
      })}
    </div>
  );
}

/* ---------- Main component ---------- */

interface ConversationProps {
  messages: Message[];
  streaming?: boolean;
  researchPhase?: "searching" | "analyzing" | "synthesizing" | "idle";
  sourceCount?: number;
  onFollowUp?: (suggestion: string) => void;
  className?: string;
}

export function Conversation({
  messages,
  streaming,
  researchPhase = "idle",
  sourceCount = 0,
  onFollowUp,
  className,
}: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center px-6",
          className,
        )}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
            <span className="text-lg text-[#4F46E5]">S</span>
          </div>
          <h3 className="text-sm font-medium text-[#111827]">
            What would you like to know?
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ask about your pipeline, competitors, channels, or market -- Stratix
            combines your data with real-time research.
          </p>
          {onFollowUp && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "What's our customer acquisition cost by channel?",
                "Analyze competitor marketing spend vs ours",
                "Which accounts are at risk of churning?",
                "What marketing channels have the best ROI?",
                "Draft a board deck on Q3 growth metrics",
                "Compare our brand positioning to [competitor]",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => onFollowUp(s)}
                  className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] transition-colors hover:border-[#4F46E5] hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-y-auto px-4 py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {messages.map((msg, msgIdx) => {
          const isLastAssistant =
            msg.role === "assistant" &&
            !streaming &&
            msgIdx === messages.length - 1;

          // Build follow-up suggestions for the last assistant message
          const followUps = isLastAssistant
            ? msg.followUps || generateFollowUps(msg.content)
            : [];

          // Build source details from either sourceDetails or source names
          const sourceDetails: Source[] =
            msg.sourceDetails ??
            msg.sources?.map((name) => ({
              name,
              url: "#",
              domain: name.toLowerCase().replace(/\s+/g, "") + ".com",
            })) ??
            [];

          return (
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
                <div className="w-full text-[15px] leading-7 text-[#111827]">
                  <InlineCitationContent
                    content={msg.content}
                    sourceDetails={
                      sourceDetails.length > 0 ? sourceDetails : undefined
                    }
                  />

                  {/* Source citations panel */}
                  {sourceDetails.length > 0 && (
                    <SourceCitationsPanel sources={sourceDetails} />
                  )}

                  {/* Follow-up suggestions */}
                  {followUps.length > 0 && onFollowUp && (
                    <FollowUpSuggestions
                      suggestions={followUps}
                      onSelect={onFollowUp}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Research progress indicator during streaming */}
        {streaming && researchPhase !== "idle" && (
          <ResearchProgressIndicator
            phase={researchPhase}
            sourceCount={sourceCount}
          />
        )}

        {/* Bounce dots when streaming with no content yet */}
        {streaming &&
          !messages.some(
            (m) => m.role === "assistant" && m.id.startsWith("a-"),
          ) && (
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
