import { useSession } from '@/contexts/SessionContext';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAbility } from '@/context/AbilityProvider';
import { useEffect } from 'react';

const permissionRouteMap = [
    { permission: 'dashboard.view', path: '/' },
    { permission: 'clients.view', path: '/clients' },
    { permission: 'projects.view', path: '/projects' },
    { permission: 'projects.weekly_report.view', path: '/projects/weekly-report' },
    { permission: 'projects.acceptance.view', path: '/projects/acceptance' },
    { permission: 'leads.view', path: '/sales/leads' },
    { permission: 'intern_tasks.view', path: '/interns' },
    { permission: 'tasks.view', path: '/task-management' },
    { permission: 'reports.view', path: '/reports' },
    { permission: 'hr.view', path: '/hr' },
];

const ProtectedRoute = () => {
  const { session, loading: sessionLoading } = useSession();
  const { can, loading: abilityLoading } = useAbility();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionLoading || abilityLoading) {
      return; // Wait until everything is loaded
    }

    if (session) {
      // This logic runs when the user is logged in and all data is loaded.
      // It checks if the user is on the root page and if they should be redirected.
      if (location.pathname === '/') {
        const canAccessDashboard = can('dashboard.view');
        if (!canAccessDashboard) {
          const defaultRoute = permissionRouteMap.find(route => can(route.permission))?.path;
          if (defaultRoute && defaultRoute !== '/') {
            navigate(defaultRoute, { replace: true });
          } else if (!defaultRoute) {
            // This case means the user has no permissions at all.
            navigate('/no-access', { replace: true });
          }
        }
      }
    }
  }, [sessionLoading, abilityLoading, session, location.pathname, can, navigate]);

  if (sessionLoading || abilityLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;