import { Link } from "react-router";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useApiData } from "../../hooks/useApiData";
import { apiRequest } from "@/src/lib/api";
import { formatDate, formatPriority, getPriorityClasses } from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

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
    address?: string | null;
    priority?: string | null;
    department?: string | null;
    dueDate?: string | null;
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

export default function EmployeeDashboard() {
  const user = useCurrentUser();
  const { data, error, loading } = useApiData(
    async () => {
      const [dashboard, performance] = await Promise.all([
        apiRequest<EmployeeDashboardData>("/employee/dashboard"),
        apiRequest<EmployeePerformanceData>("/employee/performance"),
      ]);

      return { dashboard, performance };
    },
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading employee dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load employee workspace</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = [
    {
      label: "Assigned Tasks",
      value: data.dashboard.summary.totalAssignedTasks,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Pending",
      value: data.dashboard.summary.pendingTasks,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "Completed",
      value: data.dashboard.summary.completedTasks,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Completion Rate",
      value: `${Math.round(data.performance.summary.completionRate)}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const tasks = data.dashboard.recentTasks;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome Back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Your task queue, escalation load, and performance metrics are synced from the backend.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={`size-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Assigned Tasks</h2>
              <Link to="/employee/assigned">
                <Button variant="link" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-muted-foreground">
                No active tasks have been assigned yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs">{task.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.department || "Department pending"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="size-3" />
                          {task.address || "Location unavailable"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due {formatDate(task.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityClasses(task.priority)}>
                          {formatPriority(task.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/employee/evidence/${task.id}`}>
                          <Button size="sm">Start</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="size-5 text-primary" />
              <h3 className="font-semibold">AI Suggested Order</h3>
            </div>
            <div className="space-y-3">
              {tasks.slice(0, 4).map((task, index) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="bg-primary size-6 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {task.ticketCount ?? 0} escalation tickets
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              AI assistant prioritizes tasks with higher urgency and ticket pressure first.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Live Summary</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span>Escalated Tickets</span>
                <span className="font-semibold text-gray-900">
                  {data.dashboard.summary.escalatedTickets}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span>Unread Notifications</span>
                <span className="font-semibold text-gray-900">
                  {data.dashboard.summary.unreadNotifications}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span>Citizen Rating</span>
                <span className="font-semibold text-gray-900">
                  {data.performance.summary.rating}/5
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
