import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrgSetupPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/org", { name: orgName.trim() });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate("/onboarding");
    } catch (err) {
      if (err instanceof ApiError) {
        let msg = err.body || err.message;
        try {
          const p = JSON.parse(msg);
          msg = p.error || p.message || msg;
        } catch { /* ignore */ }
        if (msg.includes("already a member")) {
          await queryClient.invalidateQueries({ queryKey: ["auth"] });
          navigate("/explore");
          return;
        }
        setError(msg);
      } else {
        setError("Failed to create organization. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white text-sm font-bold shadow-sm">
            S
          </div>
        </div>

        <p className="text-center text-sm text-[#A3A3A3] mb-6">Step 2 of 3</p>

        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-7">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1.5">
            Create your organization
          </h2>
          <p className="text-sm text-[#525252] mb-7 leading-relaxed">
            This is the workspace where your team will collaborate.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Organization name
              </label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2.5">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create Organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
