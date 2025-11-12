import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AbilityProvider } from "./context/AbilityProvider";
import { SessionContextProvider } from "./context/SessionContext";

// Pages
import Index from "./pages/Index";
import ClientsPage from "./pages/clients/Index";
import ClientDetailsPage from "./pages/clients/Details";
import ProjectsPage from "./pages/projects/Index";
import WeeklyReportPage from "./pages/projects/WeeklyReport";
import AcceptancePage from "./pages/projects/Acceptance";
import LeadsPage from "./pages/sales/leads/Index";
import TasksManagementPage from "./pages/task-management/Index";
import InternsPage from "./pages/interns/Index";
import HRPage from "./pages/hr/Index";
import ReportsPage from "./pages/reports/Index";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/Login";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NoAccessPage from "./pages/NoAccess";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider queryClient={queryClient}>
            <AbilityProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/no-access" element={<NoAccessPage />} />
                
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/weekly-report" element={<WeeklyReportPage />} />
                  <Route path="/projects/acceptance" element={<AcceptancePage />} />
                  <Route path="/sales/leads" element={<LeadsPage />} />
                  <Route path="/task-management" element={<TasksManagementPage />} />
                  <Route path="/interns" element={<InternsPage />} />
                  <Route path="/hr" element={<HRPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AbilityProvider>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;