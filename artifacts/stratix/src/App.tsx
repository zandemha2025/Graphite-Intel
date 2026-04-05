import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentAuthUser, useGetCompanyProfile, getGetCompanyProfileQueryKey } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import type { AuthUserWithOrg } from "@/lib/types";
import { CommandPalette } from "@/components/command-palette";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";

// ---------------------------------------------------------------------------
// Lazy-loaded page components (code splitting)
// Named exports use the .then(m => ({ default: m.X })) pattern.
// ---------------------------------------------------------------------------
const Landing = lazy(() => import("@/pages/landing").then(m => ({ default: m.Landing })));
const Dashboard = lazy(() => import("@/pages/dashboard").then(m => ({ default: m.Dashboard })));
const Explore = lazy(() => import("@/pages/explore").then(m => ({ default: m.Explore })));
const ReportsList = lazy(() => import("@/pages/reports-list").then(m => ({ default: m.ReportsList })));
const ReportNew = lazy(() => import("@/pages/report-new").then(m => ({ default: m.ReportNew })));
const ReportView = lazy(() => import("@/pages/report-view").then(m => ({ default: m.ReportView })));
const Onboarding = lazy(() => import("@/pages/onboarding").then(m => ({ default: m.Onboarding })));
const OrgSetup = lazy(() => import("@/pages/org-setup").then(m => ({ default: m.OrgSetup })));
const Profile = lazy(() => import("@/pages/profile").then(m => ({ default: m.Profile })));
const Security = lazy(() => import("@/pages/security").then(m => ({ default: m.Security })));
const Workflows = lazy(() => import("@/pages/workflows").then(m => ({ default: m.Workflows })));
const WorkflowRunner = lazy(() => import("@/pages/workflow-runner").then(m => ({ default: m.WorkflowRunner })));
const WorkflowView = lazy(() => import("@/pages/workflow-view").then(m => ({ default: m.WorkflowView })));
const Knowledge = lazy(() => import("@/pages/knowledge").then(m => ({ default: m.Knowledge })));
const Team = lazy(() => import("@/pages/team").then(m => ({ default: m.Team })));
const AuditLogs = lazy(() => import("@/pages/audit-logs").then(m => ({ default: m.AuditLogs })));
const Analytics = lazy(() => import("@/pages/analytics").then(m => ({ default: m.Analytics })));
const VaultProject = lazy(() => import("@/pages/vault-project").then(m => ({ default: m.VaultProject })));
const WorkflowBuilder = lazy(() => import("@/pages/workflow-builder").then(m => ({ default: m.WorkflowBuilder })));
const WorkflowBuilderEdit = lazy(() => import("@/pages/workflow-builder-edit").then(m => ({ default: m.WorkflowBuilderEdit })));
const Integrations = lazy(() => import("@/pages/integrations").then(m => ({ default: m.Integrations })));
const Connections = lazy(() => import("@/pages/connections").then(m => ({ default: m.Connections })));
const HumanReviews = lazy(() => import("@/pages/human-reviews").then(m => ({ default: m.HumanReviews })));
const VaultSearch = lazy(() => import("@/pages/vault-search").then(m => ({ default: m.VaultSearch })));
const VaultList = lazy(() => import("@/pages/vault").then(m => ({ default: m.Vault })));
const ContextPage = lazy(() => import("@/pages/context").then(m => ({ default: m.ContextPage })));
const SharedWithMe = lazy(() => import("@/pages/shared-with-me").then(m => ({ default: m.SharedWithMe })));
const BoardsList = lazy(() => import("@/pages/boards").then(m => ({ default: m.BoardsList })));
const BoardView = lazy(() => import("@/pages/board-view"));
const ActivityFeed = lazy(() => import("@/pages/activity").then(m => ({ default: m.ActivityFeed })));
const Playbooks = lazy(() => import("@/pages/playbooks").then(m => ({ default: m.Playbooks })));
const PlaybookEdit = lazy(() => import("@/pages/playbook-edit").then(m => ({ default: m.PlaybookEdit })));
const PlaybookRun = lazy(() => import("@/pages/playbook-run").then(m => ({ default: m.PlaybookRun })));
const AdsDashboard = lazy(() => import("@/pages/ads-dashboard").then(m => ({ default: m.AdsDashboard })));
const AdsCampaignDetail = lazy(() => import("@/pages/ads-campaign-detail").then(m => ({ default: m.AdsCampaignDetail })));
const AdsCampaignNew = lazy(() => import("@/pages/ads-campaign-new").then(m => ({ default: m.AdsCampaignNew })));
const AdsReports = lazy(() => import("@/pages/ads-reports").then(m => ({ default: m.AdsReports })));
const Login = lazy(() => import("@/pages/login").then(m => ({ default: m.Login })));

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
  const user = auth?.user as AuthUserWithOrg | null | undefined;
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
  } = useGetCompanyProfile({ query: { enabled: !!auth?.user, queryKey: getGetCompanyProfileQueryKey() } });
  const [, setLocation] = useLocation();

  const user = auth?.user as AuthUserWithOrg | null;

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

  // Company profile is optional — do not redirect to onboarding if missing.
  // The onboarding flow is entered explicitly, not forced by a 404 profile.

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
      const user = auth.user as AuthUserWithOrg;
      if (!user?.orgId) {
        setLocation("/org-setup");
      } else {
        setLocation("/explore");
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
    const user = auth?.user as AuthUserWithOrg | null;
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
    query: { enabled: !!auth?.user, queryKey: getGetCompanyProfileQueryKey() }
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !auth?.user) {
      setLocation("/");
    }
  }, [authLoading, auth, setLocation]);

  useEffect(() => {
    const user = auth?.user as AuthUserWithOrg | null;
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

function ChatRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/explore"); }, [setLocation]);
  return null;
}

function DashboardRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/boards"); }, [setLocation]);
  return null;
}

function IntegrationsRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/connections"); }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<Spinner />}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/org-setup" component={OrgSetupRoute} />
        <Route path="/onboarding" component={OnboardingRoute} />
        <Route path="/dashboard" component={DashboardRedirect} />
        <Route path="/boards/new" component={() => <ProtectedRoute component={BoardView} />} />
        <Route path="/boards/:id" component={() => <ProtectedRoute component={BoardView} />} />
        <Route path="/boards" component={() => <ProtectedRoute component={BoardsList} />} />
        <Route path="/explore" component={() => <ProtectedRoute component={Explore} />} />
        <Route path="/chat" component={ChatRedirect} />
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
        <Route path="/context" component={() => <ProtectedRoute component={ContextPage} />} />
        <Route path="/vault/search" component={() => <ProtectedRoute component={VaultSearch} />} />
        <Route path="/vault/:id" component={() => <ProtectedRoute component={VaultProject} />} />
        <Route path="/vault" component={() => <ProtectedRoute component={VaultList} />} />
        <Route path="/workflow-builder/new" component={() => <ProtectedRoute component={WorkflowBuilderEdit} />} />
        <Route path="/workflow-builder/:id" component={() => <ProtectedRoute component={WorkflowBuilderEdit} />} />
        <Route path="/workflow-builder" component={() => <ProtectedRoute component={WorkflowBuilder} />} />
        <Route path="/audit" component={() => <ProtectedRoute component={AuditLogs} />} />
        <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
        <Route path="/connections" component={() => <ProtectedRoute component={Connections} />} />
        <Route path="/settings/integrations" component={IntegrationsRedirect} />
        <Route path="/human-reviews" component={() => <ProtectedRoute component={HumanReviews} />} />
        <Route path="/shared" component={() => <ProtectedRoute component={SharedWithMe} />} />
        <Route path="/activity" component={() => <ProtectedRoute component={ActivityFeed} />} />
        <Route path="/playbooks/runs/:id" component={() => <ProtectedRoute component={PlaybookRun} />} />
        <Route path="/playbooks/new" component={() => <ProtectedRoute component={PlaybookEdit} />} />
        <Route path="/playbooks/:id" component={() => <ProtectedRoute component={PlaybookEdit} />} />
        <Route path="/playbooks" component={() => <ProtectedRoute component={Playbooks} />} />
        <Route path="/ads/campaigns/new" component={() => <ProtectedRoute component={AdsCampaignNew} />} />
        <Route path="/ads/campaigns/:id" component={() => <ProtectedRoute component={AdsCampaignDetail} />} />
        <Route path="/ads/reports" component={() => <ProtectedRoute component={AdsReports} />} />
        <Route path="/ads" component={() => <ProtectedRoute component={AdsDashboard} />} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <CommandPalette />
            <Router />
          </WouterRouter>
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
