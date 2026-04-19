import { Link } from "react-router";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Command,
  FileText,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useApiData } from "../../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatDate, formatComplaintStatus } from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type AdminSummary = {
  totalUsers: number;
  totalCitizens: number;
  totalEmployees: number;
  totalAdmins: number;
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  escalationsCount: number;
};

type AnalyticsDashboard = {
  overview: {
    averageResolutionHours: number;
    resolutionRate: number;
    totalComplaints: number;
    pendingCount: number;
    resolvedCount: number;
    closedCount: number;
    openCount: number;
    inProgressCount: number;
  };
  trends: Array<{
    period: string;
    totalComplaints: number;
    resolvedCount: number;
    closedCount: number;
    openCount: number;
    inProgressCount: number;
  }>;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    totalComplaints: number;
    resolvedCount: number;
    closedCount: number;
    averageResolutionHours: number;
    resolutionRate: number;
    averageRating: number;
  }>;
  departmentLeaderboard: Array<{
    rank: number;
    departmentId: string;
    departmentName: string;
    score: number;
    resolvedCount: number;
    resolutionRate: number;
    averageRating: number;
  }>;
  satisfaction: {
    averageRating: number;
    totalRatings: number;
  };
  cityHealth: {
    cityScore: number;
  };
};

type UnassignedComplaint = {
  complaintId: string;
  title: string;
  category?: string | null;
  pincode?: string | null;
  createdAt?: string | null;
  department?: string | null;
  status?: string | null;
};

