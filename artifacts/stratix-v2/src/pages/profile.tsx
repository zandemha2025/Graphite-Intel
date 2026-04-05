import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { api, apiPut } from "@/lib/api";

interface CompanyProfile {
  name: string;
  website: string;
  industry: string;
  size: string;
  description: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery<CompanyProfile>({
    queryKey: ["company", "profile"],
    queryFn: () => api<CompanyProfile>("/company/profile"),
  });

  const [form, setForm] = useState<CompanyProfile>({
    name: "",
    website: "",
    industry: "",
    size: "",
    description: "",
  });

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: (data: CompanyProfile) => apiPut("/company/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "profile"] });
      toast.success("Company profile saved");
    },
    onError: () => toast.error("Failed to save profile"),
  });

  const handleSave = () => saveMutation.mutate(form);
  const update = (field: keyof CompanyProfile, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (isLoading) {
    return (
      <Page title="Profile" subtitle="Your profile settings">
        <PageSkeleton />
      </Page>
    );
  }

  return (
    <Page title="Profile" subtitle="Your profile and company settings">
      {/* User info */}
      <Card className="mb-8">
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Your Account</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#F3F3F1] flex items-center justify-center text-xl font-semibold text-[#404040]">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#0A0A0A]">{user?.fullName}</p>
            <p className="text-xs text-[#9CA3AF]">{user?.email}</p>
          </div>
          <Badge variant="info">{user?.role}</Badge>
        </div>
      </Card>

      {/* Company profile form */}
      <Card>
        <h2 className="text-sm font-semibold text-[#0A0A0A] mb-4">Company Profile</h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1">Company Name</label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1">Website</label>
            <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1">Industry</label>
            <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1">Company Size</label>
            <Input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="e.g. 50-200" />
          </div>
          <div>
            <label className="block text-xs text-[#9CA3AF] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="flex w-full rounded-lg border border-[#E5E5E3] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-colors duration-150 focus:border-[#0A0A0A] focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              placeholder="Brief description of your company..."
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
