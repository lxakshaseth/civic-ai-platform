"use client";

import type { ComponentType } from "react";
import { CompatRouterProvider } from "@/src/lib/router";
import { Toaster } from "./components/ui/sonner";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeRegister from "./pages/EmployeeRegister";
import AdminRegister from "./pages/AdminRegister";
import TwoFactor from "./pages/TwoFactor";
import NotFound from "./pages/NotFound";
import PublicLayout from "./layouts/PublicLayout";
import PublicDashboard from "./pages/public/Dashboard";
import FileComplaint from "./pages/public/FileComplaint";
import MyComplaints from "./pages/public/MyComplaints";
import ComplaintDetail from "./pages/public/ComplaintDetail";
import TransparencyDashboard from "./pages/public/TransparencyDashboard";
import AIChatbot from "./pages/public/AIChatbot";
import PublicNotifications from "./pages/public/Notifications";
import PublicProfile from "./pages/public/Profile";
import SanitaryPads from "./pages/public/SanitaryPads";
import EmergencyContacts from "./pages/public/EmergencyContacts";
import EmployeeLayout from "./layouts/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/Dashboard";
import AssignedComplaints from "./pages/employee/AssignedComplaints";
import MapView from "./pages/employee/MapView";
import UploadEvidence from "./pages/employee/UploadEvidence";
import Performance from "./pages/employee/Performance";
import EmployeeNotifications from "./pages/employee/Notifications";
import EmployeeAIAssistant from "./pages/employee/AIAssistant";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import DepartmentPerformance from "./pages/admin/DepartmentPerformance";
import FraudDetection from "./pages/admin/FraudDetection";
import CityHealthIndex from "./pages/admin/CityHealthIndex";
import SustainabilityIndex from "./pages/admin/SustainabilityIndex";
import UserManagement from "./pages/admin/UserManagement";
import Reports from "./pages/admin/Reports";
import Employees from "./pages/admin/Employees";
import AdminAIAssistant from "./pages/admin/AIAssistant";
import CommandCenter from "./pages/admin/CommandCenter";
import AuditCompliance from "./pages/admin/AuditCompliance";
import BroadcastCenter from "./pages/admin/BroadcastCenter";
import ComplaintOperations from "./pages/admin/ComplaintOperations";
import SanitaryReimbursementPage from "./pages/admin/SanitaryReimbursementPage";

type RouteParams = Record<string, string>;

type RouteDefinition = {
  path: string;
  component: ComponentType;
  layout?: ComponentType;
};

type CompiledRoute = RouteDefinition & {
  pattern: RegExp;
  paramNames: string[];
};

