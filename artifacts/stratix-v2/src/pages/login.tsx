import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const prefillEmail = new URLSearchParams(search).get("email") ?? "";

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup" && !name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await apiPost<{ orgId?: number }>("/signup", {
          fullName: name,
          email,
          password,
        });
        await queryClient.invalidateQueries({ queryKey: ["auth"] });
        navigate(res.orgId ? "/explore" : "/org-setup");
      } else {
        const res = await apiPost<{ orgId?: number }>("/login", { email, password });
        await queryClient.invalidateQueries({ queryKey: ["auth"] });
        navigate(res.orgId ? "/explore" : "/org-setup");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body || err.message);
      } else {
        setError("Something went wrong. Please try again.");
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

        {/* Step indicator */}
        {mode === "signup" && (
          <p className="text-center text-xs text-[#9CA3AF] mb-4">Step 1 of 3</p>
        )}

        <Card className="p-6">
          {/* Mode toggle */}
          <div className="flex mb-6 rounded-lg bg-[#F3F3F1] p-0.5">
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                mode === "signup"
                  ? "bg-white text-[#0A0A0A] font-medium shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#404040]"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                mode === "signin"
                  ? "bg-white text-[#0A0A0A] font-medium shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#404040]"
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-[#404040] mb-1.5">Full name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-[#404040] mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm text-[#404040] mb-1.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          By continuing you agree to our{" "}
          <a href="#" className="underline hover:text-[#404040]">Terms</a> and{" "}
          <a href="#" className="underline hover:text-[#404040]">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
