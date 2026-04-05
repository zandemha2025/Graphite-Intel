import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
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
        let msg = err.body || err.message;
        try { const p = JSON.parse(msg); msg = p.error || p.message || msg; } catch {}
        setError(msg);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* S Logo Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-white text-sm font-bold shadow-sm">
            S
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-[#0A0A0A] text-center mb-6">
          {mode === "signin" ? "Welcome back" : "Welcome to Stratix"}
        </h1>

        {/* Step indicator for signup */}
        {mode === "signup" && (
          <p className="text-center text-sm text-[#9CA3AF] mb-6">Step 1 of 3</p>
        )}

        {/* Card container - no border, subtle shadow */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-7">
          {/* Mode toggle - clean underlined tabs */}
          <div className="flex mb-7 border-b border-[#E5E5E3]">
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 pb-3 text-sm transition-all relative ${
                mode === "signup"
                  ? "text-[#0A0A0A] font-medium"
                  : "text-[#9CA3AF] hover:text-[#525252]"
              }`}
            >
              Sign Up
              {mode === "signup" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); }}
              className={`flex-1 pb-3 text-sm transition-all relative ${
                mode === "signin"
                  ? "text-[#0A0A0A] font-medium"
                  : "text-[#9CA3AF] hover:text-[#525252]"
              }`}
            >
              Sign In
              {mode === "signin" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A] rounded-full" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-[#0A0A0A] mb-2">
                  Full name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-11 rounded-lg border-[#D4D4D4] focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11 rounded-lg border-[#D4D4D4] focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0A0A0A] mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-11 rounded-lg border-[#D4D4D4] focus:border-[#0A0A0A] focus:ring-[#0A0A0A]/10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#525252] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signin" && (
              <p className="text-sm text-[#9CA3AF]">
                Forgot password?{" "}
                <button type="button" className="text-[#0A0A0A] hover:underline font-medium">
                  Reset password
                </button>
              </p>
            )}

            {error && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-3 py-2.5">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white text-sm font-medium"
              size="lg"
              loading={loading}
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>

        {/* Bottom text */}
        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          By continuing you agree to our{" "}
          <a href="#" className="text-[#525252] hover:text-[#0A0A0A] underline">Terms</a> and{" "}
          <a href="#" className="text-[#525252] hover:text-[#0A0A0A] underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
