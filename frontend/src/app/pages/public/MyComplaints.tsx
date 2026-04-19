import { useState } from "react";
import { Link } from "react-router";
import { Eye, Search } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
  formatDate,
  formatPriority,
  getComplaintStatusClasses,
  getPriorityClasses,
  normalizeComplaintStatusKey,
} from "@/src/lib/presentation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type ComplaintRecord = {
  id: string;
  title: string;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  assignedEmployeeInfo?: {
    name?: string | null;
  } | null;
};

function getAverageResolutionDays(complaints: ComplaintRecord[]) {
  const resolvedComplaints = complaints
    .map((complaint) => {
      const completedAt = complaint.closedAt ?? complaint.resolvedAt;

      if (!complaint.createdAt || !completedAt) {
        return null;
      }

      return (
        (new Date(completedAt).getTime() - new Date(complaint.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
    })
    .filter((value): value is number => value != null && value >= 0);

  if (!resolvedComplaints.length) {
    return 0;
  }

  return Number(
    (
      resolvedComplaints.reduce((total, currentValue) => total + currentValue, 0) /
      resolvedComplaints.length
    ).toFixed(1)
  );
}

export default function MyComplaints() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data, error, loading } = useApiData(
    () =>
      apiRequest<ComplaintRecord[]>("/complaints", {
        query: { mine: true },
      }),
    [user?.id]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading your complaints..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load complaints</AlertTitle>
          <AlertDescription>{error ?? "Please try again in a moment."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredComplaints = data.filter((complaint) => {
    const matchesSearch =
      !searchQuery.trim() ||
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      normalizeComplaintStatusKey(complaint.status) === normalizeComplaintStatusKey(statusFilter);
    const matchesCategory =
      categoryFilter === "all" ||
      (complaint.category ?? "general").toLowerCase() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = [...new Set(data.map((complaint) => complaint.category || "General"))].sort();
  const totalComplaints = data.length;
  const inProgressCount = data.filter(
    (complaint) => normalizeComplaintStatusKey(complaint.status) === "in_progress"
  ).length;
  const resolvedCount = data.filter((complaint) =>
    ["completed", "verified"].includes(normalizeComplaintStatusKey(complaint.status))
  ).length;
  const averageResolutionDays = getAverageResolutionDays(data);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Complaints</h1>
        <p className="text-muted-foreground">
          Track and manage every complaint linked to your citizen account.
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              className="pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_admin_approval">Pending Admin Approval</SelectItem>
              <SelectItem value="completed">Resolved</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {filteredComplaints.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No complaints matched the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Complaint ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {complaint.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{complaint.title}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{complaint.category || "General"}</span>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(complaint.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {complaint.assignedEmployeeInfo?.name || "Awaiting assignment"}
                  </TableCell>
                  <TableCell>
                    <Link to={`/public/complaint/${complaint.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="size-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card className="p-6">
          <div className="text-2xl font-bold text-primary">{totalComplaints}</div>
          <div className="text-sm text-muted-foreground">Total Complaints</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
          <div className="text-sm text-muted-foreground">Resolved</div>
        </Card>
        <Card className="p-6">
          <div className="text-2xl font-bold text-gray-600">
            {averageResolutionDays > 0 ? `${averageResolutionDays} days` : "N/A"}
          </div>
          <div className="text-sm text-muted-foreground">Avg Resolution Time</div>
        </Card>
      </div>
    </div>
  );
}