const rawRoutes: RouteDefinition[] = [
  { path: "/", component: Landing },
  { path: "/about", component: About },
  { path: "/services", component: Services },
  { path: "/contact", component: Contact },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/employee-register", component: EmployeeRegister },
  { path: "/admin-register", component: AdminRegister },
  { path: "/2fa", component: TwoFactor },
  { path: "/public", component: PublicDashboard, layout: PublicLayout },
  { path: "/public/file-complaint", component: FileComplaint, layout: PublicLayout },
  { path: "/public/my-complaints", component: MyComplaints, layout: PublicLayout },
  { path: "/public/services", component: Services, layout: PublicLayout },
  { path: "/public/contact", component: Contact, layout: PublicLayout },
  { path: "/public/complaint/:id", component: ComplaintDetail, layout: PublicLayout },
  { path: "/public/transparency", component: TransparencyDashboard, layout: PublicLayout },
  { path: "/public/assistant", component: AIChatbot, layout: PublicLayout },
  { path: "/public/chatbot", component: AIChatbot, layout: PublicLayout },
  { path: "/public/notifications", component: PublicNotifications, layout: PublicLayout },
  { path: "/public/profile", component: PublicProfile, layout: PublicLayout },
  { path: "/public/sanitary-pads", component: SanitaryPads, layout: PublicLayout },
  { path: "/public/emergency-contacts", component: EmergencyContacts, layout: PublicLayout },
  { path: "/employee", component: EmployeeDashboard, layout: EmployeeLayout },
  { path: "/employee/assigned", component: AssignedComplaints, layout: EmployeeLayout },
  { path: "/employee/map", component: MapView, layout: EmployeeLayout },
  { path: "/employee/assistant", component: EmployeeAIAssistant, layout: EmployeeLayout },
  { path: "/employee/evidence/:id", component: UploadEvidence, layout: EmployeeLayout },
  { path: "/employee/performance", component: Performance, layout: EmployeeLayout },
  { path: "/employee/notifications", component: EmployeeNotifications, layout: EmployeeLayout },
  { path: "/admin", component: AdminDashboard, layout: AdminLayout },
  { path: "/admin/assistant", component: AdminAIAssistant, layout: AdminLayout },
  { path: "/admin/complaints", component: ComplaintOperations, layout: AdminLayout },
  { path: "/admin/command-center", component: CommandCenter, layout: AdminLayout },
  { path: "/admin/compliance", component: AuditCompliance, layout: AdminLayout },
  { path: "/admin/broadcasts", component: BroadcastCenter, layout: AdminLayout },
  { path: "/admin/employees", component: Employees, layout: AdminLayout },
  { path: "/admin/departments", component: DepartmentPerformance, layout: AdminLayout },
  { path: "/admin/fraud", component: FraudDetection, layout: AdminLayout },
  { path: "/admin/city-health", component: CityHealthIndex, layout: AdminLayout },
  { path: "/admin/sustainability", component: SustainabilityIndex, layout: AdminLayout },
  {
    path: "/admin/sanitary-reimbursement",
    component: SanitaryReimbursementPage,
    layout: AdminLayout,
  },
  { path: "/admin/users", component: UserManagement, layout: AdminLayout },
  { path: "/admin/reports", component: Reports, layout: AdminLayout },
];

function escapeSegment(segment: string) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRoute(route: RouteDefinition): CompiledRoute {
  if (route.path === "/") {
    return {
      ...route,
      pattern: /^\/$/,
      paramNames: [],
    };
  }

  const paramNames: string[] = [];
  const pattern = route.path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }

      return escapeSegment(segment);
    })
    .join("/");

  return {
    ...route,
    pattern: new RegExp(`^/${pattern}$`),
    paramNames,
  };
}

const routes = rawRoutes.map(compileRoute);

function normalizePathname(slug?: string[]) {
  if (!slug || slug.length === 0) {
    return "/";
  }

  return `/${slug.map((segment) => decodeURIComponent(segment)).join("/")}`;
}

function matchRoute(pathname: string) {
  for (const route of routes) {
    const match = route.pattern.exec(pathname);

    if (!match) {
      continue;
    }

    const params = route.paramNames.reduce<RouteParams>((accumulator, paramName, index) => {
      accumulator[paramName] = decodeURIComponent(match[index + 1] ?? "");
      return accumulator;
    }, {});

    return { route, params };
  }

  return null;
}

export default function RouteRenderer({ slug }: { slug?: string[] }) {
  const pathname = normalizePathname(slug);
  const matchedRoute = matchRoute(pathname);

  if (!matchedRoute) {
    return (
      <CompatRouterProvider params={{}}>
        <NotFound />
        <Toaster />
      </CompatRouterProvider>
    );
  }

  const PageComponent = matchedRoute.route.component;
  const pageElement = <PageComponent />;

  if (matchedRoute.route.layout) {
    const LayoutComponent = matchedRoute.route.layout;

    return (
      <CompatRouterProvider params={matchedRoute.params} outlet={pageElement}>
        <LayoutComponent />
        <Toaster />
      </CompatRouterProvider>
    );
  }

  return (
    <CompatRouterProvider params={matchedRoute.params}>
      {pageElement}
      <Toaster />
    </CompatRouterProvider>
  );
}
