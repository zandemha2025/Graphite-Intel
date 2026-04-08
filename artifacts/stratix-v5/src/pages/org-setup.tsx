import { useState } from "react";
import { useLocation } from "wouter";

export function OrgSetup() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/org", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (res.ok) setLocation("/onboarding");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white text-sm font-bold">S</div>
        </div>
        <h1 className="font-editorial text-[28px] text-center text-[var(--text-primary)] mb-1">Set up your organization</h1>
        <p className="text-body text-[var(--text-secondary)] text-center mb-8">This will be your workspace on Stratix</p>
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-caption text-[var(--text-secondary)] mb-1 block">Organization name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" required className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" /></div>
            <button type="submit" disabled={loading || !name.trim()} className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
