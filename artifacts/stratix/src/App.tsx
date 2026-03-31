import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import { Landing } from "@/pages/landing";
import { Dashboard } from "@/pages/dashboard";
import { Chat } from "@/pages/chat";
import { ReportsList } from "@/pages/reports-list";
import { ReportNew } from "@/pages/report-new";
import { ReportView } from "@/pages/report-view";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: auth, isLoading } = useGetCurrentAuthUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !auth?.user) {
      setLocation("/");
    }
  }, [isLoading, auth, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!auth?.user) {
    return null;
  }

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
      setLocation("/dashboard");
    }
  }, [isLoading, auth, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/reports/new" component={() => <ProtectedRoute component={ReportNew} />} />
      <Route path="/reports/:id" component={() => <ProtectedRoute component={ReportView} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsList} />} />
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
