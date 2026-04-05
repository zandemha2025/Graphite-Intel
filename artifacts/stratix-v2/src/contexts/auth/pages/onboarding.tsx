import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CompanyProfile {
  companyName: string;
  industry: string;
  stage: string;
  revenueRange: string;
  competitors: string;
  priorities: string;
}

const emptyProfile: CompanyProfile = {
  companyName: "",
  industry: "",
  stage: "",
  revenueRange: "",
  competitors: "",
  priorities: "",
};

const fieldLabels: Record<keyof CompanyProfile, string> = {
  companyName: "Company name",
  industry: "Industry",
  stage: "Stage",
  revenueRange: "Revenue range",
  competitors: "Key competitors",
  priorities: "Strategic priorities",
};

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile);
  const [researching, setResearching] = useState(false);
  const [researchDone, setResearchDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setResearching(true);
    setResearchDone(false);
    setProfile(emptyProfile);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/research/company", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Research failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.profile) {
              setProfile((prev) => ({ ...prev, ...parsed.profile }));
            }
          } catch {
            // skip non-JSON SSE lines
          }
        }
      }

      setResearchDone(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Research failed. You can fill in fields manually.");
        setResearchDone(true);
      }
    } finally {
      setResearching(false);
    }
  }

  function updateField(key: keyof CompanyProfile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function completeOnboarding() {
    try {
      await apiPost("/onboarding/complete", {});
    } catch {
      // best-effort — proceed even if this fails
    }
    await queryClient.invalidateQueries({ queryKey: ["auth"] });
    navigate("/explore");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await apiPost("/company-profile", profile);
      await completeOnboarding();
    } catch (err) {
      if (err instanceof ApiError) {
        let msg = err.body || err.message;
        try { const p = JSON.parse(msg); msg = p.error || p.message || msg; } catch {}
        setError(msg);
      } else {
        setError("Failed to save profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F5F4] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <span className="text-lg font-semibold text-[#0A0A0A]">Stratix</span>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mb-4">Step 3 of 3</p>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[#0A0A0A] mb-1">Tell us about your company</h2>
          <p className="text-sm text-[#404040] mb-6">
            Enter your company URL and we will research it automatically, or fill in the fields yourself.
          </p>

          {/* URL research */}
          <form onSubmit={handleResearch} className="flex gap-2 mb-6">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="flex-1"
              disabled={researching}
            />
            <Button type="submit" size="lg" loading={researching} disabled={researching || !url.trim()}>
              {researching ? "Researching" : "Research"}
            </Button>
          </form>

          {researching && (
            <div className="flex items-center gap-2 text-sm text-[#404040] mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing company data...
            </div>
          )}

          {/* Profile fields */}
          {(researchDone || !researching) && (
            <div className="space-y-4">
              {(Object.keys(fieldLabels) as (keyof CompanyProfile)[]).map((key) => (
                <div key={key}>
                  <label className="block text-sm text-[#404040] mb-1.5">{fieldLabels[key]}</label>
                  <Input
                    value={profile[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    placeholder={`Enter ${fieldLabels[key].toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2 mt-4">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => completeOnboarding()}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              size="lg"
              loading={saving}
              onClick={handleSave}
            >
              Enter Platform
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
