import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

export function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
          <div className="mb-8">
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/40 border border-[#E8E4DC]/15 px-3 py-1">
              {mode === "login"
                ? "Welcome Back"
                : "Create Your Account"}
            </span>
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
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border border-[#E8E4DC]/15 px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-[#E8E4DC]/15 px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/40 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-transparent border border-[#E8E4DC]/15 px-4 py-3 text-sm text-[#E8E4DC] placeholder-[#E8E4DC]/25 focus:border-[#E8E4DC]/40 focus:outline-none transition-colors"
                placeholder={
                  mode === "signup" ? "Min 8 characters" : "Your password"
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium text-sm uppercase tracking-widest hover:bg-[#D4CEC5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
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
