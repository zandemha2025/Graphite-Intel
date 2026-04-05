import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";

export function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Must be at least 8 characters";
    if (mode === "signup" && !name.trim()) errs.name = "Name is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/signup";
      const body: Record<string, string> = { email, password };
      if (mode === "signup" && name) {
        body.name = name;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Invalidate the auth query so the app picks up the session
      await queryClient.invalidateQueries({
        queryKey: getGetCurrentAuthUserQueryKey(),
      });

      setLocation("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-7 w-7 border border-[#E8E4DC]/40 flex items-center justify-center">
            <span className="font-serif font-semibold text-[#E8E4DC] text-sm leading-none">
              S
            </span>
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight text-[#E8E4DC] uppercase">
            Stratix
          </span>
        </Link>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="mb-8 flex items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/40 border border-[#E8E4DC]/15 px-3 py-1">
              {mode === "login" ? "Welcome Back" : "Step 1 of 3"}
            </span>
            {mode === "signup" && (
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-6 bg-[#E8E4DC]/60" />
                <div className="h-1 w-6 bg-[#E8E4DC]/15" />
                <div className="h-1 w-6 bg-[#E8E4DC]/15" />
              </div>
            )}
          </div>

          <h1 className="font-serif text-4xl font-light tracking-tight text-[#E8E4DC] mb-2">
            {mode === "login" ? "Sign in" : "Get started"}
          </h1>
          <p className="text-sm text-[#E8E4DC]/50 mb-10 font-light">
            {mode === "login"
              ? "Enter your credentials to access the platform."
              : "Create an account to begin using Stratix Intelligence."}
          </p>

          {error && (
            <div className="mb-6 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
                  className={`w-full bg-transparent border px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors ${fieldErrors.name ? "border-red-500/50" : "border-[#E8E4DC]/15"}`}
                  placeholder="Your name"
                />
                {fieldErrors.name && <p className="text-[10px] text-red-400 mt-1.5">{fieldErrors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                required
                className={`w-full bg-transparent border px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors ${fieldErrors.email ? "border-red-500/50" : "border-[#E8E4DC]/15"}`}
                placeholder="you@company.com"
              />
              {fieldErrors.email && <p className="text-[10px] text-red-400 mt-1.5">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }}
                required
                minLength={8}
                className={`w-full bg-transparent border px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors ${fieldErrors.password ? "border-red-500/50" : "border-[#E8E4DC]/15"}`}
                placeholder={
                  mode === "signup" ? "Min 8 characters" : "Your password"
                }
              />
              {fieldErrors.password && <p className="text-[10px] text-red-400 mt-1.5">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium text-sm uppercase tracking-widest hover:bg-[#D4CEC5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : mode === "login" ? (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setFieldErrors({});
              }}
              className="text-sm text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 transition-colors"
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
