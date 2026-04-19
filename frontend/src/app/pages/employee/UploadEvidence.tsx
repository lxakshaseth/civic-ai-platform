import { useEffect, useState } from "react";
import { CheckCircle, FileText, MapPin, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { apiRequest } from "@/src/lib/api";
import {
  formatComplaintStatus,
  formatDate,
  getComplaintStatusClasses,
  normalizeComplaintStatusKey
} from "@/src/lib/presentation";
import ComplaintConversation from "../../components/ComplaintConversation";
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

type ComplaintRecord = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  address?: string | null;
  category?: string | null;
  createdAt?: string | null;
  assignedEmployeeInfo?: {
    id?: string | null;
    name?: string | null;
    department?: string | null;
  } | null;
  beforeImage?: string | null;
  citizenImages?: string[];
};

export default function UploadEvidence() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [laborCount, setLaborCount] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [invoiceVendorName, setInvoiceVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: complaint, error, loading } = useApiData(
    () => {
      if (!id) {
        throw new Error("Complaint ID is missing.");
      }

      return apiRequest<ComplaintRecord>(`/complaints/${id}`);
    },
    [id, currentUser?.id]
  );

  useEffect(() => {
    if (!afterImage) {
      setAfterPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(afterImage);
    setAfterPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [afterImage]);

  useEffect(() => {
    if (!invoice || !invoice.type.startsWith("image/")) {
      setInvoicePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(invoice);
    setInvoicePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [invoice]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading work completion form..." />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Unable to load complaint</AlertTitle>
          <AlertDescription>{error ?? "Please refresh and try again."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const beforeImages = complaint.citizenImages?.length
    ? complaint.citizenImages
    : complaint.beforeImage
      ? [complaint.beforeImage]
      : [];
  const isTaskCompleted = ["completed", "verified"].includes(
    normalizeComplaintStatusKey(complaint.status)
  );

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS capture is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        toast.success("Completion GPS captured.");
      },
      () => toast.error("Unable to capture current GPS location.")
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isTaskCompleted) {
      toast.error("This task has already been completed and approved by the admin.");
      return;
    }

    if (!afterImage) {
      toast.error("An after-work photo is required.");
      return;
    }

    if (!notes.trim()) {
      toast.error("Work notes are required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = new FormData();
      payload.append("proofImages", afterImage);
      payload.set("notes", notes.trim());

      if (invoice) {
        payload.append("invoice", invoice);
      }

      if (laborCount.trim()) {
        payload.set("laborCount", laborCount.trim());
      }

      if (billAmount.trim()) {
        payload.set("billAmount", billAmount.trim());
      }

      if (invoiceVendorName.trim()) {
        payload.set("invoiceVendorName", invoiceVendorName.trim());
      }

      if (invoiceNumber.trim()) {
        payload.set("invoiceNumber", invoiceNumber.trim());
      }

      if (invoiceDate.trim()) {
        payload.set("invoiceDate", invoiceDate.trim());
      }

      if (materialsUsed.trim()) {
        payload.set("materialsUsed", materialsUsed.trim());
      }

      if (latitude && longitude) {
        payload.set("latitude", latitude);
        payload.set("longitude", longitude);
      }

      await apiRequest(`/complaints/${complaint.id}/complete`, {
        method: "PUT",
        body: payload
      });

      toast.success("Work proof submitted. Sent to the admin verification queue.");
      navigate("/employee/assigned");
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Work proof could not be uploaded.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-950">Upload Evidence & Close Task</h1>
              <p className="font-mono text-sm text-muted-foreground">{complaint.id}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {complaint.description}
              </p>
            </div>
            <div className="space-y-2 rounded-2xl bg-green-50 px-4 py-3 text-sm">
              <Badge className={getComplaintStatusClasses(complaint.status)}>
                {formatComplaintStatus(complaint.status)}
              </Badge>
              <p className="text-gray-700">{complaint.category || "General"}</p>
              <p className="text-muted-foreground">{formatDate(complaint.createdAt)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-green-700" />
            {complaint.address || "Location unavailable"}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="space-y-6">
            <Card className="border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-950">Before Image From Citizen</h2>
              {beforeImages.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {beforeImages.map((imageUrl, index) => (
                    <img
                      key={`${imageUrl}-${index}`}
                      src={imageUrl}
                      alt={`Before proof ${index + 1}`}
                      className="h-64 w-full rounded-2xl object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-slate-50 px-4 py-8 text-sm text-muted-foreground">
                  No citizen image was attached to this complaint.
                </div>
              )}
            </Card>

            <Card className="border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="afterImage">After Work Photo *</Label>
                  <div className="mt-2">
                    <label
                      htmlFor="afterImage"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-6 hover:border-green-400"
                    >
                      {afterPreview ? (
                        <div className="w-full space-y-4">
                          <img
                            src={afterPreview}
                            alt="After work preview"
                            className="h-72 w-full rounded-2xl object-cover"
                          />
                          <p className="text-sm font-semibold text-gray-900">{afterImage?.name}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto mb-3 size-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">Upload after-work image</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            This photo will be shown to the citizen as proof of completed work.
                          </p>
                        </div>
                      )}
                    </label>
                    <input
                      id="afterImage"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => setAfterImage(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="invoice">Invoice Document</Label>
                    <div className="mt-2">
                      <label
                        htmlFor="invoice"
                        className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-4 hover:border-green-400"
                      >
                        {invoicePreview ? (
                          <img
                            src={invoicePreview}
                            alt="Invoice preview"
                            className="h-40 w-full rounded-xl object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <FileText className="mx-auto mb-3 size-8 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900">
                              {invoice?.name || "Upload bill or invoice"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Image and PDF files are supported.
                            </p>
                          </div>
                        )}
                      </label>
                      <input
                        id="invoice"
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(event) => setInvoice(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
                    <div>
                      <Label htmlFor="invoiceVendorName">Vendor / Contractor</Label>
                      <Input
                        id="invoiceVendorName"
                        value={invoiceVendorName}
                        onChange={(event) => setInvoiceVendorName(event.target.value)}
                        placeholder="ABC Electrical Services"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input
                        id="invoiceNumber"
                        value={invoiceNumber}
                        onChange={(event) => setInvoiceNumber(event.target.value)}
                        placeholder="INV-2026-0042"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="invoiceDate">Invoice Date</Label>
                        <Input
                          id="invoiceDate"
                          type="date"
                          value={invoiceDate}
                          onChange={(event) => setInvoiceDate(event.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="billAmount">Invoice Amount</Label>
                        <Input
                          id="billAmount"
                          inputMode="decimal"
                          value={billAmount}
                          onChange={(event) => setBillAmount(event.target.value.replace(/[^\d.]/g, ""))}
                          placeholder="8500"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="laborCount">Labour Count</Label>
                      <Input
                        id="laborCount"
                        inputMode="numeric"
                        value={laborCount}
                        onChange={(event) => setLaborCount(event.target.value.replace(/\D/g, ""))}
                        placeholder="3"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="materialsUsed">Materials / Work Done</Label>
                  <Input
                    id="materialsUsed"
                    value={materialsUsed}
                    onChange={(event) => setMaterialsUsed(event.target.value)}
                    placeholder="Wire replacement, pole tightening, LED fixture installation"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Work Notes *</Label>
                  <Textarea
                    id="notes"
                    rows={5}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Describe the work completed, the issue identified on-site, and the update to be shared with the citizen."
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-950">Completion GPS (optional)</p>
                      <p className="text-sm text-muted-foreground">
                        Capturing the final work location strengthens the audit trail.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={detectLocation}>
                      <MapPin className="mr-2 size-4" />
                      Capture GPS
                    </Button>
                  </div>
                  {(latitude || longitude) ? (
                    <p className="mt-3 text-xs text-blue-700">
                      {latitude}, {longitude}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" className="flex-1" disabled={isSubmitting || isTaskCompleted}>
                    <CheckCircle className="mr-2 size-4" />
                    {isTaskCompleted ? "Task Completed" : isSubmitting ? "Submitting..." : "Mark Task Complete"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/employee/assigned")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            <ComplaintConversation
              complaintId={complaint.id}
              currentUserId={currentUser?.id}
              disabledReason={
                !complaint.assignedEmployeeInfo?.id
                  ? "Chat becomes available after the complaint is assigned."
                  : isTaskCompleted
                    ? "Chat has been closed after admin approval."
                    : null
              }
            />
          </div>

          <div className="space-y-6">
            <Card className="border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-950">Closure Checklist</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  The after-work photo will appear in the citizen portal as work proof.
                </div>
                <div className="rounded-xl bg-blue-50 px-4 py-3">
                  The invoice amount, labour count, and materials used will appear in the citizen-visible summary.
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  Admin verification is required after submission.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
