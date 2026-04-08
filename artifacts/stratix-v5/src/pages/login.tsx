import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { ArrowUp, Loader2 } from "lucide-react";

export function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || password.length < 8) { setError("Valid email and password (8+ characters) required"); return; }
    if (mode === "signup" && !name.trim()) { setError("Name is required"); return; }
    setLoading(true);

    try {
      const body: Record<string, string> = { email, password };
      if (mode === "signup") body.name = name;
      const res = await fetch(mode === "login" ? "/api/login" : "/api/signup", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Authentication failed"); return; }
      await queryClient.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
      setLocation("/");
    } catch { setError("Network error"); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white text-sm font-bold">S</div>
        </div>
        <h1 className="font-editorial text-[28px] text-center text-[var(--text-primary)] mb-1">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-body text-[var(--text-secondary)] text-center mb-8">
          {mode === "signup" ? "Start building your intelligence" : "Sign in to continue"}
        </p>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div><label className="text-caption text-[var(--text-secondary)] mb-1 block">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" /></div>
            )}
            <div><label className="text-caption text-[var(--text-secondary)] mb-1 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" /></div>
            <div><label className="text-caption text-[var(--text-secondary)] mb-1 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Min 8 characters" : "Your password"} required minLength={8} className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20" /></div>

            {error && <div className="rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20 px-3 py-2"><p className="text-caption text-[var(--error)]">{error}</p></div>}

            <button type="submit" disabled={loading} className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-body-sm text-[var(--text-muted)]">
              {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              <span className="text-[var(--accent)] font-medium">{mode === "signup" ? "Sign in" : "Sign up"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
