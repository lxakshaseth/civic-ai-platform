import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  MessageSquareWarning,
  RefreshCcw,
  Star,
  Ticket,
  User
} from "lucide-react";
import { toast } from "sonner";

import { apiRequest } from "@/src/lib/api";
import {
  formatComplaintStatus,
  formatDate,
  formatPriority,
  getComplaintStatusClasses,
  getPriorityClasses,
  normalizeComplaintStatusKey
} from "@/src/lib/presentation";
import ComplaintConversation from "../../components/ComplaintConversation";
import ImageComparison from "../../components/ImageComparison";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

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

type ComplaintRecord = {
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
  address?: string | null;
  area?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  beforeImage?: string | null;
  citizenImages?: string[];
  afterImage?: string | null;
  rejectionReason?: string | null;
  viewerIsComplaintOwner?: boolean;
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
  rating?: number | null;
  feedbackComment?: string | null;
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
};

function renderCoordinate(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(5) : "Not captured";
}

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const [ticketMessage, setTicketMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [busyAction, setBusyAction] = useState<"ticket" | "feedback" | "reopen" | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, error, loading } = useApiData(
    async () => {
      if (!id) {
        throw new Error("Complaint ID is missing.");
      }

      const complaint = await apiRequest<ComplaintRecord>(`/complaints/${id}`);
      const [timeline, tickets] = await Promise.all([
        apiRequest<TimelineItem[]>(`/complaints/${id}/timeline`).catch(() => []),
        apiRequest<TicketRecord[]>(`/tickets/${id}`).catch(() => [])
      ]);

      return { complaint, timeline, tickets };
    },
    [id, currentUser?.id, refreshKey]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading complaint details..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load complaint</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { complaint, timeline, tickets } = data;
  const statusKey = normalizeComplaintStatusKey(complaint.status);
  const isTaskCompleted = ["completed", "verified"].includes(statusKey);
  const canRate = ["completed", "verified"].includes(statusKey) && complaint.viewerIsComplaintOwner;
  const canReopen = ["completed", "verified"].includes(statusKey) && complaint.viewerIsComplaintOwner;
  const canRaiseTicket = currentUser?.role === "CITIZEN";
  const canOpenChat = complaint.viewerIsComplaintOwner || currentUser?.role !== "CITIZEN";
  const ticketSummary = tickets.filter((ticket) => ticket.status === "PENDING").length;

  const handleRaiseTicket = async () => {
    if (!id || !ticketMessage.trim()) {
      toast.error("A ticket message is required.");
      return;
    }

    try {
      setBusyAction("ticket");
      await apiRequest("/tickets", {
        method: "POST",
        body: {
          complaintId: id,
          message: ticketMessage.trim()
        }
      });
      setTicketMessage("");
      setRefreshKey((value) => value + 1);
      toast.success("Ticket sent to the admin review queue.");
    } catch (ticketError) {
      toast.error(ticketError instanceof Error ? ticketError.message : "Ticket could not be submitted.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!id || rating < 1) {
      toast.error("Please select a rating.");
      return;
    }

    try {
      setBusyAction("feedback");
      await apiRequest(`/complaints/${id}/feedback`, {
        method: "POST",
        body: {
          rating,
          comment: feedback.trim() || undefined
        }
      });
      setRefreshKey((value) => value + 1);
      toast.success("Feedback submitted successfully.");
    } catch (feedbackError) {
      toast.error(
        feedbackError instanceof Error ? feedbackError.message : "Feedback could not be submitted."
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleReopen = async () => {
    if (!id || !reopenReason.trim()) {
      toast.error("A reason is required to reopen the complaint.");
      return;
    }

    try {
      setBusyAction("reopen");
      await apiRequest(`/complaints/${id}/reopen`, {
        method: "POST",
        body: {
          reason: reopenReason.trim()
        }
      });
      setRefreshKey((value) => value + 1);
      setReopenReason("");
      toast.success("Complaint reopened and the admin has been notified.");
    } catch (reopenError) {
      toast.error(reopenError instanceof Error ? reopenError.message : "Complaint could not be reopened.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4">
          <Link to="/public/my-complaints">
            <Button variant="ghost" size="sm" className="w-fit">
              <ArrowLeft className="mr-2 size-4" />
              Back to My Complaints
            </Button>
          </Link>

          <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className={getComplaintStatusClasses(complaint.status)}>
                  {formatComplaintStatus(complaint.status)}
                </Badge>
                <Badge className={getPriorityClasses(complaint.priority)}>
                  {formatPriority(complaint.priority)}
                </Badge>
                {ticketSummary > 0 ? (
                  <Badge className="border-0 bg-red-100 text-red-700 shadow-none">
                    {ticketSummary} pending ticket
                  </Badge>
                ) : null}
              </div>
              <h1 className="text-3xl font-bold text-gray-950">{complaint.title}</h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground">{complaint.id}</p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                {complaint.description}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <p className="font-semibold text-gray-900">Department</p>
              <p className="mt-1 text-blue-700">{complaint.department || "Pending triage"}</p>
              <p className="mt-3 font-semibold text-gray-900">Filed on</p>
              <p className="mt-1 text-muted-foreground">{formatDate(complaint.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <div className="space-y-6">
            <Card className="border-gray-200 p-6">
              <h2 className="mb-5 text-xl font-semibold text-gray-950">Progress Timeline</h2>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <CheckCircle className="size-4" />
                      </div>
                      {index < timeline.length - 1 ? <div className="mt-2 h-full w-px bg-gray-200" /> : null}
                    </div>
                    <div className="pb-5">
                      <p className="font-semibold text-gray-950">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-gray-200 p-6">
              <h2 className="mb-5 text-xl font-semibold text-gray-950">Complaint & Work Details</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">Category</p>
                  <p className="mt-1 text-sm text-muted-foreground">{complaint.category || "General"}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">Assigned Team</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {complaint.assignedEmployeeInfo?.name || "Awaiting assignment"}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    {complaint.assignedEmployeeInfo?.department || "Department pending"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 md:col-span-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <MapPin className="size-4 text-blue-700" />
                    Address
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{complaint.address || "Address unavailable"}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>Area: {complaint.area || "N/A"}</span>
                    <span>Pincode: {complaint.pincode || "N/A"}</span>
                    <span>Lat: {renderCoordinate(complaint.lat)}</span>
                    <span>Lng: {renderCoordinate(complaint.lng)}</span>
                  </div>
                </div>
                {complaint.proof?.workSummary ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2">
                    <p className="text-sm font-semibold text-gray-900">Work summary submitted by employee</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {complaint.proof.workSummary.notes}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Labour Used</p>
                        <p className="mt-1 text-lg font-semibold text-gray-950">
                          {complaint.proof.workSummary.laborCount ?? "Not shared"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Invoice Amount</p>
                        <p className="mt-1 text-lg font-semibold text-gray-950">
                          {complaint.proof.workSummary.billAmount != null
                            ? `Rs ${complaint.proof.workSummary.billAmount}`
                            : "Not shared"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Vendor</p>
                        <p className="mt-1 text-sm font-semibold text-gray-950">
                          {complaint.proof.workSummary.invoiceVendorName || "Not shared"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Invoice Number</p>
                        <p className="mt-1 text-sm font-semibold text-gray-950">
                          {complaint.proof.workSummary.invoiceNumber || "Not shared"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Invoice Date</p>
                        <p className="mt-1 text-sm font-semibold text-gray-950">
                          {complaint.proof.workSummary.invoiceDate
                            ? formatDate(complaint.proof.workSummary.invoiceDate)
                            : "Not shared"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">Materials Used</p>
                        <p className="mt-1 text-sm font-semibold text-gray-950">
                          {complaint.proof.workSummary.materialsUsed || "Not shared"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            {complaint.beforeImage && complaint.afterImage ? (
              <Card className="border-gray-200 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-950">Before and After Work Proof</h2>
                <ImageComparison
                  beforeImage={complaint.beforeImage}
                  afterImage={complaint.afterImage}
                  beforeLabel="Citizen upload"
                  afterLabel="Work completion"
                />
              </Card>
            ) : complaint.beforeImage ? (
              <Card className="border-gray-200 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-950">Uploaded Photo</h2>
                <img
                  src={complaint.beforeImage}
                  alt="Complaint"
                  className="h-[320px] w-full rounded-2xl object-cover"
                />
              </Card>
            ) : null}

            {complaint.proof?.items?.length ? (
              <Card className="border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-gray-950">Work Proof & Invoice Documents</h2>
                  {complaint.proof.invoice ? (
                    <a href={complaint.proof.invoice} target="_blank" rel="noreferrer">
                      <Button variant="outline">
                        <FileText className="mr-2 size-4" />
                        Open Invoice Document
                      </Button>
                    </a>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {complaint.proof.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-950">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.uploadedAt)}</p>
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
                      {item.note ? <p className="mt-3 text-sm text-muted-foreground">{item.note}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <ComplaintConversation
              complaintId={complaint.id}
              currentUserId={currentUser?.id}
              disabledReason={
                !complaint.assignedEmployeeInfo?.id
                  ? "Chat becomes available automatically after the complaint is assigned."
                  : isTaskCompleted
                    ? "Chat has been closed after admin approval."
                  : canOpenChat
                    ? null
                    : "Only the complaint owner, assigned employee, and admin can view this chat."
              }
            />
          </div>

          <div className="space-y-6">
            <Card className="border-gray-200 p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-950">Assigned Team</h2>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-3">
                  <User className="size-5 text-blue-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-950">
                    {complaint.assignedEmployeeInfo?.name || "Awaiting field assignment"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {complaint.assignedEmployeeInfo?.department || "Department pending"}
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {isTaskCompleted
                      ? "Completed"
                      : complaint.assignedEmployeeInfo?.workStatus || "Pending"}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-gray-200 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Ticket className="size-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-950">Quality or Fraud Ticket</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Raise a ticket here if you notice a quality issue, mismatch, or suspected fraud in the work. It will appear immediately in the admin review queue.
              </p>
              {canRaiseTicket ? (
                <div className="mt-4 space-y-3">
                  <Textarea
                    rows={4}
                    value={ticketMessage}
                    onChange={(event) => setTicketMessage(event.target.value)}
                    placeholder="Example: The invoice amount does not match the work completed on-site, or the work is incomplete..."
                  />
                  <Button onClick={handleRaiseTicket} disabled={busyAction === "ticket"}>
                    <MessageSquareWarning className="mr-2 size-4" />
                    {busyAction === "ticket" ? "Submitting..." : "Raise Ticket"}
                  </Button>
                </div>
              ) : null}
              <div className="mt-5 space-y-3">
                {tickets.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
                    No tickets have been raised for this complaint yet.
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-950">
                            {ticket.raisedBy?.fullName || "Citizen"} raised a ticket
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{ticket.message}</p>
                        </div>
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
                      </div>
                      <p className="mt-3 text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {canRate ? (
              <Card className="border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-950">Rate Resolution</h2>
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`rounded-xl border p-3 transition-colors ${
                        rating >= star
                          ? "border-yellow-300 bg-yellow-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <Star
                        className={`size-5 ${
                          rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  className="mt-4"
                  rows={4}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Share your feedback about the resolution..."
                />
                <Button className="mt-4" onClick={handleSubmitFeedback} disabled={busyAction === "feedback"}>
                  {busyAction === "feedback" ? "Submitting..." : "Submit Feedback"}
                </Button>
                {complaint.rating ? (
                  <p className="mt-3 text-xs text-emerald-700">
                    Existing rating: {complaint.rating}/5 {complaint.feedbackComment ? `- ${complaint.feedbackComment}` : ""}
                  </p>
                ) : null}
              </Card>
            ) : null}

            {canReopen ? (
              <Card className="border-gray-200 p-6">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="size-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-950">Re-open Complaint</h2>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reopen the complaint if the work is incomplete or the issue has returned.
                </p>
                <Textarea
                  className="mt-4"
                  rows={4}
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                  placeholder="Example: The after-work photo does not match the actual work completed on-site..."
                />
                <Button variant="outline" className="mt-4" onClick={handleReopen} disabled={busyAction === "reopen"}>
                  {busyAction === "reopen" ? "Sending..." : "Re-open Complaint"}
                </Button>
                {complaint.rejectionReason ? (
                  <p className="mt-3 text-xs text-red-600">
                    Latest admin note: {complaint.rejectionReason}
                  </p>
                ) : null}
              </Card>
            ) : null}

            <Card className="border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-950">Key Dates</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-muted-foreground">Filed</span>
                  <span className="font-semibold text-gray-950">{formatDate(complaint.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-muted-foreground">Work Proof Submitted</span>
                  <span className="font-semibold text-gray-950">
                    {complaint.proof?.submittedAt ? formatDate(complaint.proof.submittedAt) : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-muted-foreground">Resolved / Closed</span>
                  <span className="font-semibold text-gray-950">
                    {complaint.resolvedAt ? formatDate(complaint.resolvedAt) : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4" />
                    Current Status
                  </span>
                  <span className="font-semibold text-gray-950">{formatComplaintStatus(complaint.status)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
