import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  MapPin,
  Search,
  ShieldAlert,
  User,
  UserRoundPlus
} from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/src/lib/api";
import {
  formatComplaintStatus,
  formatDate,
  formatShortDate,
  formatPriority,
  getComplaintStatusClasses,
  getPriorityClasses,
  normalizeComplaintStatusKey
} from "@/src/lib/presentation";
import ImageComparison from "../../components/ImageComparison";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type AdminComplaint = {
  id: string;
  title: string;
  category?: string | null;
  department?: string | null;
  address?: string | null;
  pincode?: string | null;
  status?: string | null;
  internalStatus?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  assignedEmployeeInfo?: {
    id?: string | null;
    name?: string | null;
    department?: string | null;
  } | null;
};

type SuggestedEmployee = {
  id: string;
  name: string;
  employeeCode: string;
  department: string;
  pincode: string;
  currentWorkload: number;
  activeAssignments: number;
};

type DirectoryEmployee = {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  department?: string | null;
  status?: string | null;
  employeeCode?: string | null;
  createdAt?: string | null;
};

type EmployeeOption = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  departmentName?: string | null;
  isActive: boolean;
  employeeCode?: string | null;
  pincode?: string | null;
  currentWorkload?: number | null;
  activeAssignments?: number | null;
  createdAt?: string | null;
  source: "suggested" | "directory";
};

type TicketRecord = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  raisedBy?: {
    id: string;
    fullName: string;
    role: string;
  } | null;
  complaint: {
    id: string;
    title: string;
    status?: string | null;
    area?: string | null;
    pincode?: string | null;
    department?: string | null;
    assignedEmployee?: {
      id: string;
      fullName: string;
      role: string;
      departmentId?: string | null;
    } | null;
    citizen?: {
      id: string;
      fullName: string;
      role: string;
      departmentId?: string | null;
    } | null;
  };
};

type TimelineItem = {
  id: string;
  title: string;
  createdAt: string;
};

type ProofItem = {
  id: string;
  url: string;
  label: string;
  kind: "image" | "document";
  type: string;
  uploadedAt: string;
  note?: string;
  mimeType?: string | null;
  uploadedByName?: string | null;
};

type ComplaintDetailRecord = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  department?: string | null;
  status?: string | null;
  internalStatus?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  address?: string | null;
  area?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  beforeImage?: string | null;
  citizenImages?: string[];
  afterImage?: string | null;
  createdBy?: string | null;
  createdByUserId?: string | null;
  rejectionReason?: string | null;
  assignedEmployeeInfo?: {
    id?: string | null;
    name?: string | null;
    department?: string | null;
    workStatus?: string | null;
  } | null;
  proof?: {
    afterImages?: string[];
    notes?: string;
    invoice?: string;
    submittedAt?: string;
    workSummary?: {
      notes: string;
      laborCount?: number | null;
      billAmount?: number | null;
      invoiceVendorName?: string | null;
      invoiceNumber?: string | null;
      invoiceDate?: string | null;
      materialsUsed?: string | null;
    } | null;
    items?: ProofItem[];
    documents?: ProofItem[];
  } | null;
};

type ComplaintDetailBundle = {
  complaint: ComplaintDetailRecord;
  timeline: TimelineItem[];
};

function isEmployeeActive(status?: string | null) {
  const normalizedStatus = status?.trim().toLowerCase();
  return !["inactive", "disabled", "terminated", "blocked"].includes(normalizedStatus || "");
}

function renderCoordinate(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(5) : "Not captured";
}

const defaultReworkNote = "Work proof is incomplete. Please revisit the site.";

