import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { api, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Member {
  id: number;
  fullName: string;
  email: string;
  role: "owner" | "admin" | "analyst" | "viewer";
  avatarUrl?: string;
}

interface Invite {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  owner: "info",
  admin: "success",
  analyst: "default",
  viewer: "warning",
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("analyst");

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["team", "members"],
    queryFn: () => api<Member[]>("/team/members"),
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["team", "invites"],
    queryFn: () => api<Invite[]>("/team/invites"),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => apiPost("/team/invites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invites"] });
      toast.success("Invitation sent");
      setInviteEmail("");
      setInviteRole("analyst");
    },
    onError: () => toast.error("Failed to send invitation"),
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiPatch(`/team/members/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/team/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/team/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invites"] });
      toast.success("Invitation revoked");
    },
    onError: () => toast.error("Failed to revoke invitation"),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  return (
    <Page title="Team" subtitle="Manage your team members and invitations">
      {/* Invite form */}
      <Card className="mb-8">
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Invite a Team Member</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[#9CA3AF] mb-1">Email</label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-[#9CA3AF] mb-1">Role</label>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={ROLE_OPTIONS} />
          </div>
          <Button onClick={handleInvite} loading={inviteMutation.isPending} disabled={!inviteEmail.trim()}>
            Send Invite
          </Button>
        </div>
      </Card>

      {/* Members list */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Members</h2>
        {membersLoading ? (
          <TableSkeleton rows={4} />
        ) : !members?.length ? (
          <Card className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">No team members yet</p>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Member</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Role</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-[#E5E5E3] last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F3F3F1] flex items-center justify-center text-xs font-medium text-[#404040]">
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#0A0A0A]">{m.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#404040]">{m.email}</td>
                    <td className="px-4 py-3">
                      {m.role === "owner" ? (
                        <Badge variant={ROLE_VARIANT[m.role]}>{m.role}</Badge>
                      ) : (
                        <Select
                          value={m.role}
                          onChange={(e) => roleChangeMutation.mutate({ id: m.id, role: e.target.value })}
                          options={ROLE_OPTIONS}
                          className="w-28 h-7 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.role !== "owner" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#DC2626] hover:text-[#B91C1C]"
                          onClick={() => removeMutation.mutate(m.id)}
                          loading={removeMutation.isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending invites */}
      <div>
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Pending Invitations</h2>
        {invitesLoading ? (
          <TableSkeleton rows={2} />
        ) : !invites?.length ? (
          <Card className="flex items-center justify-center h-16">
            <p className="text-sm text-[#9CA3AF]">No pending invitations</p>
          </Card>
        ) : (
          <div className="rounded-xl border border-[#E5E5E3] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E3] bg-[#F6F5F4]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#404040]">Sent</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#404040]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#E5E5E3] last:border-0">
                    <td className="px-4 py-3 text-[#0A0A0A]">{inv.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_VARIANT[inv.role] ?? "default"}>{inv.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{inv.createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#DC2626] hover:text-[#B91C1C]"
                        onClick={() => revokeMutation.mutate(inv.id)}
                        loading={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
