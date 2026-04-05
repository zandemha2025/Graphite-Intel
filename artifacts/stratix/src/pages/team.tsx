import { useState, useCallback, useEffect } from "react";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import type { AuthUserWithOrg } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Trash2, UserPlus, ChevronDown, Mail, Clock, Shield, ShieldCheck, Crown } from "lucide-react";

type OrgMember = {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
};

type OrgInvite = {
  id: number;
  token: string;
  email: string | null;
  createdByUserId: string;
  expiresAt: string;
  createdAt: string;
};

type Org = {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
};

function useOrg() {
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, membersRes, invitesRes] = await Promise.all([
        fetch("/api/org"),
        fetch("/api/org/members"),
        fetch("/api/org/invites"),
      ]);

      if (!orgRes.ok) throw new Error("Failed to load organization");
      const orgData = await orgRes.json();
      setOrg(orgData);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvites(invitesData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { org, members, invites, loading, error, refresh: fetchData };
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; borderColor: string; color: string; bg: string }> = {
    owner: {
      icon: <Crown className="h-3 w-3" />,
      label: "Owner",
      borderColor: "#D97706",
      color: "#92400E",
      bg: "#FFFBEB",
    },
    admin: {
      icon: <ShieldCheck className="h-3 w-3" />,
      label: "Admin",
      borderColor: "#4F46E5",
      color: "#3730A3",
      bg: "#EEF2FF",
    },
    member: {
      icon: <Shield className="h-3 w-3" />,
      label: "Member",
      borderColor: "var(--workspace-border)",
      color: "var(--workspace-muted)",
      bg: "transparent",
    },
  };

  const c = config[role] || config.member;

  return (
    <span
      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5"
      style={{ border: `1px solid ${c.borderColor}`, color: c.color, background: c.bg }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

function RoleDropdown({
  currentRole,
  onRoleChange,
  disabled,
}: {
  currentRole: string;
  onRoleChange: (role: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const roles = ["admin", "member"];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs font-medium px-2 py-1 transition-colors"
        style={{
          border: "1px solid var(--workspace-border)",
          color: "var(--workspace-muted)",
          background: "#FFFFFF",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {currentRole}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-20 min-w-[120px]"
            style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          >
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onRoleChange(role);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-50"
                style={{
                  color: role === currentRole ? "var(--workspace-fg)" : "var(--workspace-muted)",
                  fontWeight: role === currentRole ? 500 : 400,
                }}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Team() {
  const { data: auth } = useGetCurrentAuthUser();
  const { org, members, invites, loading, error, refresh } = useOrg();
  const { toast } = useToast();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);

  const currentUser = auth?.user as AuthUserWithOrg | undefined;
  const isAdmin = currentUser?.orgRole === "admin" || currentUser?.orgRole === "owner";
  const isOwner = currentUser?.orgRole === "owner";
  const currentUserId = currentUser?.id;

  const createInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/org/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail || undefined, role: inviteRole }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create invite");
      }

      const invite = await res.json();
      const link = `${window.location.origin}/api/join?token=${invite.token}`;

      await navigator.clipboard.writeText(link).catch(() => {});
      toast({
        title: "Invite created",
        description: inviteEmail
          ? `Invite link copied for ${inviteEmail}`
          : "Invite link copied to clipboard",
      });
      setInviteEmail("");
      refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create invite",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/api/join?token=${token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    toast({ title: "Invite link copied" });
  };

  const revokeInvite = async (id: number) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/org/invites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast({ title: "Invite revoked" });
      refresh();
    } catch {
      toast({ title: "Error", description: "Failed to revoke invite", variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    setChangingRoleId(userId);
    try {
      const res = await fetch(`/api/org/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to change role");
      }
      toast({ title: "Role updated" });
      refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to change role",
        variant: "destructive",
      });
    } finally {
      setChangingRoleId(null);
    }
  };

  const removeMember = async (userId: string) => {
    setRemovingId(userId);
    setShowConfirmRemove(null);
    try {
      const res = await fetch(`/api/org/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove member");
      }
      toast({ title: "Member removed" });
      refresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-t animate-spin" style={{ border: "1px solid var(--workspace-border)", borderTopColor: "var(--workspace-fg)", borderRadius: 0 }} />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>{error || "No organization found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-sans text-2xl font-light mb-1" style={{ color: "var(--workspace-fg)" }}>{org.name}</h1>
        <p className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
          {org.slug} &middot; {members.length} member{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Invite Member Section */}
      {isAdmin && (
        <div style={{ border: "1px solid var(--workspace-border)" }}>
          <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
            <span className="text-xs font-medium flex items-center gap-2" style={{ color: "var(--workspace-muted)" }}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite Team Member
            </span>
          </div>
          <div className="px-5 py-4" style={{ background: "#FFFFFF" }}>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--workspace-muted)" }}>
                  Email Address <span className="normal-case tracking-normal opacity-60">(optional)</span>
                </label>
                <div className="flex items-center gap-2 px-3 py-2" style={{ border: "1px solid var(--workspace-border)", background: "#FFFFFF" }}>
                  <Mail className="h-3.5 w-3.5" style={{ color: "var(--workspace-muted)" }} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 text-sm focus:outline-none"
                    style={{ background: "transparent", color: "var(--workspace-fg)", border: "none" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createInvite();
                      }
                    }}
                    data-testid="input-invite-email"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--workspace-muted)" }}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  className="px-3 py-2 text-xs"
                  style={{
                    border: "1px solid var(--workspace-border)",
                    background: "#FFFFFF",
                    color: "var(--workspace-fg)",
                    cursor: "pointer",
                    minWidth: "100px",
                    height: "36px",
                  }}
                  data-testid="select-invite-role"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                onClick={createInvite}
                disabled={inviteLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40"
                style={{ background: "var(--workspace-fg)", color: "#FFFFFF", height: "36px", whiteSpace: "nowrap" }}
                data-testid="btn-invite-team"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {inviteLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: "var(--workspace-muted)", opacity: 0.7 }}>
              A shareable invite link will be generated and copied to your clipboard.
            </p>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div style={{ border: "1px solid var(--workspace-border)" }}>
        <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>Team Members</span>
        </div>
        {members.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "#FFFFFF" }}>
            <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>No members yet</p>
          </div>
        ) : (
          members.map((member, i) => {
            const canChangeRole = isAdmin && member.userId !== currentUserId && member.role !== "owner";
            const canRemove = isAdmin && member.userId !== currentUserId && member.role !== "owner";

            return (
              <div
                key={member.id}
                className="px-5 py-4 flex items-center gap-4"
                style={{ background: "#FFFFFF", borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined }}
              >
                <Avatar className="h-9 w-9 border" style={{ borderColor: "var(--workspace-border)" }}>
                  <AvatarImage src={member.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-fg)" }}>
                    {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate" style={{ color: "var(--workspace-fg)" }}>
                      {member.firstName
                        ? `${member.firstName} ${member.lastName || ""}`.trim()
                        : member.email || "Unknown"}
                    </span>
                    {member.userId === currentUserId && (
                      <span className="text-[9px] px-1.5 py-0.5" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--workspace-muted)" }}>{member.email}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {canChangeRole ? (
                    <RoleDropdown
                      currentRole={member.role}
                      onRoleChange={(newRole) => changeRole(member.userId, newRole)}
                      disabled={changingRoleId === member.userId}
                    />
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                  <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                    <Clock className="h-3 w-3" />
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  {canRemove && (
                    <div className="relative">
                      {showConfirmRemove === member.userId ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => removeMember(member.userId)}
                            disabled={removingId === member.userId}
                            className="px-2 py-1 text-xs font-medium transition-colors"
                            style={{ background: "#DC2626", color: "#FFFFFF", border: "none" }}
                          >
                            {removingId === member.userId ? "..." : "Remove"}
                          </button>
                          <button
                            onClick={() => setShowConfirmRemove(null)}
                            className="px-2 py-1 text-xs font-medium transition-colors"
                            style={{ border: "1px solid var(--workspace-border)", color: "var(--workspace-muted)", background: "#FFFFFF" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirmRemove(member.userId)}
                          className="p-1 transition-colors"
                          style={{ color: "var(--workspace-muted)" }}
                          title="Remove member"
                          data-testid={`btn-remove-member-${member.userId}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending Invites */}
      {isAdmin && invites.length > 0 && (
        <div>
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--workspace-muted)" }}>
                Pending Invites ({invites.length})
              </span>
            </div>
            {invites.map((invite, i) => {
              const isExpired = new Date(invite.expiresAt) < new Date();
              const daysLeft = Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <div
                  key={invite.id}
                  className="px-5 py-4 flex items-center gap-4"
                  style={{
                    background: "#FFFFFF",
                    borderTop: i > 0 ? "1px solid var(--workspace-border)" : undefined,
                    opacity: isExpired ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center justify-center h-9 w-9 shrink-0" style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}>
                    <Mail className="h-4 w-4" style={{ color: "var(--workspace-muted)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {invite.email ? (
                      <div className="text-sm truncate" style={{ color: "var(--workspace-fg)" }}>{invite.email}</div>
                    ) : (
                      <div className="text-xs font-mono truncate" style={{ color: "var(--workspace-muted)" }}>
                        Invite link &middot; {invite.token.substring(0, 8)}...
                      </div>
                    )}
                    <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: isExpired ? "#DC2626" : "var(--workspace-muted)" }}>
                      <Clock className="h-3 w-3" />
                      {isExpired ? "Expired" : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                      <span className="opacity-50">&middot;</span>
                      <span className="opacity-50">Created {new Date(invite.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyInviteLink(invite.token)}
                      className="p-1.5 transition-colors"
                      style={{ color: "var(--workspace-muted)" }}
                      title="Copy invite link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => revokeInvite(invite.id)}
                      disabled={revokingId === invite.id}
                      className="p-1.5 transition-colors"
                      style={{ color: "var(--workspace-muted)", opacity: revokingId === invite.id ? 0.4 : 1 }}
                      title="Revoke invite"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
