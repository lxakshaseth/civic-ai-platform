import { useMemo, useState } from "react";
import { Link } from "react-router";
import { MapPin, MessageSquare, Navigation, Search } from "lucide-react";

import { apiRequest } from "@/src/lib/api";
import {
  formatComplaintStatus,
  formatDate,
  formatPriority,
  getComplaintStatusClasses,
  getPriorityClasses,
  normalizeComplaintStatusKey
} from "@/src/lib/presentation";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type EmployeeTask = {
  id: string;
  title: string;
  address?: string | null;
  status?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  department?: string | null;
  ticketCount?: number;
};

type EmployeeTaskResponse = {
  items: EmployeeTask[];
  filters: {
    departments: string[];
    categories: string[];
    priorities: string[];
    statuses: string[];
  };
};

export default function AssignedComplaints() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, error, loading } = useApiData(
    () => apiRequest<EmployeeTaskResponse>("/employee/tasks"),
    [user?.id]
  );

  const filteredTasks = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.items.filter((task) => {
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.address ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        normalizeComplaintStatusKey(task.status) === normalizeComplaintStatusKey(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading assigned complaints..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load assigned complaints</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Assigned Complaints</h1>
        <p className="text-muted-foreground">
          Live task queue synced from the employee backend. Open work proof upload and citizen chat from here.
        </p>
      </div>

      <Card className="mb-6 border-gray-200 p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by title, id, or address"
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
              {data.filters.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-gray-200">
        {filteredTasks.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No complaints matched the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-xs">
                    {complaint.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{complaint.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {complaint.department || "Field team"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="size-3" />
                      {complaint.address || "Location unavailable"}
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
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(complaint.dueDate || complaint.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/employee/evidence/${complaint.id}`}>
                        <Button size="sm">Open Task</Button>
                      </Link>
                      <Link to={`/employee/evidence/${complaint.id}`}>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="mr-2 size-4" />
                          Chat
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline">
                        <Navigation className="size-4" />
                      </Button>
                    </div>
                    {complaint.ticketCount ? (
                      <p className="mt-2 text-xs text-red-600">{complaint.ticketCount} tickets linked</p>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
