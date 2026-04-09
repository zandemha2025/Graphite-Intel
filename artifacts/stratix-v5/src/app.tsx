import { lazy, Suspense, useEffect, useState, createContext, useContext, useMemo } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { CommandPalette } from "@/components/shared/command-palette";
import { Toaster } from "@/components/ui/toaster";
import { useGetCurrentAuthUser, useGetCompanyProfile, getGetCompanyProfileQueryKey } from "@workspace/api-client-react";
import type { AuthUserWithOrg } from "@/lib/types";

/* ── Lazy pages ── */
const Landing = lazy(() => import("@/pages/landing").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("@/pages/login").then((m) => ({ default: m.Login })));
const OrgSetup = lazy(() => import("@/pages/org-setup").then((m) => ({ default: m.OrgSetup })));
const Onboarding = lazy(() => import("@/pages/onboarding").then((m) => ({ default: m.Onboarding })));
const Solve = lazy(() => import("@/pages/solve").then((m) => ({ default: m.Solve })));
const Build = lazy(() => import("@/pages/build").then((m) => ({ default: m.Build })));
const NotebookEdit = lazy(() => import("@/pages/notebook-edit").then((m) => ({ default: m.NotebookEdit })));
const BoardView = lazy(() => import("@/pages/board-view").then((m) => ({ default: m.BoardView })));
const Intelligence = lazy(() => import("@/pages/intelligence").then((m) => ({ default: m.Intelligence })));
const Connect = lazy(() => import("@/pages/connect").then((m) => ({ default: m.Connect })));
const WorkflowRun = lazy(() => import("@/pages/workflow-run").then((m) => ({ default: m.WorkflowRun })));
const Settings = lazy(() => import("@/pages/settings").then((m) => ({ default: m.Settings })));
const NotFound = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFound })));

/* ── Query Client ── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (fc, err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 404) return false;
        return fc < 2;
      },
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

/* ── Spinner ── */
function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--background)]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
    </div>
  );
}

/* ── Auth Context — single source of truth ── */
interface AuthContextValue {
  user: AuthUserWithOrg | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  orgName: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  orgName: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: auth, isLoading: authLoading, isFetched, isError: authError } = useGetCurrentAuthUser();
  const user = (auth?.user as AuthUserWithOrg) || null;

  // Fetch profile (fire-and-forget, don't block rendering)
  useGetCompanyProfile({
    query: { enabled: !!user, queryKey: getGetCompanyProfileQueryKey(), retry: false },
  });

  // Fetch org name
  const [orgName, setOrgName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    fetch("/api/org", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setOrgName(d.name); })
      .catch(() => {});
  }, [user]);

  // If auth fetch errored (API down), treat as not loading so the app doesn't hang on spinner
  const isLoading = authError ? false : (authLoading || !isFetched);

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {
      // even if logout fails, redirect
    }
    window.location.href = "/";
  };

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    orgName,
    logout,
  }), [user, isLoading, orgName]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* ── Protected Route — reads from context, never calls auth hooks ── */
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, isAuthenticated, orgName, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (!user?.orgId) {
      // New user without org — must complete setup first
      setLocation("/org-setup");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) return <Spinner />;

  if (!isAuthenticated || !user?.orgId) {
    return <Spinner />; // redirect in progress
  }

  return (
    <ErrorBoundary>
      <AppShell
        user={{
          name: (user as unknown as Record<string, string>)?.name || user?.email || "User",
          email: user?.email || "",
        }}
        orgName={orgName}
        onLogout={logout}
      >
        <Component />
      </AppShell>
    </ErrorBoundary>
  );
}

/* ── Home Redirect — the ONLY place that decides where authenticated users go ── */
function HomeRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      setLocation(user.orgId ? "/solve" : "/org-setup");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading) return <Spinner />;
  if (isAuthenticated) return <Spinner />; // Brief flash while setLocation takes effect
  return <Landing />;
}

/* ── Org Setup Route ── */
function OrgSetupRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) setLocation("/");
    else if (user?.orgId) setLocation("/solve");
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || !isAuthenticated) return <Spinner />;
  return <OrgSetup />;
}

/* ── Onboarding Route ── */
function OnboardingRoute() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) setLocation("/");
    else if (!user?.orgId) setLocation("/org-setup");
  }, [isLoading, isAuthenticated, user, setLocation]);

  if (isLoading || !isAuthenticated) return <Spinner />;
  return <Onboarding />;
}

/* ── Redirect helper ── */
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [setLocation, to]);
  return null;
}

/* ── Router ── */
function AppRouter() {
  return (
    <Suspense fallback={<Spinner />}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/org-setup" component={OrgSetupRoute} />
        <Route path="/onboarding" component={OnboardingRoute} />

        <Route path="/solve" component={() => <ProtectedRoute component={Solve} />} />
        <Route path="/build/notebooks/:id" component={() => <ProtectedRoute component={NotebookEdit} />} />
        <Route path="/build/boards/:id" component={() => <ProtectedRoute component={BoardView} />} />
        <Route path="/build" component={() => <ProtectedRoute component={Build} />} />
        <Route path="/intelligence" component={() => <ProtectedRoute component={Intelligence} />} />
        <Route path="/connect/workflows/:templateKey" component={() => <ProtectedRoute component={WorkflowRun} />} />
        <Route path="/connect" component={() => <ProtectedRoute component={Connect} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

        {/* Legacy redirects */}
        <Route path="/explore" component={() => <Redirect to="/solve" />} />
        <Route path="/chat" component={() => <Redirect to="/solve" />} />
        <Route path="/dashboard" component={() => <Redirect to="/build" />} />
        <Route path="/notebooks" component={() => <Redirect to="/build" />} />
        <Route path="/notebooks/:rest*" component={() => <Redirect to="/build" />} />
        <Route path="/boards" component={() => <Redirect to="/build" />} />
        <Route path="/boards/:rest*" component={() => <Redirect to="/build" />} />
        <Route path="/reports" component={() => <Redirect to="/intelligence" />} />
        <Route path="/reports/:rest*" component={() => <Redirect to="/intelligence" />} />
        <Route path="/analytics" component={() => <Redirect to="/intelligence" />} />
        <Route path="/ads" component={() => <Redirect to="/intelligence" />} />
        <Route path="/ads/:rest*" component={() => <Redirect to="/intelligence" />} />
        <Route path="/context" component={() => <Redirect to="/connect" />} />
        <Route path="/knowledge" component={() => <Redirect to="/connect" />} />
        <Route path="/vault" component={() => <Redirect to="/connect" />} />
        <Route path="/vault/:rest*" component={() => <Redirect to="/connect" />} />
        <Route path="/connections" component={() => <Redirect to="/connect" />} />
        <Route path="/workflows" component={() => <Redirect to="/connect" />} />
        <Route path="/workflow-builder" component={() => <Redirect to="/connect" />} />
        <Route path="/playbooks" component={() => <Redirect to="/connect" />} />
        <Route path="/profile" component={() => <Redirect to="/settings" />} />
        <Route path="/security" component={() => <Redirect to="/settings" />} />
        <Route path="/settings/team" component={() => <Redirect to="/settings" />} />

        <Route component={() => <ProtectedRoute component={NotFound} />} />
      </Switch>
    </Suspense>
  );
}

/* ── App Root ── */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <CommandPalette />
          <Toaster />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
