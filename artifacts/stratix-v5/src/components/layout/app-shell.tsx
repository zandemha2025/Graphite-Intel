import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { FULL_BLEED_ROUTES } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";

/* ── Notification types ── */

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
};

/* ── Notification Bell ── */

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Fetch unread count */
  useEffect(() => {
    fetch("/api/notifications/unread-count", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setUnreadCount(d.count ?? 0))
      .catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/notifications/unread-count", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d) => setUnreadCount(d.count ?? 0))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setLoading(true);
        fetch("/api/notifications?limit=10", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d) => setNotifications(Array.isArray(d) ? d : d?.notifications || []))
          .catch(() => setNotifications([]))
          .finally(() => setLoading(false));
      }
      return !prev;
    });
  }, []);

  const handleMarkRead = useCallback((notifId: string) => {
    fetch(`/api/notifications/${notifId}/read`, {
      method: "PATCH",
      credentials: "include",
    }).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[10px] font-semibold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[calc(100vw-32px)] sm:w-80 max-h-96 overflow-auto rounded-xl shadow-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <p className="text-body-sm font-medium text-[var(--text-primary)]">Notifications</p>
          </div>
          {loading ? (
            <div className="py-6 text-center text-caption text-[var(--text-muted)]">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-caption text-[var(--text-muted)]">No notifications</div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-elevated)] transition-colors ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{n.title}</p>
                      <p className="text-caption text-[var(--text-secondary)] line-clamp-2 mt-0.5">{n.body}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{n.createdAt}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  user?: { name?: string; email?: string } | null;
  orgName?: string | null;
  onLogout?: () => void;
}

export function AppShell({ children, user, orgName, onLogout }: AppShellProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const isFullBleed = FULL_BLEED_ROUTES.some(
    (route) => location === route || location.startsWith(route + "/")
  );

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {!isMobile && <Sidebar user={user} orgName={orgName} onLogout={onLogout} />}

      <div className={`flex flex-1 flex-col min-w-0 ${!isMobile ? "ml-[48px]" : ""}`}>
        {/* Top header bar with notification bell */}
        <header className="flex items-center justify-end gap-2 px-6 py-2 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <NotificationBell />
          {user?.name && (
            <span className="text-caption text-[var(--text-muted)] ml-1">{user.name}</span>
          )}
        </header>
        <main className={isFullBleed ? "flex-1 overflow-hidden" : `flex-1 overflow-auto ${isMobile ? "p-4 pb-20" : "p-8"}`}>
          {children}
        </main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
}
