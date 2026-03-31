import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Trash2, UserPlus } from "lucide-react";

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

  const fetch_ = async () => {
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
  };

  useState(() => {
    fetch_();
  });

  return { org, members, invites, loading, error, refresh: fetch_ };
}

export function Team() {
  const { data: auth } = useGetCurrentAuthUser();
  const { org, members, invites, loading, error, refresh } = useOrg();
  const { toast } = useToast();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const isAdmin = auth?.user && (auth.user as any).orgRole === "admin";
  const currentUserId = auth?.user?.id;

  const createInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/org/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create invite");
      }

      const invite = await res.json();
      const link = `${window.location.origin}/api/join?token=${invite.token}`;

      await navigator.clipboard.writeText(link).catch(() => {});
      toast({ title: "Invite link copied to clipboard", description: link.substring(0, 60) + "..." });
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
      refresh();
    } catch {
      toast({ title: "Error", description: "Failed to revoke invite", variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    setRemovingId(userId);
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
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-light mb-1" style={{ color: "var(--workspace-fg)" }}>{org.name}</h1>
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--workspace-muted)" }}>{org.slug}</p>
          </div>
          {isAdmin && (
            <button
              onClick={createInvite}
              disabled={inviteLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-40"
              style={{ background: "var(--workspace-fg)", color: "#FFFFFF" }}
              data-testid="btn-invite-team"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {inviteLoading ? "Generating..." : "Invite Team Members"}
            </button>
          )}
        </div>

        <div style={{ border: "1px solid var(--workspace-border)" }}>
          <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>Team Members</span>
          </div>
          {members.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ background: "#FFFFFF" }}>
              <p className="text-sm" style={{ color: "var(--workspace-muted)" }}>No members yet</p>
            </div>
          ) : (
            members.map((member, i) => (
              <div key={member.id} className="px-5 py-4 flex items-center gap-4" style={{ background: "#FFFFFF", borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined }}>
                <Avatar className="h-8 w-8 border" style={{ borderColor: "var(--workspace-border)" }}>
                  <AvatarImage src={member.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs" style={{ background: "var(--workspace-muted-bg)", color: "var(--workspace-fg)" }}>
                    {member.firstName?.[0] || member.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "var(--workspace-fg)" }}>
                    {member.firstName
                      ? `${member.firstName} ${member.lastName || ""}`.trim()
                      : member.email || "Unknown"}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--workspace-muted)" }}>{member.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5" style={{
                    border: "1px solid var(--workspace-border)",
                    color: "var(--workspace-muted)",
                  }}>
                    {member.role}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--workspace-muted)", opacity: 0.6 }}>
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  {isAdmin && member.userId !== currentUserId && (
                    <button
                      onClick={() => removeMember(member.userId)}
                      disabled={removingId === member.userId}
                      className="p-1 transition-colors"
                      style={{ color: "var(--workspace-muted)" }}
                      title="Remove member"
                      data-testid={`btn-remove-member-${member.userId}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && invites.length > 0 && (
        <div>
          <div style={{ border: "1px solid var(--workspace-border)" }}>
            <div className="px-5 py-3" style={{ background: "var(--workspace-muted-bg)", borderBottom: "1px solid var(--workspace-border)" }}>
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--workspace-muted)" }}>Pending Invites</span>
            </div>
            {invites.map((invite, i) => (
              <div key={invite.id} className="px-5 py-4 flex items-center gap-4" style={{ background: "#FFFFFF", borderTop: i > 0 ? `1px solid var(--workspace-border)` : undefined }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono truncate" style={{ color: "var(--workspace-fg)" }}>
                    {window.location.origin}/api/join?token={invite.token.substring(0, 12)}...
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--workspace-muted)" }}>
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(invite.token)}
                    className="p-1.5 transition-colors"
                    style={{ color: "var(--workspace-muted)" }}
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    disabled={revokingId === invite.id}
                    className="p-1.5 transition-colors"
                    style={{ color: "var(--workspace-muted)" }}
                    title="Revoke invite"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
