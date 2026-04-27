import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  List, 
  Map, 
  Upload, 
  TrendingUp, 
  Bell, 
  Building2,
  LogOut,
  Home,
  ChevronRight,
  Search,
  User,
  Target,
  Clock,
  CheckCircle2,
  Award,
  Calendar,
  MapPin,
  Bot
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useState } from "react";
import { GovFooter } from "../components/GovFooter";
import { useAuthState } from "../hooks/useAuthState";
import { useApiData } from "../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatPriority } from "@/src/lib/presentation";
import LoadingSpinner from "../components/LoadingSpinner";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";

type EmployeeDashboardData = {
  summary: {
    totalAssignedTasks: number;
    completedTasks: number;
    pendingTasks: number;
    escalatedTickets: number;
    unreadNotifications: number;
  };
  recentTasks: Array<{
    id: string;
    title: string;
    department?: string | null;
    address?: string | null;
    priority?: string | null;
    ticketCount?: number;
  }>;
};

type EmployeePerformanceData = {
  summary: {
    totalTasksCompleted: number;
    rating: number;
    completionRate: number;
    totalAssigned: number;
  };
};

export default function EmployeeLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading, isAuthorized, logout } = useAuthState({ requiredRole: "employee" });
  const { data: employeePortalData } = useApiData(
    async () => {
      if (loading || !user || location.pathname === "/employee") {
        return {
          dashboard: {
            summary: {
              totalAssignedTasks: 0,
              completedTasks: 0,
              pendingTasks: 0,
              escalatedTickets: 0,
              unreadNotifications: 0,
            },
            recentTasks: [],
          } as EmployeeDashboardData,
          performance: {
            summary: {
              totalTasksCompleted: 0,
              rating: 0,
              completionRate: 0,
              totalAssigned: 0,
            },
          } as EmployeePerformanceData,
        };
      }

      const [dashboard, performance] = await Promise.all([
        apiRequest<EmployeeDashboardData>("/employee/dashboard"),
        apiRequest<EmployeePerformanceData>("/employee/performance"),
      ]);

      return { dashboard, performance };
    },
    [loading, location.pathname, user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading employee workspace..." />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  const priorityTask = employeePortalData?.dashboard.recentTasks[0] ?? null;
  const priorityTaskHref = priorityTask?.id
    ? `/employee/evidence/${priorityTask.id}`
    : "/employee/assigned";
  const employeeData = {
    name: user?.fullName ?? "Employee",
    id: user?.id ? user.id.slice(0, 8).toUpperCase() : "EMPLOYEE",
    department: priorityTask?.department || "Municipal Operations",
    tasksAssigned: employeePortalData?.dashboard.summary.totalAssignedTasks ?? 0,
    tasksCompleted: employeePortalData?.performance.summary.totalTasksCompleted ?? 0,
    rating: employeePortalData?.performance.summary.rating ?? 0,
    attendance: `${Math.round(employeePortalData?.performance.summary.completionRate ?? 0)}%`,
  };

  const todayStats = {
    pending: employeePortalData?.dashboard.summary.pendingTasks ?? 0,
    inProgress: Math.max(
      (employeePortalData?.dashboard.summary.totalAssignedTasks ?? 0) -
        (employeePortalData?.dashboard.summary.completedTasks ?? 0) -
        (employeePortalData?.dashboard.summary.pendingTasks ?? 0),
      0
    ),
    completed: employeePortalData?.dashboard.summary.completedTasks ?? 0,
  };

  const navigation = [
    { name: "Dashboard", href: "/employee", icon: LayoutDashboard, badge: null, helper: "Daily overview" },
    { name: "AI Assistant", href: "/employee/assistant", icon: Bot, badge: "AI", helper: "Route, notes, replies" },
    {
      name: "Assigned Tasks",
      href: "/employee/assigned",
      icon: List,
      badge: employeeData.tasksAssigned ? String(employeeData.tasksAssigned) : null,
      helper: "All active complaints",
    },
    { name: "Map View", href: "/employee/map", icon: Map, badge: null, helper: "Route and nearby work" },
    {
      name: "Upload Evidence",
      href: priorityTaskHref,
      matchPrefix: "/employee/evidence",
      icon: Upload,
      badge: priorityTask ? "Live" : null,
      helper: priorityTask ? "Close priority task" : "Submit Work Proof",
    },
    { name: "Performance", href: "/employee/performance", icon: TrendingUp, badge: null, helper: "Efficiency and rating" },
    {
      name: "Notifications",
      href: "/employee/notifications",
      icon: Bell,
      badge: employeePortalData?.dashboard.summary.unreadNotifications
        ? String(employeePortalData.dashboard.summary.unreadNotifications)
        : null,
      helper: "Unread alerts",
    },
  ];

  const quickActions = [
    { name: "AI Help", href: "/employee/assistant", icon: Bot, meta: "Ask anything" },
    { name: "Start Priority", href: priorityTaskHref, icon: Target, meta: priorityTask ? "High urgency" : "Open queue" },
    { name: "Open Route", href: "/employee/map", icon: Map, meta: "Best path" },
    { name: "Task Queue", href: "/employee/assigned", icon: List, meta: "Pending + active" },
  ];

  const quickMetrics = [
    { label: "Completed", value: String(employeeData.tasksCompleted) },
    { label: "Attendance", value: employeeData.attendance },
    { label: "Rating", value: `${employeeData.rating}/5` },
    { label: "Tickets", value: String(employeePortalData?.dashboard.summary.escalatedTickets ?? 0) },
  ];

  const smartAssistantTools = [
    { title: "Route Advice", detail: "Best task order for the shift" },
    { title: "Note Drafts", detail: "Ready closure and delay updates" },
    { title: "Material Tips", detail: "Checklist before site visit" },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isActive = (item: (typeof navigation)[number]) => {
    if (item.href === "/employee") {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.matchPrefix ?? item.href);
  };

  // Breadcrumb generation
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', href: '/employee' }];
    
    if (paths[0] === 'employee' && paths.length > 1) {
      const currentPage = navigation.find((nav) =>
        nav.matchPrefix ? location.pathname.startsWith(nav.matchPrefix) : nav.href === location.pathname
      );
      if (currentPage) {
        breadcrumbs.push({ name: currentPage.name, href: location.pathname });
      }
    }
    
    return breadcrumbs;
  };

  return (
    <DashboardLayout
      isMobileMenuOpen={isMobileMenuOpen}
      onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      onMobileMenuToggle={() => setIsMobileMenuOpen((open) => !open)}
      sidebarWidth={320}
      sidebar={
        <>
          {/* Logo & Employee Section */}
          <div className="p-5 border-b border-gray-200 bg-gradient-to-br from-[#166534] via-[#15803d] to-[#22c55e] flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-2xl shadow-lg border border-white/30">
                <Building2 className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">SAIP Portal</h1>
                <p className="text-xs text-green-100 font-medium">Field Employee Workspace</p>
              </div>
            </div>
            
            {/* Employee Info Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <User className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{employeeData.name}</p>
                  <p className="text-xs text-green-100 font-mono">{employeeData.id}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-100">Department:</span>
                  <span className="text-white font-semibold truncate ml-2">{employeeData.department}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-green-100">Tasks</p>
                    <p className="text-base font-bold text-white">{employeeData.tasksAssigned}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-green-100">Rating</p>
                    <div className="flex items-center gap-1 text-white">
                      <Award className="size-3 text-yellow-300" />
                      <span className="text-base font-bold">{employeeData.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Tasks Summary */}
          <div className="p-4 bg-green-50/40 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Today's Tasks
              </p>
              <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-green-700 border border-green-200">
                On Duty
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-2.5 text-center border border-gray-200">
                <p className="text-[11px] text-gray-500">Pending</p>
                <p className="text-lg font-bold text-orange-600 leading-none mt-1">{todayStats.pending}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 text-center border border-gray-200">
                <p className="text-[11px] text-gray-500">Active</p>
                <p className="text-lg font-bold text-blue-600 leading-none mt-1">{todayStats.inProgress}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 text-center border border-gray-200">
                <p className="text-[11px] text-gray-500">Done</p>
                <p className="text-lg font-bold text-green-600 leading-none mt-1">{todayStats.completed}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-green-200 bg-white px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="size-3.5" />
                <span className="font-semibold">Shift Live</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="size-3.5" />
                <span>9 AM - 5 PM</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input 
                placeholder="Search feature or page..." 
                className="pl-9 h-10 text-sm border-gray-300 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">Workspace</p>
              <div className="space-y-2">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div
                        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all group relative ${
                          active
                            ? "bg-[#15803d] text-white border-[#15803d] shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:text-[#15803d] hover:border-green-200"
                        }`}
                      >
                        <div className={`rounded-xl p-2 ${active ? "bg-white/15" : "bg-green-50"}`}>
                          <Icon className={`size-4 flex-shrink-0 ${active ? "text-white" : "text-[#15803d]"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-none">{item.name}</p>
                          <p className={`text-[11px] mt-1 ${active ? "text-green-100" : "text-gray-500"}`}>{item.helper}</p>
                        </div>
                        {item.badge && (
                          <Badge 
                            className={`text-[11px] px-2 py-0.5 ${
                              active 
                                ? "bg-white/20 text-white" 
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-9 bg-white rounded-r-full" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {filteredNavigation.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500">
                  No menu found for "{searchQuery}".
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Quick Actions</p>
                <Badge className="bg-white text-gray-700 border border-gray-200 shadow-none">Fast Access</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.name} to={action.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 hover:border-green-200 hover:bg-green-50 transition-all">
                        <Icon className="size-4 text-[#15803d] mb-2" />
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{action.name}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{action.meta}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">AI Assistant</p>
                  <h3 className="mt-1 text-sm font-bold text-gray-900">Smart field support</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    Route planning, work-note drafts, and delay responses in one place.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-2 shadow-sm">
                  <Bot className="size-4 text-blue-700" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {smartAssistantTools.map((tool) => (
                  <div key={tool.title} className="rounded-xl border border-blue-100 bg-white/90 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">{tool.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">{tool.detail}</p>
                  </div>
                ))}
              </div>
              <Link to="/employee/assistant" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="mt-3 w-full bg-blue-700 hover:bg-blue-800">
                  <Bot className="mr-2 size-4" />
                  Open AI Assistant
                </Button>
              </Link>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">AI Priority Focus</p>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">
                    {priorityTask?.title ?? "Open your active queue"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <MapPin className="size-3.5" />
                    <span>{priorityTask?.address ?? employeeData.department}</span>
                    <span className="text-gray-400">|</span>
                    <span>
                      {priorityTask ? `${priorityTask.ticketCount ?? 0} tickets linked` : "No live priority task"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-700">Assistant suggests completing this before noon.</p>
                </div>
                <Badge className="bg-red-100 text-red-700 border border-red-200 shadow-none">
                  {priorityTask ? formatPriority(priorityTask.priority) : "Queue"}
                </Badge>
              </div>
              <Link to={priorityTaskHref} onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full mt-3 bg-[#15803d] hover:bg-[#166534]">
                  <Target className="size-4 mr-2" />
                  {priorityTask ? "Start Task Now" : "Open Task Queue"}
                </Button>
              </Link>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">Quick Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {quickMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </nav>

          {/* Status Footer */}
          <div className="p-4 border-t border-gray-200 bg-green-50/50 flex-shrink-0">
            <Button variant="outline" className="w-full justify-start border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all rounded-xl" onClick={logout}>
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </>
      }
      header={
        <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {getBreadcrumbs().map((crumb, idx, arr) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {idx === 0 ? (
                    <Home className="size-4" />
                  ) : null}
                  <Link 
                    to={crumb.href} 
                    className={`${idx === arr.length - 1 ? 'text-[#15803d] font-semibold' : 'hover:text-[#15803d] transition-colors'}`}
                  >
                    {crumb.name}
                  </Link>
                  {idx < arr.length - 1 && <ChevronRight className="size-4" />}
                </div>
              ))}
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-xs bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
              <MapPin className="size-3.5 text-green-600" />
              <span className="text-gray-700">Current Department:</span>
              <span className="font-semibold text-green-700">{employeeData.department}</span>
            </div>
          </div>
        </div>
      }
      footer={<GovFooter />}
    >
      <Outlet />
    </DashboardLayout>
  );
}
