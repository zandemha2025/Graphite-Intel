import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

interface AuditEntry {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const RESOURCE_TYPES = [
  { value: "", label: "All resources" },
  { value: "report", label: "Report" },
  { value: "notebook", label: "Notebook" },
  { value: "board", label: "Board" },
  { value: "workflow", label: "Workflow" },
  { value: "campaign", label: "Campaign" },
  { value: "member", label: "Member" },
  { value: "connection", label: "Connection" },
];

const ACTIONS = [
  { value: "", label: "All actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "view", label: "View" },
  { value: "export", label: "Export" },
  { value: "share", label: "Share" },
];

const ACTION_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  create: "success",
  update: "info",
  delete: "error",
  view: "default",
  export: "warning",
  share: "info",
};

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "owner" && user?.role !== "admin") {
    return (
      <Page title="Audit Log" subtitle="Activity audit trail">
        <Card className="flex items-center justify-center h-48">
          <p className="text-sm text-[#9CA3AF]">You need admin access to view the audit log.</p>
        </Card>
      </Page>
    );
  }
  return <>{children}</>;
}

export default function AuditLogPage() {
  return (
    <AdminGuard>
      <AuditLogContent />
    </AdminGuard>
  );
}

function AuditLogContent() {
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "20");
  if (resourceType) params.set("resourceType", resourceType);
  if (action) params.set("action", action);
  if (userFilter) params.set("user", userFilter);
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ["audit", resourceType, action, userFilter, dateFrom, dateTo, page],
    queryFn: () => api<AuditResponse>(`/audit?${params.toString()}`),
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <Page title="Audit Log" subtitle="Activity audit trail">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Resource</label>
          <Select value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }} options={RESOURCE_TYPES} className="w-40" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Action</label>
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} options={ACTIONS} className="w-36" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">User</label>
          <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} placeholder="Search user..." className="w-40" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">To</label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : !data?.entries?.length ? (
        <Card className="flex items-center justify-center h-48">
          <p className="text-sm text-[#9CA3AF]">No audit log entries found</p>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040] w-8" />
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Action</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Resource</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-[#E5E5E3] last:border-0 hover:bg-[#F6F5F4] cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        <span className={`inline-block transition-transform ${expanded === entry.id ? "rotate-90" : ""}`}>
                          &#9654;
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{entry.userName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ACTION_VARIANT[entry.action] ?? "default"}>{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#404040]">
                        <span className="text-[#9CA3AF]">{entry.resourceType}/</span>
                        {entry.resourceName}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">{entry.timestamp}</td>
                    </tr>
                    {expanded === entry.id && (
                      <tr key={`${entry.id}-detail`} className="border-b border-[#E5E5E3]">
                        <td colSpan={5} className="px-8 py-3 bg-[#F6F5F4]">
                          <div className="text-xs space-y-1">
                            <p><span className="font-medium text-[#404040]">Resource ID:</span> <span className="text-[#9CA3AF]">{entry.resourceId}</span></p>
                            <p><span className="font-medium text-[#404040]">IP Address:</span> <span className="text-[#9CA3AF]">{entry.ipAddress}</span></p>
                            {entry.details && (
                              <p><span className="font-medium text-[#404040]">Details:</span> <span className="text-[#9CA3AF]">{entry.details}</span></p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">
                Page {page} of {totalPages} ({data.total} entries)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
