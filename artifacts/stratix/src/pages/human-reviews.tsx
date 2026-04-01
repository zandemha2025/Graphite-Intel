import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ClipboardCheck, Clock, ChevronRight, Filter } from "lucide-react";
import { HumanReviewDialog } from "../components/workflow/human-review-dialog";

interface HumanReview {
  id: number;
  executionId: number;
  stepIndex: number;
  assignedToUserId: string | null;
  reviewData: unknown;
  decision: string | null;
  feedback: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  execution?: {
    title: string;
    workflowDefinitionId: number | null;
  };
}

export function HumanReviews() {
  const [reviews, setReviews] = useState<HumanReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedReview, setSelectedReview] = useState<HumanReview | null>(
    null,
  );

  const fetchReviews = useCallback(() => {
    setLoading(true);
    fetch(`/api/human-reviews?status=${statusFilter}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        setReviews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDecide = async (
    reviewId: number,
    decision: "approved" | "rejected" | "modified",
    feedback?: string,
  ) => {
    const res = await fetch(`/api/human-reviews/${reviewId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ decision, feedback }),
    });
    if (!res.ok) throw new Error("Failed to submit decision");
    fetchReviews();
  };

  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--workspace-text)",
              margin: 0,
            }}
          >
            Human Reviews
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--workspace-text-muted)",
              margin: "4px 0 0",
            }}
          >
            Workflow steps awaiting your approval
          </p>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {["pending", "completed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px solid var(--workspace-border, #333)",
                background:
                  statusFilter === status
                    ? "var(--workspace-accent, #3b82f6)"
                    : "transparent",
                color:
                  statusFilter === status
                    ? "white"
                    : "var(--workspace-text-muted)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--workspace-text-muted)",
            fontSize: "14px",
          }}
        >
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--workspace-text-muted)",
          }}
        >
          <ClipboardCheck
            size={40}
            style={{ marginBottom: "12px", opacity: 0.4 }}
          />
          <p style={{ fontSize: "14px" }}>
            No {statusFilter} reviews right now.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {reviews.map((review) => (
            <div
              key={review.id}
              onClick={() =>
                review.status === "pending" && setSelectedReview(review)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 18px",
                borderRadius: "10px",
                border: "1px solid var(--workspace-border, #333)",
                background: "var(--workspace-surface, #1a1a2e)",
                cursor:
                  review.status === "pending" ? "pointer" : "default",
                transition: "border-color 150ms",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background:
                    review.status === "pending"
                      ? "rgba(234,179,8,0.15)"
                      : "rgba(22,163,98,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {review.status === "pending" ? (
                  <Clock size={18} style={{ color: "#eab308" }} />
                ) : (
                  <ClipboardCheck size={18} style={{ color: "#16a34a" }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--workspace-text)",
                  }}
                >
                  Step {review.stepIndex + 1} — Execution #{review.executionId}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--workspace-text-muted)",
                    marginTop: "2px",
                  }}
                >
                  {format(new Date(review.createdAt), "MMM d, yyyy h:mm a")}
                  {review.decision && (
                    <span style={{ marginLeft: "8px", textTransform: "capitalize" }}>
                      Decision: {review.decision}
                    </span>
                  )}
                </div>
              </div>

              {review.status === "pending" && (
                <ChevronRight
                  size={16}
                  style={{ color: "var(--workspace-text-muted)" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {selectedReview && (
        <HumanReviewDialog
          review={selectedReview}
          onDecide={handleDecide}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  );
}
