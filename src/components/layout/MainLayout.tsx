import { useState, createElement } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Menu, 
  Home, 
  Users, 
  Briefcase, 
  DollarSign, 
  GraduationCap, 
  FolderKanban, 
  BarChart2, 
  UserCog,
  X,
  Settings,
  LogOut,
  User,
  Wrench,
  CalendarCheck,
  FileCheck,
  ChevronsLeft
} from "lucide-react";
import React from "react";
import { Can } from "@/components/auth/Can";
import { useSession } from "@/contexts/SessionContext";
import { useAbility } from "@/context/AbilityProvider";
import usePersistentState from "@/hooks/usePersistentState";

interface MainLayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ 
  Icon,
  href, 
  label, 
  active = false,
  external = false,
  isCollapsed
}: { 
  Icon?: React.ElementType;
  href: string; 
  label: string; 
  active?: boolean;
  external?: boolean;
  isCollapsed: boolean;
}) => {
  const content = (
    <>
      {Icon && <Icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />}
      <span className={cn("transition-opacity whitespace-nowrap", isCollapsed ? "sr-only" : "")}>{label}</span>
    </>
  );

  const className = cn(
    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150",
    active 
      ? "bg-blue-50 text-blue-700" 
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
    isCollapsed && "justify-center"
  );

  if (external) {
    return (
      <a 
        href={href} 
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  );
};

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = usePersistentState('sidebarCollapsed', false);
  const { pathname } = useLocation();
  const { session, signOut } = useSession();
  const { can } = useAbility();

  const canViewReports = can('reports.sales.view') || can('reports.projects.view') || can('reports.interns.view') || can('reports.clients.view');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white shadow-xl transform transition-all duration-300 ease-in-out border-r border-gray-200",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border-2 border-gray-200 hover:bg-gray-100 hidden lg:flex z-10"
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
        </Button>

        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={cn("flex items-center justify-between p-6 border-b border-gray-100 transition-all", isCollapsed && "p-0 py-6 justify-center")}>
            <Link to="/" className={cn("flex items-center justify-center", isCollapsed ? "w-full" : "")}>
                <img 
                    src="/logodailong-ngang.png" 
                    alt="Dai Long Logo" 
                    className={cn(
                        "h-auto transition-all duration-300",
                        isCollapsed ? "max-w-[48px]" : "max-w-[160px]"
                    )}
                />
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn("lg:hidden text-gray-500 hover:text-gray-700", isCollapsed && "hidden")}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Can I="clients.view"><NavItem Icon={Users} href="/clients" label="Clients" active={pathname.startsWith("/clients")} isCollapsed={isCollapsed} /></Can>
            <Can I="projects.view"><NavItem Icon={Briefcase} href="/projects" label="Dự án" active={pathname.startsWith("/projects") && !pathname.includes("weekly-report") && !pathname.includes("acceptance")} isCollapsed={isCollapsed} /></Can>
            <Can I="projects.weekly_report.view"><NavItem Icon={CalendarCheck} href="/projects/weekly-report" label="Báo cáo tuần" active={pathname === "/projects/weekly-report"} isCollapsed={isCollapsed} /></Can>
            <Can I="projects.acceptance.view"><NavItem Icon={FileCheck} href="/projects/acceptance" label="Nghiệm Thu" active={pathname === "/projects/acceptance"} isCollapsed={isCollapsed} /></Can>
            <Can I="leads.view"><NavItem Icon={DollarSign} href="/sales/leads" label="Quản lý sale" active={pathname.startsWith("/sales/leads")} isCollapsed={isCollapsed} /></Can>
            <Can I="intern_tasks.view"><NavItem Icon={GraduationCap} href="/interns" label="Thực tập sinh" active={pathname.startsWith("/interns")} isCollapsed={isCollapsed} /></Can>
            <Can I="tasks.view"><NavItem Icon={FolderKanban} href="/task-management" label="Quản lý công việc" active={pathname.startsWith("/task-management")} isCollapsed={isCollapsed} /></Can>
            {canViewReports && <NavItem Icon={BarChart2} href="/reports" label="Analytics & Reports" active={pathname.startsWith("/reports")} isCollapsed={isCollapsed} />}
            <Can I="hr.view"><NavItem Icon={UserCog} href="/hr" label="Nhân sự" active={pathname.startsWith("/hr")} isCollapsed={isCollapsed} /></Can>
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-100">
            <Can I="permissions.view">
              <div className="mb-2">
                <NavItem Icon={Settings} href="/settings" label="Cài đặt" active={pathname.startsWith("/settings")} isCollapsed={isCollapsed} />
              </div>
            </Can>
            <div className={cn("flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors", isCollapsed && "justify-center p-0 py-3")}>
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src="/api/placeholder/40/40" alt="Admin User" />
                <AvatarFallback className="bg-blue-600 text-white">{session?.user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={cn("flex-1 min-w-0 transition-opacity", isCollapsed ? "sr-only" : "")}>
                <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.email}</p>
                <p className="text-xs text-gray-500 truncate">Online</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-8 w-8", isCollapsed && "hidden")}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out relative",
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-gray-700 absolute top-4 left-4 z-20 bg-white/50 backdrop-blur-sm">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;