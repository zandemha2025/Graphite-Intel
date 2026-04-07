import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthTab = "signin" | "signup";

export default function LoginPage() {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: () =>
      apiPost<{ user: unknown }>("/login", { email, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      setLocation("/explore");
    },
    onError: (err: Error) => {
      setError(err.message || "Invalid email or password");
    },
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      apiPost<{ user: unknown }>("/signup", { email, password, fullName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
      setLocation("/explore");
    },
    onError: (err: Error) => {
      setError(err.message || "Could not create account");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (tab === "signin") {
      loginMutation.mutate();
    } else {
      signupMutation.mutate();
    }
  }

  const loading = loginMutation.isPending || signupMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1] text-white font-bold text-sm">
            S
          </div>
          <h1 className="text-xl font-semibold text-[#FAFAFA]">Stratix</h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Strategic intelligence your team trusts
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-[#18181B] p-6 shadow-sm">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[#27272A] p-1">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                  tab === t
                    ? "bg-[#18181B] text-[#FAFAFA] shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]",
                )}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === "signup" && (
              <Input
                id="fullName"
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            )}

            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              error={error || undefined}
            />

            <Button type="submit" loading={loading} className="mt-2 w-full">
              {tab === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