export default function AdminDashboard() {
  const user = useCurrentUser();
  const { data, error, loading } = useApiData(
    async () => {
      const [summary, analytics, unassignedComplaints] = await Promise.all([
        apiRequest<AdminSummary>("/admin/dashboard"),
        apiRequest<AnalyticsDashboard>("/analytics/dashboard", {
          query: { interval: "month", limit: 6 },
        }),
        apiRequest<UnassignedComplaint[]>("/complaints/unassigned"),
      ]);

      return { summary, analytics, unassignedComplaints };
    },
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading admin dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load admin dashboard</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const averageResolutionDays = Number(
    (data.analytics.overview.averageResolutionHours / 24).toFixed(1)
  );
  const satisfactionPercent = Math.round(
    data.analytics.satisfaction.averageRating > 0
      ? data.analytics.satisfaction.averageRating * 20
      : data.analytics.cityHealth.cityScore
  );

  const kpis = [
    {
      label: "Avg Resolution Time",
      value: `${averageResolutionDays} days`,
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hint: `${data.analytics.overview.resolutionRate}% resolution rate`,
    },
    {
      label: "Open Complaints",
      value: data.summary.pendingComplaints,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      hint: `${data.summary.escalationsCount} escalations active`,
    },
    {
      label: "Registered Users",
      value: data.summary.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hint: `${data.summary.totalEmployees} employees, ${data.summary.totalAdmins} admins`,
    },
    {
      label: "Citizen Satisfaction",
      value: `${satisfactionPercent}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      hint: `${data.analytics.satisfaction.totalRatings} ratings collected`,
    },
  ];

  const trendData = data.analytics.trends.map((item) => ({
    period: item.period,
    complaints: item.totalComplaints,
    resolved: item.resolvedCount + item.closedCount,
    active: item.openCount + item.inProgressCount,
  }));

  const departmentData = data.analytics.byDepartment.slice(0, 6).map((department) => ({
    dept: department.departmentName,
    total: department.totalComplaints,
    resolved: department.resolvedCount + department.closedCount,
  }));

  const featureSuites = [
    {
      title: "AI Assistant",
      detail: "Ask for staffing plans, summaries, and escalation advice.",
      href: "/admin/assistant",
      icon: Bot,
      badge: "AI",
    },
    {
      title: "Command Center",
      detail: "Track live queue health and department workload.",
      href: "/admin/command-center",
      icon: Command,
      badge: "Live",
    },
    {
      title: "User Management",
      detail: "Review role distribution for citizens, employees, and admins.",
      href: "/admin/users",
      icon: Users,
      badge: String(data.summary.totalUsers),
    },
    {
      title: "Reports",
      detail: "Export operational summaries for review and compliance.",
      href: "/admin/reports",
      icon: FileText,
      badge: "Ready",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Command className="size-3.5" />
            Live admin command workspace
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Admin Overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            User counts, complaint movement, department performance, and queue pressure are now coming directly from the backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/admin/assistant">
            <Button className="bg-[#1e3a8a] hover:bg-[#1e40af]">
              <Bot className="mr-2 size-4" />
              Open AI Assistant
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="outline" className="border-gray-300">
              <Users className="mr-2 size-4" />
              Open User Management
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Card key={kpi.label} className="border-gray-200 p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <div className={`${kpi.bgColor} rounded-lg p-2`}>
                  <Icon className={`size-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="mb-1 text-3xl font-bold text-gray-950">{kpi.value}</div>
              <div className="text-sm text-muted-foreground">{kpi.hint}</div>
            </Card>
          );
        })}
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <Card className="border-gray-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-950">Complaint Trends</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="complaints" stroke="#2563EB" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#16A34A" strokeWidth={2} />
              <Line type="monotone" dataKey="active" stroke="#D97706" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-950">Unassigned Queue</h2>
              <p className="text-sm text-muted-foreground">Complaints waiting for admin action</p>
            </div>
            <Badge className="border-0 bg-red-100 text-red-700 shadow-none">
              {data.unassignedComplaints.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {data.unassignedComplaints.slice(0, 4).map((complaint) => (
              <div key={complaint.complaintId} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-950">{complaint.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {complaint.category || "General"} | {complaint.department || "Unassigned"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-gray-700">
                      Created {formatDate(complaint.createdAt)}
                    </p>
                  </div>
                  <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">
                    {formatComplaintStatus(complaint.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-gray-950">Suggested next move</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Assign the oldest unassigned complaints first to reduce pending load and escalation risk.
            </p>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-gray-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-950">Department Resolution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#2563EB" name="Total" />
              <Bar dataKey="resolved" fill="#16A34A" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-gray-200 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-950">City Health Snapshot</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">City Score</p>
              <p className="mt-2 text-3xl font-bold text-[#1e3a8a]">
                {Math.round(data.analytics.cityHealth.cityScore)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Resolution Rate</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {Math.round(data.analytics.overview.resolutionRate)}%
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Citizens</p>
              <p className="mt-2 text-3xl font-bold text-gray-950">{data.summary.totalCitizens}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="mt-2 text-3xl font-bold text-gray-950">{data.summary.totalEmployees}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6 border-gray-200 p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">Admin Feature Suite</h2>
            <p className="text-sm text-muted-foreground">
              Jump into the operational tools that are now backed by live backend data.
            </p>
          </div>
          <Badge className="w-fit border-0 bg-slate-100 text-slate-700 shadow-none">4 core tools</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureSuites.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link key={feature.title} to={feature.href}>
                <div className="group h-full rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3">
                      <Icon className="size-5 text-gray-800" />
                    </div>
                    <Badge className="border-0 bg-blue-50 text-blue-700 shadow-none">{feature.badge}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{feature.detail}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="border-gray-200 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">Department Leaderboard</h2>
            <p className="text-sm text-muted-foreground">Live quality and speed across teams</p>
          </div>
          <Badge className="border-0 bg-emerald-100 text-emerald-700 shadow-none">
            {data.analytics.departmentLeaderboard.length} teams
          </Badge>
        </div>

        <div className="space-y-4">
          {data.analytics.departmentLeaderboard.map((department) => (
            <div key={department.departmentId} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-950">
                    #{department.rank} {department.departmentName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {department.resolvedCount} resolved | {Math.round(department.resolutionRate)}% rate
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#1e3a8a]">{department.score}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Avg rating</span>
                <span className="font-medium text-gray-900">{department.averageRating.toFixed(1)}/5</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
