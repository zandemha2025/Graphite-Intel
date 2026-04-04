import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

type Session = {
  id: number;
  title: string;
  createdAt: string;
};

type Props = {
  sessions: Session[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number, e: React.MouseEvent) => void;
  onCreate: () => void;
  isCreating?: boolean;
};

export function SessionHistory({
  sessions,
  activeId,
  onSelect,
  onDelete,
  onCreate,
  isCreating,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="flex flex-col shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 44 : 220,
        background: "#F9FAFB",
        borderRight: "1px solid #E5E7EB",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-3 shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB", minHeight: 52 }}
      >
        {!collapsed && (
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "#9CA3AF" }}
          >
            Sessions
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1 rounded transition-colors"
          style={{ color: "#9CA3AF", marginLeft: collapsed ? "auto" : undefined }}
          title={collapsed ? "Expand sessions" : "Collapse sessions"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!collapsed ? (
        <>
          <button
            onClick={onCreate}
            disabled={isCreating}
            className="mx-3 my-2 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors disabled:opacity-40 shrink-0"
            style={{
              border: "1px solid #E5E7EB",
              color: "#4F46E5",
              background: "#FFFFFF",
              fontWeight: 500,
            }}
          >
            <Plus className="w-3 h-3" />
            New Session
          </button>

          <div className="flex-1 overflow-y-auto py-1">
            {sessions.length === 0 ? (
              <p className="text-xs text-center px-3 py-4" style={{ color: "#9CA3AF" }}>
                No sessions yet
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelect(session.id)}
                  className="group flex items-center gap-2 mx-1 px-2 py-2 rounded cursor-pointer transition-colors"
                  style={{
                    background: activeId === session.id ? "#EEF2FF" : "transparent",
                    color: activeId === session.id ? "#4F46E5" : "#374151",
                  }}
                >
                  <MessageSquare
                    className="w-3 h-3 shrink-0"
                    style={{ opacity: 0.6 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-medium">{session.title}</p>
                    <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
                      {format(new Date(session.createdAt), "MMM d")}
                    </p>
                  </div>
                  <button
                    onClick={(e) => onDelete(session.id, e)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    style={{ color: "#9CA3AF" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-2 gap-0.5">
          <button
            onClick={onCreate}
            disabled={isCreating}
            className="p-2 rounded transition-colors disabled:opacity-40"
            title="New Session"
            style={{ color: "#4F46E5" }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {sessions.slice(0, 10).map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              title={s.title}
              className="p-2 rounded transition-colors"
              style={{
                background: activeId === s.id ? "#EEF2FF" : "transparent",
                color: activeId === s.id ? "#4F46E5" : "#9CA3AF",
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
