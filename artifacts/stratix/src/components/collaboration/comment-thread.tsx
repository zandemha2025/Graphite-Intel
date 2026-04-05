/**
 * Comment thread component — shows threaded comments on any resource.
 * Drop into a collapsible sidebar or panel on resource detail pages.
 */
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, CheckCircle, CornerDownRight, Trash2 } from "lucide-react";

interface CommentData {
  id: number;
  userId: string;
  content: string;
  isResolved: boolean;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  replies: CommentData[];
}

interface CommentThreadProps {
  resourceType: string;
  resourceId: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommentThread({ resourceType, resourceId }: CommentThreadProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/${resourceType}/${resourceId}`, { credentials: "include" });
      if (res.ok) setComments(await res.json());
    } catch {}
    setLoading(false);
  }, [resourceType, resourceId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resourceType, resourceId, content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ resourceType, resourceId, content: replyText.trim(), parentId }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        fetchComments();
      }
    } catch {}
  };

  const handleResolve = async (commentId: number) => {
    try {
      await fetch(`/api/comments/${commentId}/resolve`, { method: "POST", credentials: "include" });
      fetchComments();
    } catch {}
  };

  const handleDelete = async (commentId: number) => {
    try {
      await fetch(`/api/comments/${commentId}`, { method: "DELETE", credentials: "include" });
      fetchComments();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
          Comments ({comments.length})
        </span>
      </div>

      {/* Comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs"
          style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="p-1.5"
          style={{ color: newComment.trim() ? "var(--workspace-fg)" : "var(--workspace-muted)" }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      {loading ? (
        <p className="text-xs" style={{ color: "var(--workspace-muted)" }}>Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--workspace-muted)" }}>No comments yet</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} style={{ opacity: comment.isResolved ? 0.5 : 1 }}>
              {/* Main comment */}
              <div className="px-3 py-2" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: "var(--workspace-fg)" }}>{comment.userId}</span>
                      <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>{timeAgo(comment.createdAt)}</span>
                      {comment.isResolved && (
                        <span className="text-[9px] uppercase" style={{ color: "#10b981" }}>Resolved</span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!comment.isResolved && (
                      <button onClick={() => handleResolve(comment.id)} className="p-0.5" style={{ color: "var(--workspace-muted)" }} title="Resolve">
                        <CheckCircle className="h-3 w-3" />
                      </button>
                    )}
                    <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="p-0.5" style={{ color: "var(--workspace-muted)" }} title="Reply">
                      <CornerDownRight className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDelete(comment.id)} className="p-0.5" style={{ color: "var(--workspace-muted)" }} title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="px-3 py-2" style={{ borderLeft: "2px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium" style={{ color: "var(--workspace-fg)" }}>{reply.userId}</span>
                        <span className="text-[10px]" style={{ color: "var(--workspace-muted)" }}>{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--workspace-fg)" }}>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="ml-4 mt-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="Reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs"
                    style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
                    onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                    autoFocus
                  />
                  <button onClick={() => handleReply(comment.id)} className="p-1" style={{ color: "var(--workspace-fg)" }}>
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
