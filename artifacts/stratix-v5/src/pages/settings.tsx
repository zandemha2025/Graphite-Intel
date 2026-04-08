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
} from "lucide-react";

type Tab = "profile" | "team" | "security";

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
    </div>
  );
}

/* ── Settings Page ── */

export function Settings() {
  const [tab, setTab] = useTabParam<Tab>("profile", ["profile", "team", "security"]);

  return (
    <div className="px-6 py-6 max-w-3xl">
      <h1 className="font-editorial text-[28px] font-medium text-[var(--text-primary)]">Settings</h1>

      <div className="flex items-center gap-1 mt-6 border-b border-[var(--border)]">
        {([
          { id: "profile" as Tab, label: "Profile", icon: User },
          { id: "team" as Tab, label: "Team", icon: Users },
          { id: "security" as Tab, label: "Security", icon: Shield },
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
      </div>
    </div>
  );
}