export default function ComplaintOperations() {
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("complaints");
  const [refreshKey, setRefreshKey] = useState(0);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningComplaint, setAssigningComplaint] = useState<AdminComplaint | null>(null);
  const [assignNote, setAssignNote] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeListExpanded, setEmployeeListExpanded] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestedEmployeeCount, setSuggestedEmployeeCount] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [detailApprovalDecision, setDetailApprovalDecision] = useState<"" | "yes" | "no">("");
  const [detailApprovalNote, setDetailApprovalNote] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const deferredEmployeeSearchQuery = useDeferredValue(employeeSearchQuery);

  const {
    data: complaints,
    error: complaintsError,
    loading: complaintsLoading
  } = useApiData(
    () => apiRequest<AdminComplaint[]>("/complaints/admin/issues"),
    [user?.id, refreshKey]
  );

  const {
    data: tickets,
    error: ticketsError,
    loading: ticketsLoading
  } = useApiData(
    () => apiRequest<TicketRecord[]>("/tickets"),
    [user?.id, refreshKey]
  );

  const {
    data: complaintDetailData,
    error: complaintDetailError,
    loading: complaintDetailLoading
  } = useApiData<ComplaintDetailBundle | null>(
    async () => {
      if (!detailDialogOpen || !selectedComplaintId) {
        return null;
      }

      const complaint = await apiRequest<ComplaintDetailRecord>(`/complaints/${selectedComplaintId}`);
      const timeline = await apiRequest<TimelineItem[]>(`/complaints/${selectedComplaintId}/timeline`).catch(
        () => []
      );

      return { complaint, timeline };
    },
    [user?.id, detailDialogOpen, selectedComplaintId, refreshKey]
  );
  const complaintDetailStatusKey = complaintDetailData
    ? normalizeComplaintStatusKey(complaintDetailData.complaint.status)
    : null;
  const isComplaintDetailCompleted = complaintDetailStatusKey
    ? ["completed", "verified"].includes(complaintDetailStatusKey)
    : false;

  const filteredComplaints = useMemo(() => {
    if (!complaints) {
      return [];
    }

    return complaints.filter((complaint) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        complaint.title.toLowerCase().includes(normalizedSearch) ||
        complaint.id.toLowerCase().includes(normalizedSearch) ||
        (complaint.address ?? "").toLowerCase().includes(normalizedSearch) ||
        (complaint.pincode ?? "").toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        normalizeComplaintStatusKey(complaint.status) === normalizeComplaintStatusKey(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [complaints, searchQuery, statusFilter]);

  const filteredEmployeeOptions = useMemo(() => {
    const normalizedSearch = deferredEmployeeSearchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return employeeOptions;
    }

    return employeeOptions.filter((employee) =>
      [
        employee.fullName,
        employee.email,
        employee.phone,
        employee.departmentName,
        employee.employeeCode,
        employee.pincode,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [deferredEmployeeSearchQuery, employeeOptions]);

  const visibleEmployeeOptions = useMemo(() => {
    if (deferredEmployeeSearchQuery.trim() || employeeListExpanded) {
      return filteredEmployeeOptions;
    }

    return filteredEmployeeOptions.slice(0, 6);
  }, [deferredEmployeeSearchQuery, employeeListExpanded, filteredEmployeeOptions]);

  const hiddenEmployeeCount = Math.max(
    filteredEmployeeOptions.length - visibleEmployeeOptions.length,
    0
  );

  const selectedEmployeeMeta =
    employeeOptions.find((employee) => employee.id === selectedEmployeeId) ?? null;

  useEffect(() => {
    if (!filteredEmployeeOptions.length) {
      return;
    }

    if (!filteredEmployeeOptions.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(filteredEmployeeOptions[0].id);
    }
  }, [filteredEmployeeOptions, selectedEmployeeId]);

  useEffect(() => {
    if (deferredEmployeeSearchQuery.trim()) {
      setEmployeeListExpanded(true);
    }
  }, [deferredEmployeeSearchQuery]);

  useEffect(() => {
    setDetailApprovalDecision("");
    setDetailApprovalNote("");
  }, [detailDialogOpen, selectedComplaintId]);

  if (complaintsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading complaint operations..." />
      </div>
    );
  }

  if (complaintsError || !complaints) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load admin complaint workspace</AlertTitle>
          <AlertDescription>{complaintsError ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const ticketList = tickets ?? [];
  const pendingTickets = ticketList.filter((ticket) => ticket.status === "PENDING");
  const readyForVerification = filteredComplaints.filter(
    (complaint) => (complaint.internalStatus ?? "").toUpperCase() === "RESOLVED"
  ).length;

  const mergeEmployeeOptions = (
    suggestions: SuggestedEmployee[],
    directoryEmployees: DirectoryEmployee[]
  ) => {
    const optionsById = new Map<string, EmployeeOption>();

    for (const employee of directoryEmployees) {
      optionsById.set(employee.id, {
        id: employee.id,
        fullName: employee.name?.trim() || employee.email?.trim() || "Employee",
        email: employee.email ?? "",
        phone: employee.phone,
        departmentName: employee.department ?? null,
        isActive: isEmployeeActive(employee.status),
        employeeCode: employee.employeeCode ?? null,
        createdAt: employee.createdAt ?? null,
        source: "directory",
      });
    }

    for (const suggestion of suggestions) {
      const existingEmployee = optionsById.get(suggestion.id);

      optionsById.set(suggestion.id, {
        id: suggestion.id,
        fullName: existingEmployee?.fullName ?? suggestion.name,
        email: existingEmployee?.email ?? "",
        phone: existingEmployee?.phone ?? null,
        departmentName: existingEmployee?.departmentName ?? suggestion.department,
        isActive: existingEmployee?.isActive ?? true,
        employeeCode: suggestion.employeeCode,
        pincode: suggestion.pincode,
        currentWorkload: suggestion.currentWorkload,
        activeAssignments: suggestion.activeAssignments,
        createdAt: existingEmployee?.createdAt ?? null,
        source: "suggested",
      });
    }

    return [...optionsById.values()].sort((left, right) => {
      if (left.source !== right.source) {
        return left.source === "suggested" ? -1 : 1;
      }

      const workloadDifference = (left.currentWorkload ?? 0) - (right.currentWorkload ?? 0);

      if (workloadDifference !== 0) {
        return workloadDifference;
      }

      return left.fullName.localeCompare(right.fullName);
    });
  };

  const openAssignDialog = async (complaint: AdminComplaint) => {
    setAssignDialogOpen(true);
    setAssigningComplaint(complaint);
    setAssignNote("");
    setSelectedEmployeeId("");
    setEmployeeSearchQuery("");
    setEmployeeListExpanded(false);
    setEmployeeOptions([]);
    setSuggestedEmployeeCount(0);

    try {
      setLoadingSuggestions(true);
      const complaintDepartment = complaint.department?.trim() || undefined;
      const [directoryEmployees, suggestions] = await Promise.all([
        apiRequest<DirectoryEmployee[]>("/employees", {
          query: {
            status: "Active",
            department: complaintDepartment,
          },
        }),
        complaint.pincode
          ? apiRequest<SuggestedEmployee[]>("/employees/suggested", {
              query: {
                pincode: complaint.pincode,
                department: complaintDepartment,
              },
            }).catch(() => [])
          : Promise.resolve([] as SuggestedEmployee[]),
      ]);

      const nextEmployeeOptions = mergeEmployeeOptions(suggestions, directoryEmployees);

      setEmployeeOptions(nextEmployeeOptions);
      setSuggestedEmployeeCount(suggestions.length);
      setSelectedEmployeeId(suggestions[0]?.id ?? nextEmployeeOptions[0]?.id ?? "");
    } catch (suggestionError) {
      toast.error(
        suggestionError instanceof Error
          ? suggestionError.message
          : "Employees could not be loaded for this complaint."
      );
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const openComplaintDetailDialog = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setDetailDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!assigningComplaint || !selectedEmployeeId) {
      toast.error("Please select an employee before assigning the complaint.");
      return;
    }

    try {
      setBusyAction(`assign-${assigningComplaint.id}`);
      await apiRequest(`/complaints/${assigningComplaint.id}/assign`, {
        method: "POST",
        body: {
          employeeId: selectedEmployeeId,
          note: assignNote.trim() || undefined
        }
      });
      handleAssignDialogChange(false);
      setRefreshKey((value) => value + 1);
      toast.success("Complaint successfully assigned.");
    } catch (assignError) {
      toast.error(assignError instanceof Error ? assignError.message : "Complaint could not be assigned.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerify = async (
    complaint: Pick<AdminComplaint, "id">,
    action: "approve" | "reject",
    providedNote?: string
  ) => {
    try {
      setBusyAction(`${action}-${complaint.id}`);
      const rejectionNote =
        action === "reject"
          ? (providedNote?.trim() ||
            window.prompt("Enter a rework note", defaultReworkNote)?.trim() ||
            "")
          : "";

      if (action === "reject" && !rejectionNote?.trim()) {
        setBusyAction(null);
        return false;
      }

      await apiRequest(`/complaints/${complaint.id}/verify`, {
        method: "POST",
        body: {
          action,
          note: rejectionNote?.trim() || undefined
        }
      });
      setRefreshKey((value) => value + 1);
      toast.success(action === "approve" ? "Complaint closed." : "Complaint sent back to employee.");
      return true;
    } catch (verifyError) {
      toast.error(verifyError instanceof Error ? verifyError.message : "Verification action failed.");
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleDetailVerificationSubmit = async () => {
    if (!complaintDetailData?.complaint) {
      return;
    }

    if (!detailApprovalDecision) {
      toast.error("Please select Yes or No for the approval decision.");
      return;
    }

    const wasUpdated = await handleVerify(
      complaintDetailData.complaint,
      detailApprovalDecision === "yes" ? "approve" : "reject",
      detailApprovalDecision === "no" ? detailApprovalNote.trim() || defaultReworkNote : undefined
    );

    if (wasUpdated) {
      setDetailApprovalDecision("");
      setDetailApprovalNote("");
    }
  };

  const handleTicketDecision = async (ticket: TicketRecord, action: "approve" | "reject") => {
    try {
      setBusyAction(`${action}-ticket-${ticket.id}`);
      await apiRequest(`/tickets/${ticket.id}/${action}`, {
        method: "PUT"
      });
      setRefreshKey((value) => value + 1);
      toast.success(action === "approve" ? "Ticket approved and escalated." : "Ticket rejected.");
    } catch (ticketError) {
      toast.error(ticketError instanceof Error ? ticketError.message : "Ticket review failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleAssignDialogChange = (nextOpen: boolean) => {
    setAssignDialogOpen(nextOpen);

    if (nextOpen) {
      return;
    }

    setAssigningComplaint(null);
    setAssignNote("");
    setSelectedEmployeeId("");
    setEmployeeSearchQuery("");
    setEmployeeListExpanded(false);
    setEmployeeOptions([]);
    setSuggestedEmployeeCount(0);
    setLoadingSuggestions(false);
  };

  const handleDetailDialogChange = (nextOpen: boolean) => {
    setDetailDialogOpen(nextOpen);

    if (!nextOpen) {
      setSelectedComplaintId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ClipboardList className="size-3.5" />
            Live complaint operations
          </div>
          <h1 className="text-3xl font-bold text-gray-950">Complaint Operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Review citizen complaints, assign the right employee, handle ticket escalations, and verify completed work from one admin workspace.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Card className="border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Total complaints</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{complaints.length}</p>
          </Card>
          <Card className="border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Pending tickets</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {ticketsLoading ? "..." : pendingTickets.length}
            </p>
          </Card>
          <Card className="border-gray-200 p-4">
            <p className="text-xs text-muted-foreground">Ready to verify</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{readyForVerification}</p>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="complaints">Complaint Queue</TabsTrigger>
          <TabsTrigger value="tickets">Citizen Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="complaints" className="space-y-6">
          <Card className="border-gray-200 p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by complaint id, title, address, or pincode"
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
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <div className="grid gap-4">
            {filteredComplaints.map((complaint) => (
              <Card key={complaint.id} className="border-gray-200 p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{complaint.id}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>Department: {complaint.department || "Unassigned"}</p>
                      <p>Pincode: {complaint.pincode || "N/A"}</p>
                      <p>Address: {complaint.address || "Location unavailable"}</p>
                      <p>Created: {formatDate(complaint.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      Assigned employee:{" "}
                      <span className="font-semibold text-gray-950">
                        {complaint.assignedEmployeeInfo?.name || "Awaiting assignment"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openComplaintDetailDialog(complaint.id)}
                    >
                      <Eye className="mr-2 size-4" />
                      View Details
                    </Button>

                    {(!complaint.assignedEmployeeInfo?.id ||
                      ["submitted", "reassigned"].includes(normalizeComplaintStatusKey(complaint.status))) ? (
                      <Button
                        onClick={() => void openAssignDialog(complaint)}
                        disabled={busyAction === `assign-${complaint.id}`}
                      >
                        <UserRoundPlus className="mr-2 size-4" />
                        Assign Employee
                      </Button>
                    ) : null}

                    {(complaint.internalStatus ?? "").toUpperCase() === "RESOLVED" ? (
                      <>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => void handleVerify(complaint, "approve")}
                          disabled={busyAction === `approve-${complaint.id}`}
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          Approve Closure
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void handleVerify(complaint, "reject")}
                          disabled={busyAction === `reject-${complaint.id}`}
                        >
                          Send Back
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {ticketsLoading ? (
            <Card className="border-gray-200 p-6">
              <LoadingSpinner text="Loading citizen tickets..." />
            </Card>
          ) : ticketsError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load citizen tickets</AlertTitle>
              <AlertDescription>{ticketsError}</AlertDescription>
            </Alert>
          ) : ticketList.length === 0 ? (
            <Card className="border-gray-200 p-6 text-sm text-muted-foreground">
              No citizen tickets are pending right now.
            </Card>
          ) : (
            ticketList.map((ticket) => (
              <Card key={ticket.id} className="border-gray-200 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={`border-0 shadow-none ${
                          ticket.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : ticket.status === "REJECTED"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ticket.status}
                      </Badge>
                      <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                        {ticket.complaint.pincode || "No pincode"}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-950">{ticket.complaint.title}</h2>
                    <p className="text-sm text-muted-foreground">{ticket.message}</p>
                    <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>Raised by: {ticket.raisedBy?.fullName || "Citizen"}</p>
                      <p>Complaint: {ticket.complaint.id}</p>
                      <p>Area: {ticket.complaint.area || "Not available"}</p>
                      <p>Created: {formatDate(ticket.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                      Assigned employee:{" "}
                      <span className="font-semibold text-gray-950">
                        {ticket.complaint.assignedEmployee?.fullName || "Not assigned yet"}
                      </span>
                    </div>
                  </div>

                  {ticket.status === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => void handleTicketDecision(ticket, "approve")}
                        disabled={busyAction === `approve-ticket-${ticket.id}`}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Approve Ticket
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleTicketDecision(ticket, "reject")}
                        disabled={busyAction === `reject-ticket-${ticket.id}`}
                      >
                        <ShieldAlert className="mr-2 size-4" />
                        Reject Ticket
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={handleDetailDialogChange}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-6xl">
          <DialogHeader className="border-b border-gray-200 px-6 pt-6 pb-4">
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              Review complaint history, citizen filing details, and before/after resolution evidence.
            </DialogDescription>
          </DialogHeader>

          {complaintDetailLoading ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-6">
              <LoadingSpinner text="Loading complaint details..." />
            </div>
          ) : complaintDetailError || !complaintDetailData ? (
            <div className="px-6 py-6">
              <Alert variant="destructive">
                <AlertTitle>Unable to load complaint details</AlertTitle>
                <AlertDescription>
                  {complaintDetailError ?? "Complaint details could not be loaded."}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-200 bg-white p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge className={getComplaintStatusClasses(complaintDetailData.complaint.status)}>
                          {formatComplaintStatus(complaintDetailData.complaint.status)}
                        </Badge>
                        <Badge className={getPriorityClasses(complaintDetailData.complaint.priority)}>
                          {formatPriority(complaintDetailData.complaint.priority)}
                        </Badge>
                        <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                          {complaintDetailData.complaint.category || "General"}
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-950">
                        {complaintDetailData.complaint.title}
                      </h2>
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {complaintDetailData.complaint.id}
                      </p>
                      <p className="mt-4 max-w-4xl text-sm leading-6 text-muted-foreground">
                        {complaintDetailData.complaint.description || "No complaint description shared."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-gray-900">Filed On</p>
                      <p className="mt-1 text-blue-700">
                        {formatShortDate(complaintDetailData.complaint.createdAt)}
                      </p>
                      <p className="mt-3 font-semibold text-gray-900">Department</p>
                      <p className="mt-1 text-muted-foreground">
                        {complaintDetailData.complaint.department || "Pending triage"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
                  <div className="space-y-6">
                    <Card className="border-gray-200 p-6">
                      <h3 className="mb-5 text-xl font-semibold text-gray-950">Complaint & Work Details</h3>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-900">Category</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {complaintDetailData.complaint.category || "General"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-900">Assigned Team</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {complaintDetailData.complaint.assignedEmployeeInfo?.name ||
                              "Awaiting assignment"}
                          </p>
                          <p className="mt-1 text-xs text-blue-700">
                            {complaintDetailData.complaint.assignedEmployeeInfo?.department ||
                              "Department pending"}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <MapPin className="size-4 text-blue-700" />
                            Address
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {complaintDetailData.complaint.address || "Address unavailable"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Area: {complaintDetailData.complaint.area || "N/A"}</span>
                            <span>Pincode: {complaintDetailData.complaint.pincode || "N/A"}</span>
                            <span>Lat: {renderCoordinate(complaintDetailData.complaint.lat)}</span>
                            <span>Lng: {renderCoordinate(complaintDetailData.complaint.lng)}</span>
                          </div>
                        </div>
                        {complaintDetailData.complaint.proof?.workSummary ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2">
                            <p className="text-sm font-semibold text-gray-900">
                              Work summary submitted by employee
                            </p>
                            <p className="mt-2 text-sm leading-6 text-gray-700">
                              {complaintDetailData.complaint.proof.workSummary.notes}
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Labour Used</p>
                                <p className="mt-1 text-lg font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.laborCount ??
                                    "Not shared"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Invoice Amount</p>
                                <p className="mt-1 text-lg font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.billAmount != null
                                    ? `Rs ${complaintDetailData.complaint.proof.workSummary.billAmount}`
                                    : "Not shared"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Vendor</p>
                                <p className="mt-1 text-sm font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.invoiceVendorName ||
                                    "Not shared"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Invoice Number</p>
                                <p className="mt-1 text-sm font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.invoiceNumber ||
                                    "Not shared"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Invoice Date</p>
                                <p className="mt-1 text-sm font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.invoiceDate
                                    ? formatDate(
                                        complaintDetailData.complaint.proof.workSummary.invoiceDate
                                      )
                                    : "Not shared"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-4 py-3">
                                <p className="text-xs text-gray-500">Materials Used</p>
                                <p className="mt-1 text-sm font-semibold text-gray-950">
                                  {complaintDetailData.complaint.proof.workSummary.materialsUsed ||
                                    "Not shared"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </Card>

                    {complaintDetailData.complaint.beforeImage &&
                    complaintDetailData.complaint.afterImage ? (
                      <Card className="border-gray-200 p-6">
                        <h3 className="mb-4 text-xl font-semibold text-gray-950">
                          Before and After Work Proof
                        </h3>
                        <ImageComparison
                          beforeImage={complaintDetailData.complaint.beforeImage}
                          afterImage={complaintDetailData.complaint.afterImage}
                            beforeLabel="Reported issue"
                            afterLabel="Completed work"
                        />
                      </Card>
                    ) : complaintDetailData.complaint.beforeImage ? (
                      <Card className="border-gray-200 p-6">
                        <h3 className="mb-4 text-xl font-semibold text-gray-950">
                          Before Issue Evidence
                        </h3>
                        <img
                          src={complaintDetailData.complaint.beforeImage}
                          alt="Complaint evidence"
                          className="h-[320px] w-full rounded-2xl object-cover"
                        />
                      </Card>
                    ) : null}

                    {complaintDetailData.complaint.proof?.items?.length ? (
                      <Card className="border-gray-200 p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h3 className="text-xl font-semibold text-gray-950">
                            Work Proof & Invoice Documents
                          </h3>
                          {complaintDetailData.complaint.proof.invoice ? (
                            <a
                              href={complaintDetailData.complaint.proof.invoice}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button variant="outline" type="button">
                                <FileText className="mr-2 size-4" />
                                Open Invoice Document
                              </Button>
                            </a>
                          ) : null}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {complaintDetailData.complaint.proof.items.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-gray-950">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatShortDate(item.uploadedAt)}
                                  </p>
                                </div>
                                <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                                  {item.type}
                                </Badge>
                              </div>
                              {item.kind === "image" ? (
                                <img
                                  src={item.url}
                                  alt={item.label}
                                  className="h-48 w-full rounded-xl object-cover"
                                />
                              ) : (
                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-muted-foreground">
                                  Document uploaded. Use the button above to open the invoice document or attachment.
                                </div>
                              )}
                              {item.note ? (
                                <p className="mt-3 text-sm text-muted-foreground">{item.note}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    <Card className="border-gray-200 p-6">
                      <h3 className="mb-5 text-xl font-semibold text-gray-950">Progress Timeline</h3>
                      <div className="space-y-4">
                        {complaintDetailData.timeline.length ? (
                          complaintDetailData.timeline.map((item, index) => (
                            <div key={item.id} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                                  <CheckCircle2 className="size-4" />
                                </div>
                                {index < complaintDetailData.timeline.length - 1 ? (
                                  <div className="mt-2 h-full w-px bg-gray-200" />
                                ) : null}
                              </div>
                              <div className="pb-5">
                                <p className="font-semibold text-gray-950">{item.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatShortDate(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                            Timeline is not available for this complaint yet.
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="border-gray-200 p-6">
                      <div className="mb-4 flex items-center gap-2">
                        <User className="size-5 text-blue-700" />
                        <h3 className="text-lg font-semibold text-gray-950">Citizen Details</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Filed by</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {complaintDetailData.complaint.createdBy || "Citizen"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Citizen ID</p>
                          <p className="mt-1 font-mono text-xs text-gray-700">
                            {complaintDetailData.complaint.createdByUserId || "Not available"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Complaint filed</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {formatShortDate(complaintDetailData.complaint.createdAt)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">Complaint status</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {formatComplaintStatus(complaintDetailData.complaint.status)}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-gray-200 p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-950">Assigned Team</h3>
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-blue-100 p-3">
                          <User className="size-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-950">
                            {complaintDetailData.complaint.assignedEmployeeInfo?.name ||
                              "Awaiting field assignment"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {complaintDetailData.complaint.assignedEmployeeInfo?.department ||
                              "Department pending"}
                          </p>
                          <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {isComplaintDetailCompleted
                              ? "Completed"
                              : complaintDetailData.complaint.assignedEmployeeInfo?.workStatus ||
                                "Pending"}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-gray-200 p-6">
                      <div className="flex items-center gap-2">
                        <Clock className="size-5 text-blue-700" />
                        <h3 className="text-lg font-semibold text-gray-950">Key Dates</h3>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                          <span className="text-muted-foreground">Filed</span>
                          <span className="font-semibold text-gray-950">
                            {formatShortDate(complaintDetailData.complaint.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                          <span className="text-muted-foreground">Work Proof Submitted</span>
                          <span className="font-semibold text-gray-950">
                            {complaintDetailData.complaint.proof?.submittedAt
                              ? formatShortDate(complaintDetailData.complaint.proof.submittedAt)
                              : "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                          <span className="text-muted-foreground">Resolved / Closed</span>
                          <span className="font-semibold text-gray-950">
                            {(complaintDetailData.complaint.closedAt ||
                              complaintDetailData.complaint.resolvedAt)
                              ? formatShortDate(
                                  complaintDetailData.complaint.closedAt ||
                                    complaintDetailData.complaint.resolvedAt
                                )
                              : "Pending"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                          <span className="text-muted-foreground">Current Status</span>
                          <span className="font-semibold text-gray-950">
                            {formatComplaintStatus(complaintDetailData.complaint.status)}
                          </span>
                        </div>

                        {(complaintDetailData.complaint.internalStatus ?? "").toUpperCase() ===
                        "RESOLVED" ? (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
                            <Label htmlFor="admin-approval-decision" className="text-sm font-semibold text-gray-950">
                              Approve closure
                            </Label>
                            <Select
                              value={detailApprovalDecision}
                              onValueChange={(value) =>
                                setDetailApprovalDecision(value as "" | "yes" | "no")
                              }
                            >
                              <SelectTrigger id="admin-approval-decision" className="mt-3 bg-white">
                                <SelectValue placeholder="Select Yes / No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>

                            {detailApprovalDecision === "no" ? (
                              <div className="mt-3">
                                <Label htmlFor="admin-approval-note" className="text-xs text-muted-foreground">
                                  Rework note
                                </Label>
                                <Textarea
                                  id="admin-approval-note"
                                  rows={3}
                                  className="mt-2 bg-white"
                                  placeholder={defaultReworkNote}
                                  value={detailApprovalNote}
                                  onChange={(event) => setDetailApprovalNote(event.target.value)}
                                />
                              </div>
                            ) : null}

                            <Button
                              type="button"
                              className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                              disabled={
                                !detailApprovalDecision ||
                                busyAction === `approve-${complaintDetailData.complaint.id}` ||
                                busyAction === `reject-${complaintDetailData.complaint.id}`
                              }
                              onClick={() => void handleDetailVerificationSubmit()}
                            >
                              {busyAction === `approve-${complaintDetailData.complaint.id}` ||
                              busyAction === `reject-${complaintDetailData.complaint.id}`
                                ? "Saving..."
                                : "Submit Decision"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </Card>

                    {complaintDetailData.complaint.rejectionReason ? (
                      <Card className="border-red-200 bg-red-50 p-6">
                        <h3 className="text-lg font-semibold text-red-800">Latest Admin Note</h3>
                        <p className="mt-3 text-sm leading-6 text-red-700">
                          {complaintDetailData.complaint.rejectionReason}
                        </p>
                      </Card>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-gray-200 px-6 py-4">
            <Button variant="outline" onClick={() => handleDetailDialogChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={handleAssignDialogChange}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-gray-200 px-6 pt-6 pb-4">
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>
              Employees from the complaint department are prioritized, and pincode matches are ranked first.
            </DialogDescription>
          </DialogHeader>

          {assigningComplaint ? (
            <div className="min-h-0 flex-1 overflow-hidden px-6 py-5">
              <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-gray-950">{assigningComplaint.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {assigningComplaint.address || "Location unavailable"}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-gray-500">
                      <p>Pincode: {assigningComplaint.pincode || "Not available"}</p>
                      <p>Department: {assigningComplaint.department || "Not available"}</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="employee-search">Find Employee</Label>
                    <Input
                      id="employee-search"
                      className="mt-2"
                      placeholder="Search by name, email, code, phone, or department"
                      value={employeeSearchQuery}
                      onChange={(event) => setEmployeeSearchQuery(event.target.value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-950">Selected Employee</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {loadingSuggestions
                            ? "Preparing the best matches..."
                            : "Cards on the right are fully clickable for quick selection."}
                        </p>
                      </div>
                      {selectedEmployeeMeta ? (
                        <Badge className="border-0 bg-emerald-100 text-emerald-700 shadow-none">
                          Ready
                        </Badge>
                      ) : null}
                    </div>

                    {selectedEmployeeMeta ? (
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-base font-semibold text-gray-950">
                            {selectedEmployeeMeta.fullName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedEmployeeMeta.employeeCode || "Employee record"}
                            {selectedEmployeeMeta.departmentName
                              ? ` | ${selectedEmployeeMeta.departmentName}`
                              : ""}
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedEmployeeMeta.email || "Not available"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedEmployeeMeta.phone || "Not available"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created</p>
                            <p className="mt-1 text-sm text-gray-900">
                              {selectedEmployeeMeta.createdAt
                                ? formatDate(selectedEmployeeMeta.createdAt)
                                : "Not available"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={`border-0 shadow-none ${
                              selectedEmployeeMeta.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {selectedEmployeeMeta.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {selectedEmployeeMeta.source === "suggested" ? (
                            <Badge className="border-0 bg-blue-100 text-blue-700 shadow-none">
                              Department and pincode match
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                              Department match
                            </Badge>
                          )}
                          {selectedEmployeeMeta.pincode ? (
                            <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                              PIN {selectedEmployeeMeta.pincode}
                            </Badge>
                          ) : null}
                          {selectedEmployeeMeta.activeAssignments != null ? (
                            <Badge className="border-0 bg-emerald-100 text-emerald-700 shadow-none">
                              Active {selectedEmployeeMeta.activeAssignments}
                            </Badge>
                          ) : null}
                          {selectedEmployeeMeta.currentWorkload != null ? (
                            <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">
                              Tickets {selectedEmployeeMeta.currentWorkload}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Select an employee card to review details here.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="assign-note">Admin Note</Label>
                    <Textarea
                      id="assign-note"
                      rows={5}
                      value={assignNote}
                      onChange={(event) => setAssignNote(event.target.value)}
                      placeholder="Optional instructions for the employee..."
                    />
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">Available Employees</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ranked by department fit, pincode fit, workload, and name.
                      </p>
                    </div>
                    <Badge className="border-0 bg-slate-100 text-slate-700 shadow-none">
                      {loadingSuggestions ? "Loading..." : `${filteredEmployeeOptions.length} matches`}
                    </Badge>
                  </div>

                  {!loadingSuggestions &&
                  suggestedEmployeeCount === 0 &&
                  employeeOptions.length > 0 ? (
                    <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      {assigningComplaint.department
                        ? "No exact pincode match was found. Showing active employees from the complaint department."
                        : "No exact pincode match was found. Showing active employees from the directory."}
                    </div>
                  ) : null}

                  {!loadingSuggestions && visibleEmployeeOptions.length === 0 && employeeOptions.length > 0 ? (
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                      No employees matched the current search.
                    </div>
                  ) : null}

                  {!loadingSuggestions && employeeOptions.length === 0 ? (
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                      {assigningComplaint.department
                        ? `No active employees are available for ${assigningComplaint.department}.`
                        : "No active employees are available for this complaint."}
                    </div>
                  ) : null}

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loadingSuggestions ? (
                      <div className="flex min-h-[280px] items-center justify-center">
                        <LoadingSpinner text="Loading matching employees..." />
                      </div>
                    ) : visibleEmployeeOptions.length ? (
                      <div className="space-y-3" role="radiogroup" aria-label="Available employees">
                        {visibleEmployeeOptions.map((employee) => {
                          const isSelected = employee.id === selectedEmployeeId;

                          return (
                            <button
                              type="button"
                              key={employee.id}
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={`Select ${employee.fullName}`}
                              className={`group w-full rounded-2xl border px-4 py-4 text-left transition-all ${
                                isSelected
                                  ? "border-blue-300 bg-blue-50 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]"
                                  : "border-gray-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                              }`}
                              onClick={() => setSelectedEmployeeId(employee.id)}
                            >
                              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px] sm:items-center">
                                <div className="min-w-0">
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected
                                          ? "border-blue-500 bg-blue-500 text-white"
                                          : "border-gray-300 bg-white text-transparent"
                                      }`}
                                    >
                                      <CheckCircle2 className="size-3.5" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="truncate text-base font-semibold text-gray-950">
                                        {employee.fullName}
                                      </p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {employee.employeeCode || "Employee record"}
                                        {employee.departmentName ? ` | ${employee.departmentName}` : ""}
                                      </p>
                                      <p className="mt-2 truncate text-xs text-gray-500">
                                        {employee.email || "No email available"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <Badge
                                    className={`border-0 shadow-none ${
                                      employee.source === "suggested"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {employee.source === "suggested"
                                      ? "Suggested match"
                                      : "Department match"}
                                  </Badge>
                                  {employee.activeAssignments != null ? (
                                    <Badge className="border-0 bg-emerald-100 text-emerald-700 shadow-none">
                                      Active {employee.activeAssignments}
                                    </Badge>
                                  ) : null}
                                  {employee.currentWorkload != null ? (
                                    <Badge className="border-0 bg-amber-100 text-amber-700 shadow-none">
                                      Tickets {employee.currentWorkload}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {hiddenEmployeeCount > 0 ? (
                    <div className="border-t border-gray-200 px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => setEmployeeListExpanded(true)}
                      >
                        <ChevronDown className="mr-2 size-4" />
                        Show {hiddenEmployeeCount} more employees
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t border-gray-200 px-6 py-4">
            <Button variant="outline" onClick={() => handleAssignDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedEmployeeId || !!busyAction}>
              Assign Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
