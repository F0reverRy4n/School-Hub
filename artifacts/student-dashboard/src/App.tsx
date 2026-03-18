import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { AppLayout } from "./components/layout";
import { AuthPage } from "./pages/auth";
import { AssignmentsPage } from "./pages/assignments";
import { NotesPage } from "./pages/notes";
import { AdminPage } from "./pages/admin";
import { SchoolPanelPage } from "./pages/school-panel";
import { Lock } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function useLockdown() {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}/api/settings`, { credentials: "include" });
      if (!res.ok) return { lockdown: false };
      return res.json() as Promise<{ lockdown: boolean }>;
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });
}

function LockdownScreen() {
  return (
    <div className="fixed inset-0 bg-gray-950/97 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="text-center text-white max-w-sm px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">App Locked</h1>
        <p className="text-white/70 text-sm leading-relaxed">
          This app has been locked for security reasons.
        </p>
        <p className="text-white/50 text-xs mt-4">
          If any issues occur please contact:{" "}
          <a href="mailto:f0reverry4n@gmail.com" className="text-blue-400 hover:underline">
            f0reverry4n@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  requiredRole,
}: {
  component: React.ComponentType;
  requiredRole?: string | string[];
}) {
  const { user, isLoading } = useAuth();
  const { data: settings } = useLockdown();
  const isLocked = settings?.lockdown ?? false;

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F2F7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Show lockdown screen to non-admins
  if (isLocked && user.role !== "admin") {
    return <LockdownScreen />;
  }

  // Role check
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return (
        <AppLayout>
          <div className="flex items-center justify-center h-full py-24 text-center">
            <div>
              <p className="text-4xl mb-4">🚫</p>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground">You don't have permission to view this page.</p>
            </div>
          </div>
        </AppLayout>
      );
    }
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={AssignmentsPage} />} />
      <Route path="/notes" component={() => <ProtectedRoute component={NotesPage} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} requiredRole="admin" />} />
      <Route path="/school-panel" component={() => <ProtectedRoute component={SchoolPanelPage} requiredRole={["school_admin", "admin"]} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
