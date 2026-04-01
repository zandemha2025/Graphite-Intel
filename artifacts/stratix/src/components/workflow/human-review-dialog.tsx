import { useState } from "react";
import { CheckCircle2, XCircle, Edit3 } from "lucide-react";

interface HumanReview {
  id: number;
  executionId: number;
  stepIndex: number;
  reviewData: unknown;
  status: string;
  createdAt: string;
  execution?: {
    title: string;
    workflowDefinitionId: number | null;
  };
}

interface HumanReviewDialogProps {
  review: HumanReview;
  onDecide: (
    reviewId: number,
    decision: "approved" | "rejected" | "modified",
    feedback?: string,
  ) => Promise<void>;
  onClose: () => void;
}

export function HumanReviewDialog({
  review,
  onDecide,
  onClose,
}: HumanReviewDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (
    decision: "approved" | "rejected" | "modified",
  ) => {
    setSubmitting(true);
    try {
      await onDecide(review.id, decision, feedback || undefined);
      onClose();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--workspace-surface, #1a1a2e)",
          borderRadius: "12px",
          border: "1px solid var(--workspace-border, #333)",
          padding: "24px",
          width: "90%",
          maxWidth: "560px",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--workspace-text)",
          }}
        >
          Review Required
        </h3>

        <div
          style={{
            fontSize: "13px",
            color: "var(--workspace-text-muted)",
            marginBottom: "12px",
          }}
        >
          Workflow step {review.stepIndex + 1} is awaiting your review before
          continuing.
        </div>

        {/* Review data preview */}
        <div
          style={{
            background: "var(--workspace-bg, #0f0f1a)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            maxHeight: "200px",
            overflow: "auto",
            fontSize: "12px",
            fontFamily: "monospace",
            color: "var(--workspace-text-muted)",
          }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(review.reviewData, null, 2)}
          </pre>
        </div>

        {/* Feedback input */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--workspace-text-muted)",
              marginBottom: "6px",
            }}
          >
            Feedback (optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add notes or modifications..."
            style={{
              width: "100%",
              minHeight: "80px",
              background: "var(--workspace-bg, #0f0f1a)",
              border: "1px solid var(--workspace-border, #333)",
              borderRadius: "8px",
              padding: "10px",
              color: "var(--workspace-text)",
              fontSize: "13px",
              resize: "vertical",
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleDecision("rejected")}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #dc2626",
              background: "transparent",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            <XCircle size={14} />
            Reject
          </button>
          <button
            onClick={() => handleDecision("modified")}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #ca8a04",
              background: "transparent",
              color: "#ca8a04",
              fontSize: "13px",
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            <Edit3 size={14} />
            Modify & Continue
          </button>
          <button
            onClick={() => handleDecision("approved")}
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#16a34a",
              color: "white",
              fontSize: "13px",
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            <CheckCircle2 size={14} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
