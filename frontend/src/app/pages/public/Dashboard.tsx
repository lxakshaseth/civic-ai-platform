import { Link } from "react-router";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  MapPin,
  Shield,
  TrendingUp,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
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
import {
  formatComplaintStatus,
  formatPriority,
  getComplaintStatusClasses,
  getPriorityClasses,
  normalizeComplaintStatusKey,
} from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type CitizenComplaint = {
  id: string;
  title: string;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
};

type NotificationStats = {
  total: number;
  unread: number;
  read: number;
};

type PublicSummary = {
  cards: {
    totalComplaints: number;
    openCount: number;
    inProgressCount: number;
    resolvedCount: number;
    rejectedCount: number;
    reopenedCount: number;
    averageResolutionHours: number;
  };
  citySummary: {
    cityScore: number;
  };
};

export default function PublicDashboard() {
  const user = useCurrentUser();
  const { data, error, loading } = useApiData(
    async () => {
      const [complaints, notificationStats, publicSummary] = await Promise.all([
        apiRequest<CitizenComplaint[]>("/complaints", {
          query: { mine: true },
        }),
        apiRequest<NotificationStats>("/notifications/stats"),
        apiRequest<PublicSummary>("/analytics/public/summary"),
      ]);

      const counts = complaints.reduce(
        (summary, complaint) => {
          const normalizedStatus = normalizeComplaintStatusKey(complaint.status);

          summary.total += 1;

          if (normalizedStatus === "completed" || normalizedStatus === "verified") {
            summary.resolved += 1;
          } else if (normalizedStatus === "in_progress") {
            summary.inProgress += 1;
          } else {
            summary.pending += 1;
          }

          return summary;
        },
        { total: 0, resolved: 0, inProgress: 0, pending: 0 }
      );

      return {
        complaints,
        counts,
        notificationStats,
        publicSummary,
      };
    },
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading citizen dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load dashboard</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Complaints",
      value: data.counts.total,
      icon: FileText,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
    },
    {
      label: "Resolved",
      value: data.counts.resolved,
      icon: CheckCircle,
      color: "text-green-700",
      bgColor: "bg-green-50",
    },
    {
      label: "In Progress",
      value: data.counts.inProgress,
      icon: Clock,
      color: "text-orange-700",
      bgColor: "bg-orange-50",
    },
    {
      label: "Pending",
      value: data.counts.pending,
      icon: AlertCircle,
      color: "text-red-700",
      bgColor: "bg-red-50",
    },
  ];

  const recentComplaints = data.complaints.slice(0, 5);
  const cityScore = Math.round(data.publicSummary.citySummary.cityScore ?? 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome Back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ", Citizen"}!
        </h1>
        <p className="text-muted-foreground">
          Track your complaints, unread alerts, and live city support updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      <Card className="p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {data.notificationStats.unread} unread notifications are waiting for you.
            </p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link to="/public/file-complaint">
              <Button className="bg-primary hover:bg-primary/90">
                <FileText className="size-4 mr-2" />
                File New Complaint
              </Button>
            </Link>
            <Link to="/public/my-complaints">
              <Button variant="outline">View My Complaints</Button>
            </Link>
            <Link to="/public/notifications">
              <Button variant="outline">Open Notifications</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Complaints</h2>
            <Link to="/public/my-complaints">
              <Button variant="link" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {recentComplaints.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-muted-foreground">
              You have not filed any complaints yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        to={`/public/complaint/${complaint.id}`}
                        className="text-primary hover:underline"
                      >
                        {complaint.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{complaint.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {complaint.category || "General"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getComplaintStatusClasses(complaint.status)}>
                        {formatComplaintStatus(complaint.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityClasses(complaint.priority)}>
                        {formatPriority(complaint.priority)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">City Resolution Score</h2>
          <div className="text-center py-8">
            <div className="relative inline-flex items-center justify-center">
              <svg className="size-32">
                <circle
                  className="text-gray-200"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  r="52"
                  cx="64"
                  cy="64"
                />
                <circle
                  className="text-accent"
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - cityScore / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="52"
                  cx="64"
                  cy="64"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              </svg>
              <div className="absolute">
                <p className="text-4xl font-bold text-accent">{cityScore}%</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4">Live public city service score</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <TrendingUp className="size-4 text-accent" />
              <span className="text-sm text-accent font-medium">
                Avg resolution time {data.publicSummary.cards.averageResolutionHours.toFixed(1)} hrs
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="p-6 border-2 border-rose-100 bg-gradient-to-br from-rose-50 to-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                <Heart className="size-4" />
                New citizen support
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Sanitary pad reimbursement</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Buy from the nearest listed store, upload the GST bill, and let the platform transfer the approved
                amount back to the buyer.
              </p>
            </div>
            <div className="rounded-2xl bg-rose-100 p-3">
              <Heart className="size-6 text-rose-700" />
            </div>
          </div>
          <Link to="/public/sanitary-pads">
            <Button className="mt-5 bg-rose-600 hover:bg-rose-700">Open sanitary pad support</Button>
          </Link>
        </Card>

        <Card className="p-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <Shield className="size-4" />
                Nearby emergency help
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Emergency contacts by pincode</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Show the closest women helplines, ambulance support, and district emergency response contacts for the
                entered pincode.
              </p>
            </div>
            <div className="rounded-2xl bg-blue-100 p-3">
              <Shield className="size-6 text-blue-700" />
            </div>
          </div>
          <Link to="/public/emergency-contacts">
            <Button className="mt-5">Open emergency contacts</Button>
          </Link>
        </Card>
      </div>

      <Card className="p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Complaint Heatmap Snapshot</h2>
        <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-xl h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="size-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              City-wide complaint analytics stay synced with the backend transparency feed.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Total public complaints tracked: {data.publicSummary.cards.totalComplaints}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
