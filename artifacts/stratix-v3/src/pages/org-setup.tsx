import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrgSetupPage() {
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const createOrg = useMutation({
    mutationFn: () => apiPost<{ org: unknown }>("/org", { name: orgName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      setLocation("/onboarding");
    },
    onError: (err: Error) => {
      setError(err.message || "Could not create organization");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    createOrg.mutate();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1] text-white font-bold text-sm">
            S
          </div>
          <h1 className="text-xl font-semibold text-[#FAFAFA]">Set Up Your Organization</h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Create or join an organization to get started.
          </p>
        </div>

        <div className="rounded-xl bg-[#18181B] p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="orgName"
              label="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Inc."
              required
              error={error || undefined}
            />

            <Button type="submit" loading={createOrg.isPending} className="mt-2 w-full">
              Create Organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
