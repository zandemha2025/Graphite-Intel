import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api, apiPost, apiPatch, apiDelete } from "@/lib/api";
import {
  User,
  Users,
  Mail,
  Trash2,
  ExternalLink,
  Lock,
  FileCheck,
  Globe,
  KeyRound,
} from "lucide-react";

/* ---------- Types ---------- */

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: "owner" | "admin" | "analyst" | "viewer";
}

interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  createdAt: string;
}

/* ---------- Skeleton ---------- */

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#27272A] ${className ?? ""}`}
    />
  );
}

/* ---------- Tabs ---------- */

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "team", label: "Team" },
  { id: "security", label: "Security" },
];

/* ---------- Role badge ---------- */

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "owner":
      return <Badge variant="indigo">Owner</Badge>;
    case "admin":
      return <Badge variant="info">Admin</Badge>;
    case "analyst":
      return <Badge variant="success">Analyst</Badge>;
    case "viewer":
      return <Badge variant="default">Viewer</Badge>;
    default:
      return <Badge variant="default">{role}</Badge>;
  }
}

/* ---------- Profile Tab ---------- */

function ProfileTab() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <Card className="flex flex-col items-center justify-center py-16">
        <User className="mb-3 h-8 w-8 text-[#3F3F46]" />
        <p className="text-sm text-[#A1A1AA]">Loading profile...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-sm font-semibold text-white">
            {user.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
              {user.fullName}
            </h3>
            <p className="mt-0.5 text-sm text-[#A1A1AA]">{user.email}</p>
            <div className="mt-2">
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>
      </Card>

      {user.orgName && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#FAFAFA]">
                Organization
              </h3>
              <p className="mt-0.5 text-sm text-[#A1A1AA]">{user.orgName}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/context")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Company Profile
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Team Tab ---------- */

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function TeamTab() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "analyst" | "viewer">(
    "analyst",
  );

  const { data: members, isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["team", "members"],
    queryFn: () =>
      api<TeamMember[]>("/org/members"),
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<TeamInvite[]>({
    queryKey: ["team", "invites"],
    queryFn: () =>
      api<TeamInvite[]>("/org/invites"),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiPost("/org/invites", { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invites"] });
      setInviteEmail("");
      toast.success("Invite sent");
    },
    onError: () => {
      toast.error("Failed to send invite");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/org/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Member removed");
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/org/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invites"] });
      toast.success("Invite revoked");
    },
    onError: () => {
      toast.error("Failed to revoke invite");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({
      id,
      role,
    }: {
      id: string;
      role: TeamMember["role"];
    }) => apiPatch(`/org/members/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Role updated");
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });

  const isLoading = membersLoading || invitesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">
          Invite a team member
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              id="invite-email"
              label="Email address"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (!emailTouched) setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
            />
            {emailTouched && inviteEmail.trim() && !isValidEmail(inviteEmail) && (
              <p className="mt-1 text-xs text-red-500">Please enter a valid email address</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="invite-role"
              className="text-sm font-medium text-[#FAFAFA]"
            >
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(
                  e.target.value as "admin" | "analyst" | "viewer",
                )
              }
              className="h-9 rounded-lg border border-[#27272A] bg-[#18181B] px-3 text-sm text-[#FAFAFA] focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
            >
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => inviteMutation.mutate()}
            loading={inviteMutation.isPending}
            disabled={!inviteEmail.trim() || !isValidEmail(inviteEmail)}
          >
            <Mail className="h-3.5 w-3.5" />
            Send Invite
          </Button>
        </div>
      </Card>

      {/* Members list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">Team members</h3>
        {members && members.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-[#27272A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#A1A1AA]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-[#27272A] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[#FAFAFA]">
                      {member.fullName}
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      {member.role === "owner" ? (
                        <RoleBadge role="owner" />
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            changeRoleMutation.mutate({
                              id: member.id,
                              role: e.target.value as TeamMember["role"],
                            })
                          }
                          className="rounded border border-[#27272A] bg-[#18181B] px-2 py-1 text-xs text-[#FAFAFA] focus:border-[#6366F1] focus:outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.role !== "owner" && (
                        <button
                          onClick={() =>
                            removeMemberMutation.mutate(member.id)
                          }
                          className="rounded p-1 text-[#71717A] hover:bg-[#27272A] hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-10">
            <Users className="mb-3 h-8 w-8 text-[#3F3F46]" />
            <p className="text-sm font-medium text-[#FAFAFA]">
              No team members yet
            </p>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Send an invite to get started.
            </p>
          </Card>
        )}
      </div>

      {/* Pending invites */}
      {invites && invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Pending invites
          </h3>
          <div className="overflow-hidden rounded-lg border border-[#27272A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]">
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#A1A1AA]">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#A1A1AA]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr
                    key={invite.id}
                    className="border-b border-[#27272A] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[#A1A1AA]">
                      {invite.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={invite.role} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-500 hover:text-red-600"
                        onClick={() =>
                          revokeInviteMutation.mutate(invite.id)
                        }
                        loading={revokeInviteMutation.isPending}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Security Tab ---------- */

const SECURITY_POLICIES = [
  {
    title: "Data Encryption",
    description:
      "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Database fields containing PII are additionally encrypted at the application layer.",
    icon: Lock,
    label: "Standard",
  },
  {
    title: "SOC 2 Type II",
    description:
      "Stratix follows SOC 2 controls for security, availability, and confidentiality. Annual audits are conducted by an independent third party.",
    icon: FileCheck,
    label: "Policy",
  },
  {
    title: "GDPR Compliance",
    description:
      "User data is processed in accordance with GDPR. Data subjects can request access, correction, or deletion of their personal data at any time.",
    icon: Globe,
    label: "Policy",
  },
  {
    title: "Access Controls",
    description:
      "Role-based access control (RBAC) restricts data visibility by team role. All API requests are authenticated and authorized. Session tokens expire after 24 hours of inactivity.",
    icon: KeyRound,
    label: "Standard",
  },
];

function SecurityTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#A1A1AA]">
        Security policies and compliance standards for your Stratix workspace.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECURITY_POLICIES.map((policy) => {
          const Icon = policy.icon;
          return (
            <Card key={policy.title}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#27272A]">
                    <Icon className="h-4 w-4 text-[#6366F1]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#FAFAFA]">
                    {policy.title}
                  </h4>
                </div>
                <Badge variant="default">{policy.label}</Badge>
              </div>
              <p className="text-xs leading-relaxed text-[#A1A1AA]">
                {policy.description}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export default function SettingsPage() {
  return (
    <Page
      title="Settings"
      subtitle="Account, team, and security"
    >
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "profile") return <ProfileTab />;
          if (activeTab === "team") return <TeamTab />;
          return <SecurityTab />;
        }}
      </Tabs>
    </Page>
  );
}
