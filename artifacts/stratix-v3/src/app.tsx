import { Route, Switch, Redirect, useLocation } from "wouter";
import { Toaster } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { type ReactNode, Component, type ErrorInfo, lazy, Suspense } from "react";

const ReportViewPage = lazy(() => import("@/pages/report-view"));
const WorkflowBuilderPage = lazy(() => import("@/pages/workflow-builder"));

// Pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import OrgSetupPage from "@/pages/org-setup";
import ExplorePage from "@/pages/explore";
import NotebooksPage from "@/pages/notebooks";
import NotebookEditPage from "@/pages/notebook-edit";
import ContextPage from "@/pages/context";
import BoardsPage from "@/pages/boards";
import BoardViewPage from "@/pages/board-view";
import IntegrationsPage from "@/pages/integrations";
import SettingsPage from "@/pages/settings";
import PlaybooksPage from "@/pages/playbooks";
import PlaybookEditPage from "@/pages/playbook-edit";
import PlaybookRunPage from "@/pages/playbook-run";
import OnboardingPage from "@/pages/onboarding";

// Error Boundary
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white px-4">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-[#111827]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-[#4F46E5] px-4 py-2 text-sm text-white hover:bg-[#4338CA]"
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

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!user.orgId) {
    return <OrgSetupPage />;
  }

  return (
    <Shell>
      <Switch>
        <Route path="/explore" component={ExplorePage} />
        <Route path="/notebooks" component={NotebooksPage} />
        <Route path="/notebooks/:id" component={NotebookEditPage} />
        <Route path="/context" component={ContextPage} />
        <Route path="/reports/:id">
              {() => (
                <Suspense
                  fallback={
                    <div className="flex min-h-[400px] items-center justify-center">
                      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading report...
                      </div>
                    </div>
                  }
                >
                  <ReportViewPage />
                </Suspense>
              )}
            </Route>
        <Route path="/boards" component={BoardsPage} />
        <Route path="/boards/:id" component={BoardViewPage} />
        <Route path="/playbooks" component={PlaybooksPage} />
        <Route path="/playbooks/runs/:id" component={PlaybookRunPage} />
        <Route path="/playbooks/:id" component={PlaybookEditPage} />
        <Route path="/workflows/new">
              {() => (
                <Suspense
                  fallback={
                    <div className="flex min-h-[400px] items-center justify-center">
                      <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading workflow builder...
                      </div>
                    </div>
                  }
                >
                  <WorkflowBuilderPage />
                </Suspense>
              )}
            </Route>
        <Route path="/integrations" component={IntegrationsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <Redirect to="/explore" />
        </Route>
      </Switch>
    </Shell>
  );
}

export function App() {
  const [location] = useLocation();

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "white",
            border: "1px solid #E5E7EB",
            color: "#111827",
            fontSize: "14px",
          },
        }}
      />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/org-setup" component={OrgSetupPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route>
          <AuthenticatedRoutes />
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}
