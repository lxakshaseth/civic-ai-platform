import { Outlet, Link, useLocation } from "react-router";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Clock,
  Command,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  Leaf,
  LogOut,
  Megaphone,
  Menu,
  Wallet,
  Search,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { GovFooter } from "../components/GovFooter";
import { GovHeader } from "../components/GovHeader";
import { useAuthState } from "../hooks/useAuthState";
import { useApiData } from "../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatRoleLabel } from "@/src/lib/presentation";
import LoadingSpinner from "../components/LoadingSpinner";

type AdminDashboardSummary = {
  totalUsers: number;
  totalCitizens: number;
  totalEmployees: number;
  totalAdmins: number;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  escalationsCount: number;
};

export default function AdminLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading, isAuthorized, logout } = useAuthState({ requiredRole: "admin" });
  const { data: adminSummary } = useApiData(
    async () => {
      if (loading || !user) {
        return {
          totalUsers: 0,
          totalCitizens: 0,
          totalEmployees: 0,
          totalAdmins: 0,
          totalComplaints: 0,
          resolvedComplaints: 0,
          pendingComplaints: 0,
          escalationsCount: 0,
        } as AdminDashboardSummary;
      }

      return apiRequest<AdminDashboardSummary>("/admin/dashboard");
    },
    [loading, user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading admin workspace..." />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  const navigationSections = [
    {
      title: "Command",
      items: [
        { name: "Overview", href: "/admin", icon: LayoutDashboard, badge: null },
        { name: "AI Assistant", href: "/admin/assistant", icon: Bot, badge: "AI" },
        { name: "Complaint Ops", href: "/admin/complaints", icon: ClipboardList, badge: "Live" },
        { name: "Command Center", href: "/admin/command-center", icon: Command, badge: "Live" },
        { name: "Audit & Compliance", href: "/admin/compliance", icon: ClipboardCheck, badge: "4" },
        { name: "Broadcast Center", href: "/admin/broadcasts", icon: Megaphone, badge: "New" },
      ],
    },
    {
      title: "Workforce",
      items: [{ name: "Employees", href: "/admin/employees", icon: User, badge: null }],
    },
    {
      title: "Analytics",
      items: [
        { name: "Department Performance", href: "/admin/departments", icon: TrendingUp, badge: null },
        { name: "Fraud Detection", href: "/admin/fraud", icon: Shield, badge: "2" },
        { name: "City Health Index", href: "/admin/city-health", icon: Heart, badge: null },
        { name: "Sustainability Index", href: "/admin/sustainability", icon: Leaf, badge: null },
      ],
    },
    {
      title: "Management",
      items: [
        {
          name: "Sanitary Reimbursement Management",
          href: "/admin/sanitary-reimbursement",
          icon: Wallet,
          badge: "Active",
        },
        { name: "User Management", href: "/admin/users", icon: Users, badge: null },
        { name: "Reports", href: "/admin/reports", icon: FileText, badge: "New" },
      ],
    },
  ];

  const navigation = navigationSections.flatMap((section) => section.items);
  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  const adminData = {
    name: user?.fullName ?? "Admin",
    id: user?.id ? user.id.slice(0, 8).toUpperCase() : "ADMIN",
    role: formatRoleLabel(user?.role),
    lastLogin: "Session active",
  };

  const systemStats = {
    totalUsers: adminSummary?.totalUsers ?? 0,
    activeComplaints: adminSummary?.pendingComplaints ?? 0,
    criticalAlerts: adminSummary?.escalationsCount ?? 0,
    systemHealth:
      adminSummary?.totalComplaints && adminSummary.totalComplaints > 0
        ? Math.round((adminSummary.resolvedComplaints / adminSummary.totalComplaints) * 100)
        : 100,
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ name: "Home", href: "/admin" }];

    if (paths[0] === "admin" && paths.length > 1) {
      const currentPage = navigation.find((navItem) => navItem.href === location.pathname);
      if (currentPage) {
        breadcrumbs.push({ name: currentPage.name, href: location.pathname });
      }
    }

    return breadcrumbs;
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gray-50">
      <GovHeader />

      <div className="flex min-h-0 flex-1">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed left-4 top-24 z-50 rounded-lg border border-gray-300 bg-white p-2 shadow-lg lg:hidden"
        >
          {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>

        <aside
          className={`
            fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-1rem))] min-h-0 flex-col overflow-y-auto border-r border-gray-300 bg-white shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            transition-transform duration-200 ease-in-out
            lg:static lg:h-full lg:w-80 lg:translate-x-0
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="border-b border-gray-200 bg-gradient-to-br from-[#1e3a8a] to-[#2563EB] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/30 bg-white/20 p-2 shadow-lg backdrop-blur-sm">
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white">SAIP Admin</h1>
                <p className="text-xs font-medium text-blue-100">Unified command workspace</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <User className="size-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{adminData.name}</p>
                  <p className="text-[11px] text-blue-100">{adminData.role}</p>
                </div>
                <Badge className="border-0 bg-emerald-400/20 text-[11px] text-white shadow-none">
                  Live
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px]">
                <span className="text-blue-100">Admin ID</span>
                <span className="font-mono font-semibold text-white">{adminData.id}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 bg-blue-50/60 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                <Activity className="size-3.5" />
                System Status
              </p>
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="text-[11px] font-semibold text-green-700">Healthy</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <p className="text-[11px] text-gray-500">Users</p>
                <p className="text-sm font-bold text-blue-700">{systemStats.totalUsers}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <p className="text-[11px] text-gray-500">Tasks</p>
                <p className="text-sm font-bold text-orange-600">{systemStats.activeComplaints}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <p className="text-[11px] text-gray-500">Alerts</p>
                <p className="text-sm font-bold text-red-600">{systemStats.criticalAlerts}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                <p className="text-[11px] text-gray-500">Health</p>
                <p className="text-sm font-bold text-green-600">{systemStats.systemHealth}%</p>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search admin tools..."
                className="h-9 border-gray-300 pl-9 text-sm"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <nav className="px-3 py-3">
            <div className="space-y-4">
              {filteredSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  No admin tools match your search.
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {section.title}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <div
                              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                                active
                                  ? "bg-[#1e3a8a] text-white shadow-md"
                                  : "text-gray-700 hover:bg-blue-50 hover:text-[#1e3a8a]"
                              }`}
                            >
                              <Icon
                                className={`size-4 flex-shrink-0 ${
                                  active ? "text-white" : "text-gray-500 group-hover:text-[#1e3a8a]"
                                }`}
                              />
                              <span className="flex-1 text-sm font-medium">{item.name}</span>
                              {item.badge && (
                                <Badge
                                  className={`border-0 px-2 py-0.5 text-[11px] ${
                                    active
                                      ? "bg-white/20 text-white"
                                      : item.badge === "New"
                                        ? "bg-green-100 text-green-700"
                                        : item.badge === "Live"
                                          ? "bg-blue-100 text-blue-700"
                                          : item.badge === "AI"
                                            ? "bg-violet-100 text-violet-700"
                                            : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                              {active && (
                                <div className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </nav>

          <div className="border-t border-gray-200 bg-blue-50/60 px-4 py-3">
            <div className="mb-3 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="size-3.5" />
                <span className="font-semibold">All systems go</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="size-3.5" />
                <span>{adminData.lastLogin}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-10 w-full justify-start border-gray-300 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={logout}
            >
              <LogOut className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
          <div className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm md:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <div key={crumb.href} className="flex items-center gap-2">
                    {idx === 0 ? <Home className="size-4" /> : null}
                    <Link
                      to={crumb.href}
                      className={
                        idx === arr.length - 1
                          ? "font-semibold text-[#1e3a8a]"
                          : "transition-colors hover:text-[#1e3a8a]"
                      }
                    >
                      {crumb.name}
                    </Link>
                    {idx < arr.length - 1 && <ChevronRight className="size-4" />}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {systemStats.criticalAlerts > 0 && (
                  <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
                    <AlertTriangle className="size-3.5 text-red-600" />
                    <span className="font-semibold text-red-700">
                      {systemStats.criticalAlerts} critical alerts
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs">
                  <Activity className="size-3.5 text-green-600" />
                  <span className="font-semibold text-green-700">Command stack healthy</span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <Outlet />
            <GovFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
