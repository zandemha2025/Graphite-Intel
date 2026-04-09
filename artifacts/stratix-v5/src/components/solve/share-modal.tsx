import { useState, useCallback } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ShareModal({
  open,
  onOpenChange,
  conversationId,
  conversationTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: number;
  conversationTitle: string;
}) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<"view" | "comment" | "edit">("view");

  const generateLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sharing/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "conversation",
          resourceId: conversationId,
          permission,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate share link");
      const data = await res.json();
      setShareUrl(data.url || `${window.location.origin}/shared/${data.id || data.shareId}`);
    } catch {
      toast({ title: "Failed to generate share link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [conversationId, permission, toast]);

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast({ title: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl, toast]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setShareUrl(null);
        setCopied(false);
        setLoading(false);
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[var(--accent)]" />
            Share Conversation
          </DialogTitle>
          <DialogDescription>
            {conversationTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Permission toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--text-muted)] min-w-[70px]">Permission</span>
            <div className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
              <button
                type="button"
                onClick={() => { setPermission("view"); setShareUrl(null); }}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  permission === "view"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                View only
              </button>
              <button
                type="button"
                onClick={() => { setPermission("comment"); setShareUrl(null); }}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  permission === "comment"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Can comment
              </button>
              <button
                type="button"
                onClick={() => { setPermission("edit"); setShareUrl(null); }}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                  permission === "edit"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Can edit
              </button>
            </div>
          </div>

          {/* Generate / URL display */}
          {!shareUrl ? (
            <Button
              onClick={generateLink}
              disabled={loading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating link...
                </span>
              ) : (
                "Generate share link"
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-[13px] bg-[var(--surface-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none select-all"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#3C8B4E]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Anyone with the link can view this conversation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
