import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentAuthUser, useGetCompanyProfile } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import { Landing } from "@/pages/landing";
import { Dashboard } from "@/pages/dashboard";
import { Chat } from "@/pages/chat";
import { ReportsList } from "@/pages/reports-list";
import { ReportNew } from "@/pages/report-new";
import { ReportView } from "@/pages/report-view";
import { Onboarding } from "@/pages/onboarding";
import { OrgSetup } from "@/pages/org-setup";
import { Profile } from "@/pages/profile";
import { Security } from "@/pages/security";
import { Workflows } from "@/pages/workflows";
import { WorkflowRunner } from "@/pages/workflow-runner";
import { WorkflowView } from "@/pages/workflow-view";
import { Knowledge } from "@/pages/knowledge";
import { Team } from "@/pages/team";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        if (error != null && typeof (error as { status?: unknown }).status === "number" && (error as { status: number }).status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0D0C0B]">
      <div className="w-6 h-6 border border-[#E8E4DC]/20 border-t-[#E8E4DC]/60 animate-spin" style={{ borderRadius: 0 }} />
    </div>
  );
}

function useAuthAndOrg() {
  const { data: auth, isLoading: authLoading } = useGetCurrentAuthUser();
  const user = auth?.user as (typeof auth extends { user: infer U } ? U : never) & { orgId?: number; orgRole?: string } | null | undefined;
  return { user, authLoading };
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: auth, isLoading: authLoading } = useGetCurrentAuthUser();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching: profileFetching,
    error: profileError,
    status: profileStatus,
  } = useGetCompanyProfile({ query: { enabled: !!auth?.user } });
  const [, setLocation] = useLocation();

  const user = auth?.user as any;

  useEffect(() => {
    if (!authLoading && !auth?.user) {
      setLocation("/");
    }
  }, [authLoading, auth, setLocation]);

  useEffect(() => {
    if (!authLoading && auth?.user && !user?.orgId) {
      const current = window.location.pathname;
      if (!current.endsWith("/org-setup")) {
        setLocation("/org-setup");
      }
    }
  }, [authLoading, auth, user, setLocation]);

  useEffect(() => {
    if (!authLoading && !profileLoading && !profileFetching && auth?.user && user?.orgId && profileStatus === "error") {
      const is404 =
        profileError != null &&
        typeof (profileError as { status?: unknown }).status === "number" &&
        (profileError as { status: number }).status === 404;
      const isOnboarding = window.location.pathname.endsWith("/onboarding");
      if (is404 && !isOnboarding) {
        setLocation("/onboarding");
      }
    }
  }, [authLoading, profileLoading, profileFetching, profileStatus, auth, profile, profileError, setLocation, user]);

  if (authLoading || (auth?.user && profileLoading)) {
    return <Spinner />;
  }

  if (!auth?.user) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function HomeRedirect() {
  const { data: auth, isLoading } = useGetCurrentAuthUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && auth?.user) {
      const user = auth.user as any;
      if (!user?.orgId) {
        setLocation("/org-setup");
      } else {
        setLocation("/chat");
      }
    }
  }, [isLoading, auth, setLocation]);

  if (isLoading) return <Spinner />;

  return <Landing />;
}

function OrgSetupRoute() {
  const { data: auth, isLoading: authLoading } = useGetCurrentAuthUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !auth?.user) {
      setLocation("/");
    }
  }, [authLoading, auth, setLocation]);

  useEffect(() => {
    const user = auth?.user as any;
    if (!authLoading && auth?.user && user?.orgId) {
      setLocation("/dashboard");
    }
  }, [authLoading, auth, setLocation]);

  if (authLoading) return <Spinner />;
  if (!auth?.user) return null;

  return <OrgSetup />;
}

function OnboardingRoute() {
  const { data: auth, isLoading: authLoading } = useGetCurrentAuthUser();
  const { data: profile, isLoading: profileLoading } = useGetCompanyProfile({
    query: { enabled: !!auth?.user }
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !auth?.user) {
      setLocation("/");
    }
  }, [authLoading, auth, setLocation]);

  useEffect(() => {
    const user = auth?.user as any;
    if (!authLoading && auth?.user && !user?.orgId) {
      setLocation("/org-setup");
    }
  }, [authLoading, auth, setLocation]);

  useEffect(() => {
    if (!authLoading && !profileLoading && auth?.user && profile) {
      setLocation("/dashboard");
    }
  }, [authLoading, profileLoading, auth, profile, setLocation]);

  if (authLoading || (auth?.user && profileLoading)) return <Spinner />;
  if (!auth?.user) return null;

  return <Onboarding />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/org-setup" component={OrgSetupRoute} />
      <Route path="/onboarding" component={OnboardingRoute} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/reports/new" component={() => <ProtectedRoute component={ReportNew} />} />
      <Route path="/reports/:id" component={() => <ProtectedRoute component={ReportView} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsList} />} />
      <Route path="/workflows/new/:templateKey" component={() => <ProtectedRoute component={WorkflowRunner} />} />
      <Route path="/workflows/:id" component={() => <ProtectedRoute component={WorkflowView} />} />
      <Route path="/workflows" component={() => <ProtectedRoute component={Workflows} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/settings/team" component={() => <ProtectedRoute component={Team} />} />
      <Route path="/security" component={Security} />
      <Route path="/knowledge" component={() => <ProtectedRoute component={Knowledge} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
