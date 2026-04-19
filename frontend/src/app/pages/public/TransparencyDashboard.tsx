import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Clock, Filter, Search, Ticket } from "lucide-react";

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
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type PublicComplaintRecord = {
  id: string;
  title: string;
  category?: string | null;
  department?: string | null;
  status?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  area?: string | null;
  address?: string | null;
  pincode?: string | null;
  assignedEmployeeInfo?: {
    name?: string | null;
    department?: string | null;
  } | null;
  proof?: {
    submittedAt?: string;
    workSummary?: {
      notes: string;
      laborCount?: number | null;
      billAmount?: number | null;
      invoiceVendorName?: string | null;
      materialsUsed?: string | null;
    } | null;
  } | null;
};

function getAverageResolutionDays(complaints: PublicComplaintRecord[]) {
  const resolvedItems = complaints
    .map((complaint) => {
      if (!complaint.createdAt || !complaint.resolvedAt) {
        return null;
      }

      return (
        (new Date(complaint.resolvedAt).getTime() - new Date(complaint.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
    })
    .filter((value): value is number => value != null && value >= 0);

  if (!resolvedItems.length) {
    return 0;
  }

  return Number(
    (resolvedItems.reduce((sum, value) => sum + value, 0) / resolvedItems.length).toFixed(1)
  );
}

export default function TransparencyDashboard() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, error, loading } = useApiData(
    () => apiRequest<PublicComplaintRecord[]>("/complaints"),
    [user?.id]
  );

  const filteredComplaints = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.filter((complaint) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        complaint.title.toLowerCase().includes(normalizedSearch) ||
        (complaint.area ?? "").toLowerCase().includes(normalizedSearch) ||
        (complaint.address ?? "").toLowerCase().includes(normalizedSearch) ||
        (complaint.department ?? "").toLowerCase().includes(normalizedSearch);
      const matchesPincode =
        !pincodeFilter.trim() || (complaint.pincode ?? "").includes(pincodeFilter.trim());
      const matchesStatus =
        statusFilter === "all" ||
        normalizeComplaintStatusKey(complaint.status) === normalizeComplaintStatusKey(statusFilter);

      return matchesSearch && matchesPincode && matchesStatus;
    });
  }, [data, pincodeFilter, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading transparency dashboard..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load transparency data</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const resolvedCount = filteredComplaints.filter((complaint) =>
    ["completed", "verified"].includes(normalizeComplaintStatusKey(complaint.status))
  ).length;
  const inProgressCount = filteredComplaints.filter(
    (complaint) => normalizeComplaintStatusKey(complaint.status) === "in_progress"
  ).length;
  const proofSharedCount = filteredComplaints.filter((complaint) => complaint.proof?.submittedAt).length;
  const averageResolutionDays = getAverageResolutionDays(filteredComplaints);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Transparency Dashboard</h1>
        <p className="text-muted-foreground">
          Pincode-wise public works, complaint progress, invoice summary, and field completion details.
        </p>
      </div>

      <Card className="mb-6 border-gray-200 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search area, complaint title, or department"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              inputMode="numeric"
              maxLength={6}
              placeholder="Filter by pincode"
              value={pincodeFilter}
              onChange={(event) => setPincodeFilter(event.target.value.replace(/\D/g, ""))}
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
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-gray-200 p-6">
          <p className="text-sm text-muted-foreground">Visible complaints</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{filteredComplaints.length}</p>
        </Card>
        <Card className="border-gray-200 p-6">
          <p className="text-sm text-muted-foreground">Resolved / closed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{resolvedCount}</p>
        </Card>
        <Card className="border-gray-200 p-6">
          <p className="text-sm text-muted-foreground">Work Proof Uploaded</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{proofSharedCount}</p>
        </Card>
        <Card className="border-gray-200 p-6">
          <p className="text-sm text-muted-foreground">Avg resolution time</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {averageResolutionDays ? `${averageResolutionDays}d` : "N/A"}
          </p>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <Card className="border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-950">Resolved Works</h2>
          </div>
          <p className="mt-4 text-4xl font-bold text-emerald-600">{resolvedCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Citizen-submitted photos and employee completion records are available for these works.
          </p>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-blue-700" />
            <h2 className="text-lg font-semibold text-gray-950">In Progress</h2>
          </div>
          <p className="mt-4 text-4xl font-bold text-blue-700">{inProgressCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Current work items visible in the selected pincode or area view.
          </p>
        </Card>

        <Card className="border-gray-200 p-6">
          <div className="flex items-center gap-2">
            <Ticket className="size-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-950">Need action?</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            If you notice suspected fraud or a mismatch in any work, open the complaint detail page and raise a ticket. Tickets from the same pincode appear in the admin review queue.
          </p>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredComplaints.map((complaint) => (
          <Card key={complaint.id} className="border-gray-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={getComplaintStatusClasses(complaint.status)}>
                    {formatComplaintStatus(complaint.status)}
                  </Badge>
                  <Badge className={getPriorityClasses(complaint.priority)}>
                    {formatPriority(complaint.priority)}
                  </Badge>
                  <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                    {complaint.category || "General"}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">{complaint.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {complaint.address || complaint.area || "Location unavailable"}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p>Department: {complaint.department || "Unassigned"}</p>
                  <p>Pincode: {complaint.pincode || "N/A"}</p>
                  <p>Employee: {complaint.assignedEmployeeInfo?.name || "Not assigned yet"}</p>
                  <p>Created: {formatDate(complaint.createdAt)}</p>
                </div>
                {complaint.proof?.workSummary ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-gray-950">Work update</p>
                    <p className="mt-2 text-sm text-gray-700">{complaint.proof.workSummary.notes}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {complaint.proof.workSummary.laborCount != null ? (
                        <Badge className="border-0 bg-white text-emerald-700 shadow-none">
                          Labour {complaint.proof.workSummary.laborCount}
                        </Badge>
                      ) : null}
                      {complaint.proof.workSummary.billAmount != null ? (
                        <Badge className="border-0 bg-white text-emerald-700 shadow-none">
                          Invoice Rs {complaint.proof.workSummary.billAmount}
                        </Badge>
                      ) : null}
                      {complaint.proof.workSummary.invoiceVendorName ? (
                        <Badge className="border-0 bg-white text-emerald-700 shadow-none">
                          {complaint.proof.workSummary.invoiceVendorName}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-[220px] xl:justify-end">
                <Link to={`/public/complaint/${complaint.id}`}>
                  <Button>Open Detail</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}

        {filteredComplaints.length === 0 ? (
          <Card className="border-gray-200 p-6 text-sm text-muted-foreground">
            No complaints matched the current filters. Try changing the pincode or search term.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
