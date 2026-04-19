import { createBrowserRouter } from "react-router";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeRegister from "./pages/EmployeeRegister";
import AdminRegister from "./pages/AdminRegister";
import TwoFactor from "./pages/TwoFactor";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";

// Public Portal
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

// Employee Portal
import EmployeeLayout from "./layouts/EmployeeLayout";
import EmployeeDashboard from "./pages/employee/Dashboard";
import AssignedComplaints from "./pages/employee/AssignedComplaints";
import MapView from "./pages/employee/MapView";
import UploadEvidence from "./pages/employee/UploadEvidence";
import Performance from "./pages/employee/Performance";
import EmployeeNotifications from "./pages/employee/Notifications";
import EmployeeAIAssistant from "./pages/employee/AIAssistant";

// Admin Portal
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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Landing,
  },
  {
    path: "/about",
    Component: About,
  },
  {
    path: "/services",
    Component: Services,
  },
  {
    path: "/contact",
    Component: Contact,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/employee-register",
    Component: EmployeeRegister,
  },
  {
    path: "/admin-register",
    Component: AdminRegister,
  },
  {
    path: "/2fa",
    Component: TwoFactor,
  },
  {
    path: "/public",
    Component: PublicLayout,
    children: [
      { index: true, Component: PublicDashboard },
      { path: "file-complaint", Component: FileComplaint },
      { path: "my-complaints", Component: MyComplaints },
      { path: "services", Component: Services },
      { path: "contact", Component: Contact },
      { path: "complaint/:id", Component: ComplaintDetail },
      { path: "transparency", Component: TransparencyDashboard },
      { path: "assistant", Component: AIChatbot },
      { path: "chatbot", Component: AIChatbot },
      { path: "notifications", Component: PublicNotifications },
      { path: "profile", Component: PublicProfile },
      { path: "sanitary-pads", Component: SanitaryPads },
      { path: "emergency-contacts", Component: EmergencyContacts },
    ],
  },
  {
    path: "/employee",
    Component: EmployeeLayout,
    children: [
      { index: true, Component: EmployeeDashboard },
      { path: "assigned", Component: AssignedComplaints },
      { path: "map", Component: MapView },
      { path: "assistant", Component: EmployeeAIAssistant },
      { path: "evidence/:id", Component: UploadEvidence },
      { path: "performance", Component: Performance },
      { path: "notifications", Component: EmployeeNotifications },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "assistant", Component: AdminAIAssistant },
      { path: "complaints", Component: ComplaintOperations },
      { path: "command-center", Component: CommandCenter },
      { path: "compliance", Component: AuditCompliance },
      { path: "broadcasts", Component: BroadcastCenter },
      { path: "employees", Component: Employees },
      { path: "departments", Component: DepartmentPerformance },
      { path: "fraud", Component: FraudDetection },
      { path: "city-health", Component: CityHealthIndex },
      { path: "sustainability", Component: SustainabilityIndex },
      { path: "users", Component: UserManagement },
      { path: "reports", Component: Reports },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
