import { useState, useEffect } from "react";
import { Activity, FileText, BarChart3, Share2, MessageSquare, CheckCircle, Plus, Clock } from "lucide-react";

interface ActivityItem {
  id: number;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: number;
  resourceTitle: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="h-3.5 w-3.5" />,
  updated: <FileText className="h-3.5 w-3.5" />,
  commented: <MessageSquare className="h-3.5 w-3.5" />,
  shared: <Share2 className="h-3.5 w-3.5" />,
  completed: <CheckCircle className="h-3.5 w-3.5" />,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const fetchActivity = async (newOffset = 0) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activity?limit=${limit}&offset=${newOffset}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(newOffset === 0 ? data.items : [...items, ...data.items]);
        setTotal(data.total);
        setOffset(newOffset);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl font-light mb-2" style={{ color: "var(--workspace-fg)" }}>Activity</h1>
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>Recent activity across your workspace</p>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center border border-dashed" style={{ borderColor: "var(--workspace-border)", background: "#FFFFFF" }}>
          <Activity className="h-6 w-6 mx-auto mb-3" style={{ color: "var(--workspace-muted)" }} />
          <p className="text-sm" style={{ color: "var(--workspace-fg)" }}>No activity yet</p>
        </div>
      ) : (
        <div>
          <div className="space-y-0">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 border-l-2 ml-2"
                style={{ borderColor: "var(--workspace-border)" }}
              >
                <div className="mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                  {actionIcons[item.action] ?? <Activity className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: "var(--workspace-fg)" }}>
                    <span className="font-medium">{item.userId}</span>{" "}
                    <span style={{ color: "var(--workspace-muted)" }}>{item.action}</span>{" "}
                    <span>{item.resourceTitle ?? `${item.resourceType} #${item.resourceId}`}</span>
                  </p>
                  <span className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                    <Clock className="h-3 w-3" />
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {items.length < total && (
            <div className="mt-4 text-center">
              <button
                onClick={() => fetchActivity(offset + limit)}
                disabled={loading}
                className="px-4 py-2 text-xs uppercase tracking-widest transition-colors"
                style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
