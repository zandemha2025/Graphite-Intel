import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-6 w-6 border border-[#E8E4DC]/30 flex items-center justify-center">
        <span className="font-serif font-semibold text-[#E8E4DC] text-xs leading-none">S</span>
      </div>
      <span className="font-serif font-medium text-base uppercase tracking-tight text-[#E8E4DC]">Stratix</span>
    </div>
  );
}

export function OrgSetup() {
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: orgName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create organization");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/onboarding");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create organization",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      <header className="px-8 py-5 flex items-center border-b border-white/8">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/40 border border-[#E8E4DC]/15 px-3 py-1">
                Step 2 of 3
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-6 bg-[#E8E4DC]/60" />
                <div className="h-1 w-6 bg-[#E8E4DC]/60" />
                <div className="h-1 w-6 bg-[#E8E4DC]/15" />
              </div>
            </div>
            <h1 className="font-serif text-5xl font-light text-[#E8E4DC] mb-4 leading-tight">
              Create your organization.
            </h1>
            <p className="text-sm text-[#E8E4DC]/45 leading-relaxed">
              Set up a shared workspace for your team. All members will have access to the same intelligence, reports, and conversations.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40">Organization Name</label>
              <input
                autoFocus
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-transparent border-b border-white/20 py-3 text-[#E8E4DC] text-xl font-serif placeholder:text-[#E8E4DC]/20 focus:outline-none focus:border-[#E8E4DC]/60 transition-colors"
                data-testid="input-org-name"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!orgName.trim() || loading}
                className="bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-[#D4CEC5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="btn-create-org"
              >
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-white/8">
            <p className="text-xs text-[#E8E4DC]/40 mb-1">Have an invite link?</p>
            <p className="text-xs text-[#E8E4DC]/30">
              Ask your admin for an invite link and visit it to join an existing organization.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
