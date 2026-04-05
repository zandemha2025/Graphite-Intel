import { lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Route, Switch, Redirect } from "wouter";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { CommandPalette } from "@/components/shared/command-palette";

// Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9]">
          <div className="text-center space-y-4 p-8">
            <h1 className="text-xl font-semibold text-[#0A0A0A]">Something went wrong</h1>
            <p className="text-sm text-[#9CA3AF]">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0A0A0A] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Skeleton fallback
function PageSkeleton() {
  return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-[#E5E5E3] rounded" />
      <div className="h-4 w-72 bg-[#E5E5E3] rounded" />
      <div className="h-64 bg-[#E5E5E3] rounded-xl mt-6" />
    </div>
  );
}

// Lazy-loaded pages — organized by DDD bounded context (ADR-001)

// Auth context
const Landing = lazy(() => import("@/contexts/auth/pages/landing"));
const Login = lazy(() => import("@/contexts/auth/pages/login"));
const OrgSetup = lazy(() => import("@/contexts/auth/pages/org-setup"));
const Onboarding = lazy(() => import("@/contexts/auth/pages/onboarding"));

// Intelligence context
const Explore = lazy(() => import("@/contexts/intelligence/pages/explore"));
const Notebooks = lazy(() => import("@/contexts/intelligence/pages/notebooks"));
const NotebookEdit = lazy(() => import("@/contexts/intelligence/pages/notebook-edit"));
const Boards = lazy(() => import("@/contexts/intelligence/pages/boards"));
const BoardView = lazy(() => import("@/contexts/intelligence/pages/board-view"));
const Reports = lazy(() => import("@/contexts/intelligence/pages/reports"));
const ReportNew = lazy(() => import("@/contexts/intelligence/pages/report-new"));
const ReportView = lazy(() => import("@/contexts/intelligence/pages/report-view"));

// Operations context
const Workflows = lazy(() => import("@/contexts/operations/pages/workflows"));
const WorkflowRunner = lazy(() => import("@/contexts/operations/pages/workflow-runner"));
const WorkflowView = lazy(() => import("@/contexts/operations/pages/workflow-view"));
const WorkflowBuilder = lazy(() => import("@/contexts/operations/pages/workflow-builder"));
const WorkflowBuilderEdit = lazy(() => import("@/contexts/operations/pages/workflow-builder-edit"));
const Playbooks = lazy(() => import("@/contexts/operations/pages/playbooks"));
const PlaybookEdit = lazy(() => import("@/contexts/operations/pages/playbook-edit"));
const PlaybookRun = lazy(() => import("@/contexts/operations/pages/playbook-run"));
const AdsDashboard = lazy(() => import("@/contexts/operations/pages/ads-dashboard"));
const AdsCampaignNew = lazy(() => import("@/contexts/operations/pages/ads-campaign-new"));
const AdsCampaignDetail = lazy(() => import("@/contexts/operations/pages/ads-campaign-detail"));
const AdsReports = lazy(() => import("@/contexts/operations/pages/ads-reports"));

// Knowledge context
const Knowledge = lazy(() => import("@/contexts/knowledge/pages/knowledge"));
const Context = lazy(() => import("@/contexts/knowledge/pages/context"));
const Vault = lazy(() => import("@/contexts/knowledge/pages/vault"));
const VaultSearch = lazy(() => import("@/contexts/knowledge/pages/vault-search"));
const VaultProject = lazy(() => import("@/contexts/knowledge/pages/vault-project"));
const Connections = lazy(() => import("@/contexts/knowledge/pages/connections"));

// Admin context
const Analytics = lazy(() => import("@/contexts/admin/pages/analytics"));
const AuditLog = lazy(() => import("@/contexts/admin/pages/audit-log"));

// Settings context
const Profile = lazy(() => import("@/contexts/settings/pages/profile"));
const Team = lazy(() => import("@/contexts/settings/pages/team"));
const Security = lazy(() => import("@/contexts/settings/pages/security"));
const ActivityFeed = lazy(() => import("@/contexts/settings/pages/activity"));
const SharedItems = lazy(() => import("@/contexts/settings/pages/shared"));

function AuthenticatedApp() {
  const { user, isLoading, isError } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !user) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route>
            <Landing />
          </Route>
        </Switch>
      </Suspense>
    );
  }

  if (!user.orgId) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <OrgSetup />
      </Suspense>
    );
  }

  return (
    <Shell user={user}>
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
          {/* ONBOARDING (accessible but not forced — backend has no onboardingComplete field) */}
          <Route path="/onboarding" component={Onboarding} />

          {/* INTELLIGENCE */}
          <Route path="/explore" component={Explore} />
          <Route path="/notebooks/:id" component={NotebookEdit} />
          <Route path="/notebooks" component={Notebooks} />
          <Route path="/boards/:id" component={BoardView} />
          <Route path="/boards" component={Boards} />
          <Route path="/reports/new" component={ReportNew} />
          <Route path="/reports/:id" component={ReportView} />
          <Route path="/reports" component={Reports} />

          {/* OPERATIONS */}
          <Route path="/workflows/new/:key" component={WorkflowRunner} />
          <Route path="/workflows/:id" component={WorkflowView} />
          <Route path="/workflows" component={Workflows} />
          <Route path="/workflow-builder/:id" component={WorkflowBuilderEdit} />
          <Route path="/workflow-builder" component={WorkflowBuilder} />
          <Route path="/playbooks/runs/:id" component={PlaybookRun} />
          <Route path="/playbooks/:id" component={PlaybookEdit} />
          <Route path="/playbooks" component={Playbooks} />
          <Route path="/ads/campaigns/new" component={AdsCampaignNew} />
          <Route path="/ads/campaigns/:id" component={AdsCampaignDetail} />
          <Route path="/ads/reports" component={AdsReports} />
          <Route path="/ads" component={AdsDashboard} />

          {/* KNOWLEDGE */}
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/context" component={Context} />
          <Route path="/vault/search" component={VaultSearch} />
          <Route path="/vault/:id" component={VaultProject} />
          <Route path="/vault" component={Vault} />
          <Route path="/connections" component={Connections} />

          {/* ADMIN */}
          <Route path="/analytics" component={Analytics} />
          <Route path="/audit" component={AuditLog} />

          {/* SETTINGS & USER */}
          <Route path="/settings/team" component={Team} />
          <Route path="/profile" component={Profile} />
          <Route path="/security" component={Security} />
          <Route path="/activity" component={ActivityFeed} />
          <Route path="/shared" component={SharedItems} />

          {/* Default */}
          <Route>
            <Redirect to="/explore" />
          </Route>
        </Switch>
      </Suspense>
      <CommandPalette />
    </Shell>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthenticatedApp />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "white",
            border: "1px solid #E5E5E3",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />
    </ErrorBoundary>
  );
}
