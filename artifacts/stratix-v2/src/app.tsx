import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { CommandPalette } from "@/components/shared/command-palette";

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

// Lazy-loaded pages
const Landing = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Login })));
const OrgSetup = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.OrgSetup })));
const Onboarding = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Onboarding })));
const Explore = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Explore })));
const Notebooks = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Notebooks })));
const NotebookEdit = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.NotebookEdit })));
const Boards = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Boards })));
const BoardView = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.BoardView })));
const Reports = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Reports })));
const ReportNew = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.ReportNew })));
const ReportView = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.ReportView })));
const Workflows = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Workflows })));
const WorkflowRunner = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.WorkflowRunner })));
const WorkflowBuilder = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.WorkflowBuilder })));
const Playbooks = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Playbooks })));
const PlaybookEdit = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.PlaybookEdit })));
const PlaybookRun = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.PlaybookRun })));
const AdsDashboard = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.AdsDashboard })));
const AdsCampaignNew = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.AdsCampaignNew })));
const AdsCampaignDetail = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.AdsCampaignDetail })));
const Knowledge = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Knowledge })));
const Context = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Context })));
const Vault = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Vault })));
const VaultSearch = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.VaultSearch })));
const VaultProject = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.VaultProject })));
const Connections = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Connections })));
const Analytics = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Analytics })));
const AuditLog = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.AuditLog })));
const Profile = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Profile })));
const Team = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Team })));
const Security = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.Security })));
const ActivityFeed = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.ActivityFeed })));
const SharedItems = lazy(() => import("@/pages/placeholder").then((m) => ({ default: m.SharedItems })));

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

  if (!user.onboardingComplete) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
          <Route path="/onboarding" component={Onboarding} />
          <Route>
            <Redirect to="/onboarding" />
          </Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <Shell user={user}>
      <Suspense fallback={<PageSkeleton />}>
        <Switch>
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
          <Route path="/workflows" component={Workflows} />
          <Route path="/workflow-builder" component={WorkflowBuilder} />
          <Route path="/playbooks/runs/:id" component={PlaybookRun} />
          <Route path="/playbooks/:id" component={PlaybookEdit} />
          <Route path="/playbooks" component={Playbooks} />
          <Route path="/ads/campaigns/new" component={AdsCampaignNew} />
          <Route path="/ads/campaigns/:id" component={AdsCampaignDetail} />
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
    <>
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
    </>
  );
}
