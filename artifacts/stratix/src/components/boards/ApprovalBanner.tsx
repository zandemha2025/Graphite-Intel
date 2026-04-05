import { CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import type { ApprovalStatus } from "./board-types";

type Props = {
  status: ApprovalStatus;
  approvedByName?: string;
  approvedAt?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  onMarkReviewed?: () => void;
  onApprove?: () => void;
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ApprovalBanner({
  status,
  approvedByName,
  approvedAt,
  reviewedByName,
  reviewedAt,
  onMarkReviewed,
  onApprove,
}: Props) {
  if (status === "approved") {
    return (
      <div
        className="flex items-center gap-2 px-5 py-2.5"
        style={{ background: "#ECFDF5", borderBottom: "1px solid #A7F3D0" }}
      >
        <ShieldCheck className="h-4 w-4" style={{ color: "#059669" }} />
        <span className="text-xs font-medium" style={{ color: "#065F46" }}>
          Approved by {approvedByName ?? "Admin"} on {formatDate(approvedAt)}
        </span>
      </div>
    );
  }

  if (status === "reviewed") {
    return (
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ background: "#EEF2FF", borderBottom: "1px solid #C7D2FE" }}
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" style={{ color: "#4F46E5" }} />
          <span className="text-xs font-medium" style={{ color: "#3730A3" }}>
            Reviewed by {reviewedByName ?? "Reviewer"} on {formatDate(reviewedAt)}
          </span>
        </div>
        {onApprove && (
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: "#059669", color: "#FFFFFF" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </button>
        )}
      </div>
    );
  }

  // Draft
  return (
    <div
      className="flex items-center justify-between px-5 py-2.5"
      style={{ background: "#FFFBEB", borderBottom: "1px solid #FDE68A" }}
    >
      <span className="text-xs font-medium" style={{ color: "#92400E" }}>
        Draft — not yet reviewed
      </span>
      {onMarkReviewed && (
        <button
          onClick={onMarkReviewed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90"
          style={{ background: "#4F46E5", color: "#FFFFFF" }}
        >
          <Eye className="h-3.5 w-3.5" />
          Mark as Reviewed
        </button>
      )}
    </div>
  );
}
