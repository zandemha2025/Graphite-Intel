/**
 * Shared type definitions for the boards feature.
 * These describe the JSONB config shape persisted in the boards table.
 */

// ---------------------------------------------------------------------------
// Card types
// ---------------------------------------------------------------------------

export interface BoardCard {
  id: string;
  type: "insight" | "notebook_cell" | "stat" | "chart" | "text";
  title: string;
  // For insight type:
  conversationId?: number;
  messageId?: number;
  prompt?: string; // The question that generates this card
  answerContent?: string; // Cached AI response
  // For notebook_cell type:
  notebookId?: number;
  cellId?: number;
  // For stat/chart/text (manual cards):
  content?: string;
  data?: unknown;
  // Common:
  lastRefreshedAt?: string;
  refreshEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Board config (persisted as JSONB)
// ---------------------------------------------------------------------------

export type ApprovalStatus = "draft" | "reviewed" | "approved";

export interface BoardConfig {
  cards: BoardCard[];
  layout: import("react-grid-layout").LayoutItem[];
  refreshSchedule?: string; // cron expression
  approvalStatus?: ApprovalStatus;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewedAt?: string;
}

// ---------------------------------------------------------------------------
// Schedule presets
// ---------------------------------------------------------------------------

export const SCHEDULE_PRESETS: { label: string; cron: string }[] = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Daily at 8 AM", cron: "0 8 * * *" },
  { label: "Weekly on Monday", cron: "0 8 * * 1" },
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
];

/**
 * Human-readable label for a cron expression.
 */
export function cronToLabel(cron: string): string {
  const preset = SCHEDULE_PRESETS.find((p) => p.cron === cron);
  if (preset) return preset.label;
  return `Custom (${cron})`;
}
