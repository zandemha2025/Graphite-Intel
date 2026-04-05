import { Cloud, Mic, Globe, FileText, Database, Zap, LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Source {
  name: string;
  type?: "crm" | "calls" | "web" | "document" | "database" | "integration";
  documentTitle?: string;
  similarity?: number;
  detail?: string;
}

const SOURCE_STYLES: Record<
  string,
  { bg: string; text: string; Icon: LucideIcon }
> = {
  crm: { bg: "#DBEAFE", text: "#1D4ED8", Icon: Cloud },
  calls: { bg: "#FEE2E2", text: "#B91C1C", Icon: Mic },
  web: { bg: "#DCFCE7", text: "#166534", Icon: Globe },
  document: { bg: "#FEF3C7", text: "#92400E", Icon: FileText },
  database: { bg: "#EDE9FE", text: "#5B21B6", Icon: Database },
  integration: { bg: "#E0F2FE", text: "#0369A1", Icon: Zap },
};

const FALLBACK = { bg: "#F3F4F6", text: "#374151", Icon: Database };

export function SourceBadge({ source }: { source: Source }) {
  const config = SOURCE_STYLES[source.type ?? ""] ?? FALLBACK;
  const { Icon } = config;

  const hasTooltipContent = source.documentTitle || source.similarity != null || source.detail;

  const badge = (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-default"
      style={{ background: config.bg, color: config.text }}
    >
      <Icon className="w-2.5 h-2.5" />
      {source.name}
    </span>
  );

  if (!hasTooltipContent) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs text-xs"
          style={{
            background: "#FFFFFF",
            color: "#374151",
            border: "1px solid #E5E7EB",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <div className="space-y-1">
            {source.documentTitle && (
              <p className="font-medium" style={{ color: "#111827" }}>
                {source.documentTitle}
              </p>
            )}
            {source.similarity != null && (
              <p style={{ color: "#6B7280" }}>
                Match: {Math.round(source.similarity * 100)}%
              </p>
            )}
            {source.detail && (
              <p style={{ color: "#6B7280" }}>{source.detail}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
