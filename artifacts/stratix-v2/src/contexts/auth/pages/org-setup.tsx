import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function OrgSetupPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function parseErrorMessage(body: string): string {
    try {
      const parsed = JSON.parse(body);
      return parsed.error || parsed.message || body;
    } catch {
      return body;
    }
  }

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
        const msg = parseErrorMessage(err.body || err.message);
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
    <div className="min-h-screen bg-[#F6F5F4] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <span className="text-lg font-semibold text-[#0A0A0A]">Stratix</span>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mb-4">Step 2 of 3</p>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#0A0A0A] mb-1">Create your organization</h2>
          <p className="text-sm text-[#404040] mb-6">
            This is the workspace where your team will collaborate.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#404040] mb-1.5">Organization name</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Create Organization
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
