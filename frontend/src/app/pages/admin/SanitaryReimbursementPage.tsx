import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  IndianRupee,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { apiRequest, ApiError } from "@/src/lib/api";
import { formatDate } from "@/src/lib/presentation";
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
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";
import { useApiData } from "../../hooks/useApiData";
import { useCurrentUser } from "../../hooks/useCurrentUser";

type SanitarySummary = {
  totalRequests: number;
  totalApproved: number;
  totalPending: number;
  totalAmountTransferred: number;
  flaggedCount: number;
};

type SanitaryStatus = "pending" | "approved" | "rejected" | "paid" | "flagged";

type SanitaryRequest = {
  id: string;
  citizenId?: string | null;
  citizenName: string;
  dateApplied?: string | null;
  upiId: string;
  amount: number;
  status: SanitaryStatus;
  transactionId?: string | null;
  paidAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  flaggedAt?: string | null;
  reviewNote?: string | null;
  fraudReason?: string | null;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  suspicious?: boolean;
  fraudSignals?: string[];
  repeatedUpiClaims?: number;
  citizenClaimsLast30Days?: number;
  upiClaimsLast30Days?: number;
};

type SanitaryDashboardResponse = {
  summary: SanitarySummary;
  requests: SanitaryRequest[];
};

const statusOptions: Array<{ value: "all" | SanitaryStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getStatusClasses(status: SanitaryStatus) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "rejected":
      return "bg-slate-100 text-slate-700";
    case "flagged":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: SanitaryStatus) {
  switch (status) {
    case "paid":
      return "Paid";
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "flagged":
      return "Flagged";
    default:
      return "Pending";
  }
}

export default function SanitaryReimbursementPage() {
  const user = useCurrentUser();
  const [statusFilter, setStatusFilter] = useState<"all" | SanitaryStatus>("all");
  const [search, setSearch] = useState("");
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const { data, error, loading, refetch } = useApiData<SanitaryDashboardResponse>(
    async () => {
      const [summary, requests] = await Promise.all([
        apiRequest<SanitarySummary>("/admin/sanitary-summary"),
        apiRequest<SanitaryRequest[]>("/admin/sanitary-requests", {
          query: {
            status: statusFilter === "all" ? undefined : statusFilter,
            search: search.trim() || undefined,
          },
        }),
      ]);

      return { summary, requests };
    },
    [user?.id, statusFilter, search]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refetch();
    }, 15000);

    const handleFocus = () => {
      refetch();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const dashboard = useMemo(
    () =>
      data ?? {
        summary: {
          totalRequests: 0,
          totalApproved: 0,
          totalPending: 0,
          totalAmountTransferred: 0,
          flaggedCount: 0,
        },
        requests: [],
      },
    [data]
  );

  const handleAction = async (
    requestId: string,
    action: "approve" | "reject" | "flag"
  ) => {
    try {
      setIsSubmittingId(requestId);
      setPageError(null);

      const note = actionNotes[requestId]?.trim();
      const body =
        action === "approve"
          ? { note }
          : action === "reject"
            ? { note }
            : { note, reason: note || "Manually flagged by admin for fraud review" };

      await apiRequest(`/admin/sanitary/${requestId}/${action}`, {
        method: "PATCH",
        body,
      });

      setActionNotes((current) => ({ ...current, [requestId]: "" }));
      refetch();
    } catch (requestError) {
      setPageError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to update the reimbursement request."
      );
    } finally {
      setIsSubmittingId(null);
    }
  };

  const cards = [
    {
      label: "Total Requests",
      value: dashboard.summary.totalRequests,
      hint: `${dashboard.summary.flaggedCount} flagged for manual review`,
      icon: Clock3,
      accent: "bg-blue-50 text-blue-700",
    },
    {
      label: "Total Approved",
      value: dashboard.summary.totalApproved,
      hint: "Approved and payout-ready claims",
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total Pending",
      value: dashboard.summary.totalPending,
      hint: "Claims waiting for finance action",
      icon: AlertTriangle,
      accent: "bg-yellow-50 text-yellow-800",
    },
    {
      label: "Total Amount Transferred",
      value: formatCurrency(dashboard.summary.totalAmountTransferred),
      hint: "Confirmed paid reimbursements",
      icon: IndianRupee,
      accent: "bg-green-50 text-green-700",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading sanitary reimbursement management..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load sanitary reimbursement management</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <IndianRupee className="size-3.5" />
            Financial tracking and citizen reimbursement
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-950">
            Sanitary Reimbursement Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Track citizen reimbursement applications, payment completion, pending requests,
            total distributed funds, and suspicious reimbursement patterns in one admin workflow.
          </p>
        </div>

        <Button variant="outline" className="border-gray-300" onClick={refetch}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {pageError ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="border-gray-200 p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <div className={`rounded-xl p-2 ${card.accent}`}>
                  <Icon className="size-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-950">{card.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{card.hint}</div>
            </Card>
          );
        })}
      </div>

      <Card className="border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-950">Citizen reimbursement records</h2>
            <p className="text-sm text-muted-foreground">
              Review each claim, confirm payment completion, and flag suspicious reimbursement activity.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search citizen, UPI, transaction, invoice..."
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | SanitaryStatus)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Citizen Name</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead>UPI ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No sanitary reimbursement records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                dashboard.requests.map((request) => {
                  const note = actionNotes[request.id] ?? "";
                  const disabled = isSubmittingId === request.id;

                  return (
                    <TableRow key={request.id} className="align-top">
                      <TableCell className="whitespace-normal">
                        <div className="min-w-[170px]">
                          <div className="font-semibold text-gray-950">{request.citizenName}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Request ID: {request.id}
                          </div>
                          {request.vendorName ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Vendor: {request.vendorName}
                            </div>
                          ) : null}
                          {request.invoiceNumber ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Invoice: {request.invoiceNumber}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(request.dateApplied)}</TableCell>
                      <TableCell className="whitespace-normal">{request.upiId}</TableCell>
                      <TableCell className="font-semibold text-gray-950">
                        {formatCurrency(request.amount)}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="space-y-2">
                          <Badge className={getStatusClasses(request.status)}>
                            {formatStatus(request.status)}
                          </Badge>
                          {request.suspicious ? (
                            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                              <div>
                                {(request.fraudSignals && request.fraudSignals.length > 0
                                  ? request.fraudSignals
                                  : [request.fraudReason || "Flagged for fraud review"]
                                ).join(", ")}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {request.transactionId ? (
                          <div>
                            <div className="font-medium text-gray-950">{request.transactionId}</div>
                            {request.paidAt ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Paid {formatDate(request.paidAt)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not paid yet</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[300px] whitespace-normal">
                        <div className="space-y-3">
                          <Textarea
                            value={note}
                            onChange={(event) =>
                              setActionNotes((current) => ({
                                ...current,
                                [request.id]: event.target.value,
                              }))
                            }
                            placeholder="Add transaction note, rejection reason, or fraud context..."
                            className="min-h-20"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={disabled || request.status === "paid"}
                              onClick={() => handleAction(request.id, "approve")}
                            >
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300"
                              disabled={disabled || request.status === "rejected"}
                              onClick={() => handleAction(request.id, "reject")}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={disabled || request.status === "flagged"}
                              onClick={() => handleAction(request.id, "flag")}
                            >
                              Flag Fraud
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Repeated UPI: {request.repeatedUpiClaims ?? 0} | Citizen claims (30d):{" "}
                            {request.citizenClaimsLast30Days ?? 0} | UPI claims (30d):{" "}
                            {request.upiClaimsLast30Days ?? 0}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
