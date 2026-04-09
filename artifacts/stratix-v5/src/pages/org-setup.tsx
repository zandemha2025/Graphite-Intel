import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function OrgSetup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        // Refresh auth so AuthProvider picks up the new orgId
        await queryClient.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
        // Small delay to let the auth refetch complete
        await new Promise((r) => setTimeout(r, 500));
        setLocation("/onboarding");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Failed to create organization (${res.status})`);
      }
    } catch {
      setError("Unable to connect. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
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
            <div>
              <label className="text-caption text-[var(--text-secondary)] mb-1 block">Organization name</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Acme Corp" required className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" />
            </div>
            {error && (
              <div className="rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20 px-3 py-2">
                <p className="text-caption text-[var(--error)]">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading || !name.trim()} className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
