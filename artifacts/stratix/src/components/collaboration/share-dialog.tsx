/**
 * Share dialog — modal to share a resource with org members or by email.
 * Drop this into any resource detail page.
 */
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { X, Share2, Trash2, Eye, Edit3, MessageSquare } from "lucide-react";

interface ShareDialogProps {
  resourceType: string;
  resourceId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface ShareEntry {
  id: number;
  sharedWithUserId: string | null;
  sharedWithEmail: string | null;
  permission: string;
  createdAt: string;
}

const permissionOptions = [
  { value: "read", label: "View", icon: <Eye className="h-3 w-3" /> },
  { value: "comment", label: "Comment", icon: <MessageSquare className="h-3 w-3" /> },
  { value: "edit", label: "Edit", icon: <Edit3 className="h-3 w-3" /> },
];

export function ShareDialog({ resourceType, resourceId, isOpen, onClose }: ShareDialogProps) {
  const { toast } = useToast();
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, resourceType, resourceId]);

  const fetchShares = async () => {
    try {
      const res = await fetch(`/api/sharing/resource/${resourceType}/${resourceId}`, { credentials: "include" });
      if (res.ok) setShares(await res.json());
    } catch {}
  };

  const handleShare = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sharing/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resourceType,
          resourceId,
          sharedWithEmail: email.trim(),
          permission,
        }),
      });
      if (res.ok) {
        toast({ title: "Shared successfully" });
        setEmail("");
        fetchShares();
      } else {
        const err = await res.json();
        toast({ title: err.error ?? "Failed to share", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleRevoke = async (shareId: number) => {
    try {
      const res = await fetch(`/api/sharing/${shareId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Access revoked" });
        fetchShares();
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full max-w-md" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--workspace-border)" }}>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" style={{ color: "var(--workspace-fg)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--workspace-fg)" }}>Share</span>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: "var(--workspace-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add share */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--workspace-border)" }}>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)" }}
              onKeyDown={(e) => e.key === "Enter" && handleShare()}
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="px-2 py-1.5 text-xs"
              style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-fg)", background: "#FFFFFF" }}
            >
              {permissionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleShare}
              disabled={loading || !email.trim()}
              className="px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{
                border: "1px solid var(--workspace-fg)",
                color: "var(--workspace-fg)",
                background: "#FFFFFF",
                opacity: loading || !email.trim() ? 0.5 : 1,
              }}
            >
              Share
            </button>
          </div>
        </div>

        {/* Current shares */}
        <div className="px-5 py-3 max-h-60 overflow-y-auto">
          {shares.length === 0 ? (
            <p className="text-xs py-2" style={{ color: "var(--workspace-muted)" }}>Not shared with anyone yet</p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-xs" style={{ color: "var(--workspace-fg)" }}>
                      {share.sharedWithEmail ?? share.sharedWithUserId}
                    </span>
                    <span className="text-[10px] ml-2 px-1 py-0.5" style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)" }}>
                      {share.permission}
                    </span>
                  </div>
                  <button onClick={() => handleRevoke(share.id)} className="p-1" style={{ color: "var(--workspace-muted)" }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
