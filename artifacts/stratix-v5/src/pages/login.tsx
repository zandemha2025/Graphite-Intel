import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentAuthUserQueryKey } from "@workspace/api-client-react";
import { Loader2, Github, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeError, setShakeError] = useState(false);

  const getPasswordStrength = (pwd: string): { strength: "weak" | "medium" | "strong"; percentage: number } => {
    if (pwd.length === 0) return { strength: "weak", percentage: 0 };
    const length = pwd.length >= 12 ? 1 : pwd.length >= 8 ? 0.5 : 0;
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) ? 1 : 0;
    const score = length + (hasSpecial ? 1 : 0);
    if (score >= 2) return { strength: "strong", percentage: 100 };
    if (score >= 1) return { strength: "medium", percentage: 66 };
    return { strength: "weak", percentage: 33 };
  };

  const passwordStrength = mode === "signup" ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShakeError(false);

    if (!email || !password || password.length < 8) {
      setError("Valid email and password (8+ characters) required");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Name is required");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }
    setLoading(true);

    try {
      const body: Record<string, string> = { email, password };
      if (mode === "signup") body.name = name;
      const res = await fetch(mode === "login" ? "/api/login" : "/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: getGetCurrentAuthUserQueryKey() });
      // Let HomeRedirect decide: new user → /org-setup, existing → /solve
      setLocation("/");
    } catch {
      setError("Unable to connect. Please check your internet connection and try again.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
      });
      return;
    }
    toast({
      title: "Reset link sent",
      description: `Check your email (${email}) for password reset instructions.`,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white text-sm font-bold">
            S
          </div>
        </div>
        <h1 className="font-editorial text-[28px] text-center text-[var(--text-primary)] mb-1">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-body text-[var(--text-secondary)] text-center mb-8">
          {mode === "signup" ? "Start building your intelligence" : "Sign in to continue"}
        </p>

        <div
          className={`rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 transition-transform ${
            shakeError ? "animate-shake" : ""
          }`}
          style={{
            animation: shakeError ? "shake 0.5s ease-in-out" : "none",
          }}
        >
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
            }
          `}</style>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OAuth via Pipedream Connect */}
            <div className="space-y-3">
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-muted)] font-medium flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <Mail className="h-4 w-4" />
                Continue with Google
                <span className="text-[10px] ml-1 opacity-70">Coming soon</span>
              </button>
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-muted)] font-medium flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
              >
                <Github className="h-4 w-4" />
                Continue with GitHub
                <span className="text-[10px] ml-1 opacity-70">Coming soon</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[var(--border)]"></div>
              <span className="text-caption text-[var(--text-muted)]">or continue with email</span>
              <div className="flex-1 h-px bg-[var(--border)]"></div>
            </div>

            {/* Name Field (Signup Only) */}
            {mode === "signup" && (
              <div>
                <label className="text-caption text-[var(--text-secondary)] mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="text-caption text-[var(--text-secondary)] mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-caption text-[var(--text-secondary)] mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
                required
                minLength={8}
                className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />

              {/* Password Strength Meter (Signup Only) */}
              {mode === "signup" && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength?.strength === "strong"
                          ? "bg-green-500"
                          : passwordStrength?.strength === "medium"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${passwordStrength?.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-caption text-[var(--text-muted)]">
                    Password strength:{" "}
                    <span
                      className={
                        passwordStrength?.strength === "strong"
                          ? "text-green-500 font-medium"
                          : passwordStrength?.strength === "medium"
                            ? "text-yellow-500 font-medium"
                            : "text-red-500 font-medium"
                      }
                    >
                      {passwordStrength?.strength}
                    </span>
                  </p>
                </div>
              )}

              {/* Forgot Password Link (Login Only) */}
              {mode === "login" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 text-caption text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20 px-3 py-2">
                <p className="text-caption text-[var(--error)]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setShakeError(false);
              }}
              className="text-body-sm text-[var(--text-muted)]"
            >
              {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
              <span className="text-[var(--accent)] font-medium">{mode === "signup" ? "Sign in" : "Sign up"}</span>
            </button>
          </div>
        </div>

        {/* Terms and Privacy Links */}
        <p className="text-caption text-[var(--text-muted)] text-center mt-6">
          By continuing you agree to our{" "}
          <a href="/terms" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="/privacy" className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
