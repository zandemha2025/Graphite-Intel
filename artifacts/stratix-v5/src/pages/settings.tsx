import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useSaveCompanyProfile,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useTabParam } from "@/hooks/use-tab-param";
import {
  User,
  Users,
  Shield,
  Save,
  Loader2,
  Check,
  Copy,
  Key,
  Plus,
  ShieldCheck,
  FileText,
  Mail,
  CreditCard,
  LogOut,
  Trash2,
} from "lucide-react";

type Tab = "profile" | "team" | "security" | "billing";

/* ── Profile Tab ── */

function ProfileTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() },
  });
  const saveProfile = useSaveCompanyProfile();

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    stage: "",
    revenueRange: "",
    competitors: "",
    strategicPriorities: "",
  });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      const p = profile as unknown as Record<string, string>;
      setForm({
        companyName: p.companyName || "",
        industry: p.industry || "",
        stage: p.stage || "",
        revenueRange: p.revenueRange || "",
        competitors: p.competitors || "",
        strategicPriorities: p.strategicPriorities || "",
      });
    }
  }, [profile]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = useCallback(() => {
    saveProfile.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCompanyProfileQueryKey() });
          setDirty(false);
          setSaved(true);
          toast({ title: "Profile saved" });
          setTimeout(() => setSaved(false), 3000);
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
        },
      }
    );
  }, [form, saveProfile, queryClient, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const fields: { key: string; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: "companyName", label: "Company Name", placeholder: "Acme Corp" },
    { key: "industry", label: "Industry", placeholder: "SaaS, FinTech, Healthcare..." },
    { key: "stage", label: "Stage", placeholder: "Series B, Growth, Public..." },
    { key: "revenueRange", label: "Revenue Range", placeholder: "$10M - $50M" },
    { key: "competitors", label: "Competitors", placeholder: "Competitor A, Competitor B..." },
    { key: "strategicPriorities", label: "Strategic Priorities", placeholder: "Market expansion, product-led growth...", multiline: true },
  ];

  return (
    <div className="space-y-6 max-w-xl">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
            {f.label}
          </label>
          {f.multiline ? (
            <textarea
              value={form[f.key as keyof typeof form]}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={3}
              className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
            />
          ) : (
            <input
              type="text"
              value={form[f.key as keyof typeof form]}
              onChange={(e) => updateField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={!dirty || saveProfile.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          {saveProfile.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved ? "Saved" : "Save Changes"}
        </button>
        {saved && (
          <span className="text-caption text-[var(--success)]">Profile updated successfully</span>
        )}
      </div>
    </div>
  );
}

/* ── Team Tab ── */

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/team", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMembers(Array.isArray(data) ? data : data.members || []);
        }
      } catch {
        // silently fail — show empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roleColor = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin" || r === "owner") return "bg-[var(--accent)]/10 text-[var(--accent)]";
    if (r === "editor") return "bg-[#5B7F3B]/10 text-[#5B7F3B]";
    return "bg-[var(--text-muted)]/10 text-[var(--text-muted)]";
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Team Members</h3>
          <p className="text-caption text-[var(--text-muted)]">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors">
          <Mail className="h-3.5 w-3.5" />
          Invite Member
        </button>
      </div>

      {/* Member list */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
        {members.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-body-sm text-[var(--text-secondary)]">No team members yet</p>
            <p className="text-caption text-[var(--text-muted)] mt-1">Invite your team to collaborate on strategic intelligence.</p>
          </div>
        ) : (
          members.map((m) => (
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
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${roleColor(m.role)}`}>
                {m.role}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Security Tab ── */

function PasswordChangeCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const getPasswordStrength = (password: string): "weak" | "medium" | "strong" => {
    if (!password) return "weak";
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;

    if (strength <= 1) return "weak";
    if (strength <= 2) return "medium";
    return "strong";
  };

  const strength = getPasswordStrength(newPassword);
  const strengthColor = {
    weak: "text-[#E74C3C] bg-[#E74C3C]/10",
    medium: "text-[#F39C12] bg-[#F39C12]/10",
    strong: "text-[var(--success)] bg-[var(--success)]/10",
  };

  const isFormValid = currentPassword && newPassword && confirmPassword === newPassword && newPassword.length >= 8;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated successfully" });
    }, 1000);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Key className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Change Password</h3>
          <p className="text-caption text-[var(--text-muted)] mt-0.5">
            Update your password to keep your account secure.
          </p>
        </div>
      </div>

      <div className="space-y-4 ml-12">
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password"
            className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          {newPassword && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    strength === "weak" ? "w-1/3 bg-[#E74C3C]" : strength === "medium" ? "w-2/3 bg-[#F39C12]" : "w-full bg-[var(--success)]"
                  }`}
                />
              </div>
              <span className={`text-[11px] font-medium capitalize px-2 py-0.5 rounded-full ${strengthColor[strength]}`}>
                {strength}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            className={`w-full px-3 py-2.5 rounded-[var(--radius-lg)] border ${
              confirmPassword && newPassword !== confirmPassword ? "border-[#E74C3C]" : "border-[var(--border)]"
            } bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20`}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-caption text-[#E74C3C] mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className="px-4 py-2.5 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 mt-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" />
              Saving...
            </>
          ) : (
            "Save Password"
          )}
        </button>
      </div>
    </div>
  );
}

function ActiveSessionsCard() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([
    { id: 1, device: "Chrome on macOS", status: "Current session", lastActive: null },
    { id: 2, device: "Safari on iPhone", status: "Last active 2 hours ago", lastActive: "2 hours ago" },
  ]);

  const handleRevoke = (id: number) => {
    setSessions(sessions.filter(s => s.id !== id));
    toast({ title: "Session revoked" });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <LogOut className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Active Sessions</h3>
          <p className="text-caption text-[var(--text-muted)] mt-0.5">
            Manage your active sessions across devices.
          </p>
        </div>
      </div>

      <div className="ml-12 space-y-3">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)]">
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-[var(--text-primary)]">{session.device}</p>
              <p className="text-caption text-[var(--text-muted)]">{session.status}</p>
            </div>
            <button
              onClick={() => handleRevoke(session.id)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] text-body-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors shrink-0 ml-4"
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerZoneCard() {
  const { toast } = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isConfirmed = deleteConfirm.toUpperCase() === "DELETE";

  const handleDeleteAccount = () => {
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setDeleteConfirm("");
      toast({ title: "Account deletion requested" });
    }, 1000);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-[var(--error)] bg-[var(--error)]/5 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--error)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Trash2 className="h-4 w-4 text-[var(--error)]" />
        </div>
        <div>
          <h3 className="text-body-sm font-medium text-[var(--error)]">Danger Zone</h3>
          <p className="text-caption text-[var(--text-muted)] mt-0.5">
            Permanently delete your account and all associated data.
          </p>
        </div>
      </div>

      <div className="ml-12 space-y-4">
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-1.5">
            Type "DELETE" to confirm account deletion
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-[var(--error)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--error)]/20"
          />
        </div>

        <button
          onClick={handleDeleteAccount}
          disabled={!isConfirmed || deleting}
          className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] bg-[var(--error)] text-white text-body-sm font-medium hover:bg-[#C0392B] transition-colors disabled:opacity-40"
        >
          {deleting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" />
              Deleting...
            </>
          ) : (
            "Delete Account"
          )}
        </button>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [twoFactor, setTwoFactor] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateKey = () => {
    // UI-only: generate a fake key for demonstration
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const key = "sk-stx-" + Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setGeneratedKey(key);
    setCopied(false);
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      {/* Password Change */}
      <PasswordChangeCard />

      {/* Two-Factor Authentication */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Two-Factor Authentication</h3>
              <p className="text-caption text-[var(--text-muted)] mt-0.5">
                Add an extra layer of security to your account with 2FA.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTwoFactor(!twoFactor)}
            className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 mt-1 ${
              twoFactor ? "bg-[var(--accent)]" : "bg-[var(--border)]"
            }`}
          >
            <span
              className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
                twoFactor ? "translate-x-[20px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>
        {twoFactor && (
          <p className="mt-3 ml-12 text-caption text-[var(--success)]">
            Two-factor authentication is enabled.
          </p>
        )}
      </div>

      {/* API Keys */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Key className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-body-sm font-medium text-[var(--text-primary)]">API Keys</h3>
            <p className="text-caption text-[var(--text-muted)] mt-0.5">
              Generate keys to access the Stratix API programmatically.
            </p>
          </div>
        </div>

        {generatedKey && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--background)] border border-[var(--border)]">
            <p className="text-caption text-[var(--text-muted)] mb-1.5">Your new API key (copy it now, it won't be shown again):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] font-mono text-[var(--text-primary)] bg-[var(--surface)] px-2 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] truncate">
                {generatedKey}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors shrink-0"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateKey}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] text-body-sm font-medium text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate Key
        </button>
      </div>

      {/* Active Sessions */}
      <ActiveSessionsCard />

      {/* Audit Log */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Audit Log</h3>
            <p className="text-caption text-[var(--text-muted)] mt-0.5">
              Review all account and team activity.
            </p>
          </div>
          <button className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border)] text-body-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors">
            View Log
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <DangerZoneCard />
    </div>
  );
}

/* ── Billing Tab ── */

function BillingTab() {
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = () => {
    setUpgrading(true);
    setTimeout(() => {
      setUpgrading(false);
      toast({ title: "Upgrade initiated" });
    }, 1000);
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Current Plan Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-body-sm font-medium text-[var(--text-primary)]">Free Plan</h3>
              <p className="text-caption text-[var(--text-muted)] mt-0.5">
                Current plan with basic features
              </p>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-body-sm font-medium text-[var(--text-primary)]">Credits Used</span>
              <span className="text-body-sm font-medium text-[var(--text-secondary)]">20 / 100</span>
            </div>
            <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full w-1/5 bg-[var(--accent)] rounded-full" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-body-sm font-medium text-[var(--text-primary)]">Team Members</span>
              <span className="text-body-sm font-medium text-[var(--text-secondary)]">1 / 3</span>
            </div>
            <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[#5B7F3B] rounded-full" />
            </div>
          </div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40"
        >
          {upgrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" />
              Upgrading...
            </>
          ) : (
            "Upgrade to Pro"
          )}
        </button>
      </div>

      {/* Features Comparison */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-body-sm font-medium text-[var(--text-primary)] mb-4">Plan Features</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 pr-4 font-medium text-[var(--text-primary)]">Feature</th>
                <th className="text-center py-3 px-2 font-medium text-[var(--text-secondary)]">Free</th>
                <th className="text-center py-3 px-2 font-medium text-[var(--text-secondary)]">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text-primary)]">Monthly Credits</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">100</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">1,000</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text-primary)]">Team Members</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">3</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">Unlimited</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text-primary)]">API Access</td>
                <td className="text-center py-3 px-2">
                  <Check className="h-4 w-4 text-[var(--success)] mx-auto" />
                </td>
                <td className="text-center py-3 px-2">
                  <Check className="h-4 w-4 text-[var(--success)] mx-auto" />
                </td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text-primary)]">Priority Support</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">-</td>
                <td className="text-center py-3 px-2">
                  <Check className="h-4 w-4 text-[var(--success)] mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-[var(--text-primary)]">Custom Integrations</td>
                <td className="text-center py-3 px-2 text-[var(--text-muted)]">-</td>
                <td className="text-center py-3 px-2">
                  <Check className="h-4 w-4 text-[var(--success)] mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Page ── */

export function Settings() {
  const [tab, setTab] = useTabParam<Tab>("profile", ["profile", "team", "security", "billing"]);

  return (
    <div className="px-6 py-6 max-w-3xl">
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Settings</h1>

      <div className="flex items-center gap-1 mt-6 border-b border-[var(--border)]">
        {([
          { id: "profile" as Tab, label: "Profile", icon: User },
          { id: "team" as Tab, label: "Team", icon: Users },
          { id: "security" as Tab, label: "Security", icon: Shield },
          { id: "billing" as Tab, label: "Billing", icon: CreditCard },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-body-sm border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "profile" && <ProfileTab />}
        {tab === "team" && <TeamTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "billing" && <BillingTab />}
      </div>
    </div>
  );
}
