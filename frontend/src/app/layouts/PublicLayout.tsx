import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  FileText, 
  List, 
  TrendingUp, 
  MessageSquare, 
  Bell, 
  User, 
  Globe,
  Phone,
  Building2,
  LogOut,
  Home,
  ChevronRight,
  Search,
  Settings,
  HelpCircle,
  Award,
  Clock,
  CheckCircle2,
  Heart,
  Shield
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useState } from "react";
import { GovFooter } from "../components/GovFooter";
import { useAuthState } from "../hooks/useAuthState";
import { useApiData } from "../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { normalizeComplaintStatusKey } from "@/src/lib/presentation";
import LoadingSpinner from "../components/LoadingSpinner";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";

type CitizenComplaintSummary = {
  id: string;
  status?: string | null;
};

type NotificationStats = {
  total: number;
  unread: number;
  read: number;
};

export default function PublicLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, loading, isAuthorized, logout } = useAuthState({ requiredRole: "public" });
  const { data: sidebarData } = useApiData(
    async () => {
      if (loading || !user) {
        return {
          complaintCount: 0,
          resolvedCount: 0,
          unreadNotifications: 0,
        };
      }

      const [complaints, notificationStats] = await Promise.all([
        apiRequest<CitizenComplaintSummary[]>("/complaints", {
          query: { mine: true },
        }),
        apiRequest<NotificationStats>("/notifications/stats"),
      ]);

      const resolvedCount = complaints.filter((complaint) =>
        ["completed", "verified"].includes(normalizeComplaintStatusKey(complaint.status))
      ).length;

      return {
        complaintCount: complaints.length,
        resolvedCount,
        unreadNotifications: notificationStats.unread,
      };
    },
    [loading, user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading citizen portal..." />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  const primaryNavigation = [
    { name: "Dashboard", href: "/public", icon: LayoutDashboard, badge: null },
    { name: "File Complaint", href: "/public/file-complaint", icon: FileText, badge: null },
    {
      name: "My Complaints",
      href: "/public/my-complaints",
      icon: List,
      badge: sidebarData?.complaintCount ? String(sidebarData.complaintCount) : null,
    },
    { name: "Services", href: "/public/services", icon: Globe, badge: null },
    { name: "Sanitary Pads", href: "/public/sanitary-pads", icon: Heart, badge: "New" },
    { name: "Emergency Contacts", href: "/public/emergency-contacts", icon: Shield, badge: null },
    { name: "Contact Support", href: "/public/contact", icon: Phone, badge: null },
    { name: "AI Assistant", href: "/public/assistant", icon: MessageSquare, badge: "AI" },
  ];

  const utilityNavigation = [
    { name: "Transparency Dashboard", href: "/public/transparency", icon: TrendingUp, badge: null },
    {
      name: "Notifications",
      href: "/public/notifications",
      icon: Bell,
      badge: sidebarData?.unreadNotifications ? String(sidebarData.unreadNotifications) : null,
    },
    { name: "Profile", href: "/public/profile", icon: User, badge: null },
  ];

  const navigation = [...primaryNavigation, ...utilityNavigation];

  const quickActions = [
    { name: "Settings", href: "/public/profile", icon: Settings },
    { name: "AI Assistant", href: "/public/assistant", icon: HelpCircle },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isSearching = searchQuery.trim().length > 0;

  const userData = {
    name: user?.fullName ?? "Citizen",
    email: user?.email ?? "signed-in@saip.gov",
    complaintCount: sidebarData?.complaintCount ?? 0,
    resolvedCount: sidebarData?.resolvedCount ?? 0,
  };

  const isActive = (href: string) => {
    if (href === "/public") {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  // Breadcrumb generation
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', href: '/public' }];
    
    if (paths[0] === 'public' && paths.length > 1) {
      const currentPage = navigation.find(nav => nav.href === location.pathname);
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
      sidebarWidth={288}
      sidebar={
        <>
          {/* Logo & User Section */}
          <div className="border-b border-gray-200 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] px-5 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/20 p-2.5 shadow-lg backdrop-blur-sm">
                <Building2 className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white">SAIP Portal</h1>
                <p className="text-xs font-medium text-blue-100">Citizen Dashboard</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <User className="size-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{userData.name}</p>
                  <p className="truncate text-xs text-blue-100">{userData.email}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex-1 rounded-xl bg-white/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-blue-100">Active</p>
                  <p className="mt-1 text-base font-bold text-white">{userData.complaintCount}</p>
                </div>
                <div className="flex-1 rounded-xl bg-white/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-blue-100">Resolved</p>
                  <p className="mt-1 text-base font-bold text-white">{userData.resolvedCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input 
                placeholder="Search menu..." 
                className="h-10 border-gray-300 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Main Menu</p>
              <div className="space-y-1">
                {(isSearching ? filteredNavigation : primaryNavigation).map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all ${
                          active
                            ? "bg-[#1e3a8a] text-white shadow-md"
                            : "text-gray-700 hover:bg-blue-50 hover:text-[#1e3a8a]"
                        }`}
                      >
                        <div className={`rounded-xl p-1.5 ${active ? "bg-white/15" : "bg-blue-50"}`}>
                          <Icon className={`size-4 flex-shrink-0 ${active ? "text-white" : "text-[#1e3a8a]"}`} />
                        </div>
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        {item.badge && (
                          <Badge 
                            className={`border-0 px-2 py-0.5 text-[11px] ${
                              active 
                                ? 'bg-white/20 text-white' 
                                : item.badge === "New" 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700'
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

              {filteredNavigation.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500">
                  No menu found for "{searchQuery}".
                </div>
              )}
            </div>

            {!isSearching && (
              <div className="mt-3 flex flex-1 flex-col">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Important Tools</p>
                    <Badge className="border border-gray-200 bg-white text-gray-700 shadow-none">3 Links</Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {utilityNavigation.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <div
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                              active
                                ? "bg-[#1e3a8a] text-white"
                                : "bg-white text-gray-700 hover:bg-blue-50 hover:text-[#1e3a8a]"
                            }`}
                          >
                            <Icon className={`size-4 ${active ? "text-white" : "text-[#1e3a8a]"}`} />
                            <span className="flex-1 text-xs font-semibold">{item.name}</span>
                            {item.badge && (
                              <Badge className={`border-0 px-2 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2.5 rounded-2xl border border-gray-200 bg-gray-50/80 p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Actions</p>
                    <Badge className="border border-gray-200 bg-white text-gray-700 shadow-none">2 Tools</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 transition-all hover:border-blue-200 hover:bg-blue-50">
                            <Icon className="mb-1 size-4 text-[#1e3a8a]" />
                            <p className="text-[11px] font-semibold leading-tight text-gray-800">{item.name}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2.5 flex min-h-[72px] flex-1 flex-col justify-between rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Support</p>
                    <h3 className="mt-1 text-sm font-bold text-gray-900">Citizen help is ready</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      Key services, complaint tools, and support links are organized here without menu overlap.
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-green-700">
                      <CheckCircle2 className="size-3.5" />
                      <span className="font-semibold">Portal Active</span>
                    </div>
                    <span className="text-gray-500">24x7 help</span>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Stats Footer */}
          <div className="border-t border-gray-200 bg-blue-50/50 px-4 py-3 flex-shrink-0">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="size-3.5" />
                <span className="font-semibold">Account Active</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="size-3.5" />
                <span>Last login: Today</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-10 w-full justify-start border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
              onClick={logout}
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </>
      }
      header={
        <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {getBreadcrumbs().map((crumb, idx, arr) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {idx === 0 ? (
                    <Home className="size-4" />
                  ) : null}
                  <Link 
                    to={crumb.href} 
                    className={`${idx === arr.length - 1 ? 'text-[#1e3a8a] font-semibold' : 'hover:text-[#1e3a8a] transition-colors'}`}
                  >
                    {crumb.name}
                  </Link>
                  {idx < arr.length - 1 && <ChevronRight className="size-4" />}
                </div>
              ))}
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Award className="size-4 text-blue-600" />
                <span className="text-gray-600">Citizen ID:</span>
                <span className="font-mono font-semibold text-gray-900">
                  {user?.id ? user.id.slice(0, 8).toUpperCase() : "SESSION"}
                </span>
              </div>
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
