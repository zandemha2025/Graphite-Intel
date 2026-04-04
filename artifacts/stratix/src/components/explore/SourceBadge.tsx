const SOURCES: Record<string, { bg: string; text: string; label: string }> = {
  perplexity: { bg: "#EDE9FE", text: "#5B21B6", label: "Perplexity" },
  serpapi: { bg: "#DCFCE7", text: "#166534", label: "SerpAPI" },
  firecrawl: { bg: "#FEF3C7", text: "#92400E", label: "Firecrawl" },
  openai: { bg: "#E0F2FE", text: "#0369A1", label: "OpenAI" },
  internal: { bg: "#F3F4F6", text: "#374151", label: "Internal" },
};

export function SourceBadge({ source }: { source: string }) {
  const key = source.toLowerCase();
  const config = SOURCES[key] ?? { bg: "#F3F4F6", text: "#374151", label: source };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
      style={{ background: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}
