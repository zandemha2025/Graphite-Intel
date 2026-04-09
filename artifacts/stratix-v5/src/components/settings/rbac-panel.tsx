import { useState } from "react";
import {
  Shield,
  Users,
  Eye,
  Edit,
  Plus,
  Search,
  ChevronDown,
  Check,
  X,
  Mail,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---- Types ---- */

type Role = "Admin" | "Editor" | "Analyst" | "Viewer";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface RBACPanelProps {
  teamMembers: TeamMember[];
  onUpdateRole: (memberId: string, role: string) => void;
}

/* ---- Permissions Matrix Data ---- */

const ROLES: Role[] = ["Admin", "Editor", "Analyst", "Viewer"];

type PermValue = true | false | "view";

const PERMISSIONS: { label: string; admin: PermValue; editor: PermValue; analyst: PermValue; viewer: PermValue }[] = [
  { label: "Solve (chat)",         admin: true,  editor: true,  analyst: true,  viewer: false  },
  { label: "Build (notebooks)",    admin: true,  editor: true,  analyst: false, viewer: "view" },
  { label: "Build (boards)",       admin: true,  editor: true,  analyst: false, viewer: "view" },
  { label: "Intelligence",         admin: true,  editor: true,  analyst: true,  viewer: "view" },
  { label: "Connect (sources)",    admin: true,  editor: false, analyst: false, viewer: false  },
  { label: "Connect (workflows)",  admin: true,  editor: true,  analyst: false, viewer: false  },
  { label: "Connect (agents)",     admin: true,  editor: true,  analyst: false, viewer: false  },
  { label: "Settings (team)",      admin: true,  editor: false, analyst: false, viewer: false  },
  { label: "Settings (billing)",   admin: true,  editor: false, analyst: false, viewer: false  },
  { label: "Share content",        admin: true,  editor: true,  analyst: true,  viewer: false  },
  { label: "Export data",          admin: true,  editor: true,  analyst: true,  viewer: false  },
];

/* ---- Helpers ---- */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleColor(role: string) {
  const r = role.toLowerCase();
  if (r === "admin" || r === "owner") return "bg-[var(--accent)]/10 text-[var(--accent)]";
  if (r === "editor") return "bg-[#5B7F3B]/10 text-[#5B7F3B]";
  if (r === "analyst") return "bg-[#D4A03C]/10 text-[#D4A03C]";
  return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
}

function roleDescription(role: Role) {
  switch (role) {
    case "Admin":   return "Full access to everything";
    case "Editor":  return "Create/edit notebooks, boards, intelligence. No team or billing.";
    case "Analyst": return "View and create in Solve/Intelligence. No Connect settings.";
    case "Viewer":  return "Read-only access to shared content.";
  }
}

/* ---- Permission Cell ---- */

function PermCell({ value }: { value: PermValue }) {
  if (value === true) {
    return <Check className="h-3.5 w-3.5 text-[var(--success)] mx-auto" />;
  }
  if (value === "view") {
    return <Eye className="h-3.5 w-3.5 text-[var(--text-muted)] mx-auto" />;
  }
  return <X className="h-3.5 w-3.5 text-[var(--error)] mx-auto" />;
}

/* ---- Role Dropdown ---- */

function RoleDropdown({
  currentRole,
  onChange,
}: {
  currentRole: string;
  onChange: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
      >
        {currentRole}
        <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => {
                  onChange(role);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-[var(--surface-elevated)] transition-colors ${
                  currentRole === role ? "bg-[var(--accent)]/5" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-[var(--text-primary)]">{role}</span>
                  {currentRole === role && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                </div>
                <p className="text-caption text-[var(--text-muted)] mt-0.5">{roleDescription(role)}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Invite Modal ---- */

function InviteModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Viewer");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    setSending(true);
    try {
      await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });
      toast({ title: "Invitation sent to " + email });
      onClose();
    } catch {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h3 className="text-body-sm font-medium text-[var(--text-primary)] mb-4">Invite Team Member</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r} -- {roleDescription(r)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-body-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!email || sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Main RBAC Panel ---- */

export function RBACPanel({ teamMembers, onUpdateRole }: RBACPanelProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Role Management</h3>
          <p className="text-caption text-[var(--text-muted)]">
            Assign roles to control what each team member can access.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Members List */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-body-sm text-[var(--text-secondary)]">
              {search ? "No members match your search" : "No team members yet"}
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-semibold text-[var(--accent)]">
                  {getInitials(m.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                <p className="text-caption text-[var(--text-muted)] truncate">{m.email}</p>
              </div>
              <RoleDropdown
                currentRole={m.role}
                onChange={(role) => onUpdateRole(m.id, role)}
              />
            </div>
          ))
        )}
      </div>

      {/* Permissions Matrix */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-[var(--text-muted)]" />
          <h4 className="text-body-sm font-medium text-[var(--text-primary)]">Permissions Reference</h4>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-primary)]">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="text-center py-3 px-3 font-medium text-[var(--text-secondary)]">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${roleColor(r)}`}>
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, i) => (
                <tr
                  key={perm.label}
                  className={i < PERMISSIONS.length - 1 ? "border-b border-[var(--border)]" : ""}
                >
                  <td className="py-2.5 px-4 text-[var(--text-primary)]">{perm.label}</td>
                  <td className="py-2.5 px-3 text-center"><PermCell value={perm.admin} /></td>
                  <td className="py-2.5 px-3 text-center"><PermCell value={perm.editor} /></td>
                  <td className="py-2.5 px-3 text-center"><PermCell value={perm.analyst} /></td>
                  <td className="py-2.5 px-3 text-center"><PermCell value={perm.viewer} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-2 text-caption text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-[var(--success)]" /> Full access</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-[var(--text-muted)]" /> View only</span>
          <span className="flex items-center gap-1"><X className="h-3 w-3 text-[var(--error)]" /> No access</span>
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
