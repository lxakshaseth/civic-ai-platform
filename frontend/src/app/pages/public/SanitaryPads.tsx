import { ChangeEvent, FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle, Clock, FileText, Heart, MapPin, Upload } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  defaultSupportPincode,
  getNearestSanitaryStores,
  getSupportZone,
  normalizePincode,
} from "../../data/citizenSupport";

type ClaimState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function SanitaryPads() {
  const [pincode, setPincode] = useState(defaultSupportPincode);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [billFileName, setBillFileName] = useState("");
  const [claimState, setClaimState] = useState<ClaimState>(null);

  const normalizedPincode = normalizePincode(pincode);
  const zone = getSupportZone(normalizedPincode);
  const stores = getNearestSanitaryStores(normalizedPincode);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];
  const estimatedTransfer = Math.min(Number(purchaseAmount) || 0, selectedStore?.reimbursementLimit ?? 0);

  const steps = [
    "Enter your pincode to fetch the nearest verified sanitary pad stores.",
    "Buy pads from the nearest listed store and collect a GST bill.",
    "Upload the GST bill so the platform can verify and transfer the amount back to the buyer.",
  ];

  const handleBillUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setBillFileName(file?.name ?? "");
  };

  const handleClaimSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (normalizedPincode.length !== 6) {
      setClaimState({ type: "error", message: "Please enter a valid 6-digit pincode before uploading the GST bill." });
      return;
    }

    if (!selectedStore) {
      setClaimState({ type: "error", message: "No reimbursement partner is available for the current pincode." });
      return;
    }

    if (!invoiceNumber.trim() || !purchaseAmount || !billFileName) {
      setClaimState({ type: "error", message: "Invoice number, amount, and GST bill upload are required for reimbursement." });
      return;
    }

    if (Number(purchaseAmount) <= 0) {
      setClaimState({ type: "error", message: "Purchase amount should be greater than zero." });
      return;
    }

    setClaimState({
      type: "success",
      message: `GST bill received for ${selectedStore.name}. Up to Rs ${estimatedTransfer.toFixed(
        0,
      )} will be transferred to ${beneficiaryId || "the registered buyer account"} after verification.`,
    });
  };

  return (
    <div className="space-y-8 p-8">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500 text-white shadow-xl">
        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              <Heart className="size-4" />
              Sanitary Pad Emergency Support
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Nearest-store purchase with bill-based reimbursement</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-rose-50 md:text-base">
              Citizens can purchase sanitary pads from the nearest listed store, upload the GST bill, and receive the
              approved amount directly from the platform after verification.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Step {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-slate-950/15 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Coverage Snapshot</p>
            <h2 className="mt-3 text-2xl font-bold">
              {zone ? `${zone.city}, ${zone.state}` : "National Partner Network"}
            </h2>
            <p className="mt-2 text-sm text-rose-50">{zone?.coverageLabel ?? "Showing the closest mapped stores available in the portal."}</p>
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-100">Pincode mapped</p>
              <p className="mt-1 text-3xl font-bold">{normalizedPincode || defaultSupportPincode}</p>
              <p className="mt-2 text-sm text-rose-50">
                {zone?.note ?? "Local mapping is not configured yet, so the portal is showing the nearest available support network."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-gray-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Find nearest sanitary pad stores</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Store suggestions are grouped by your pincode so buyers can purchase quickly and upload the invoice
                  for reimbursement.
                </p>
              </div>
              <div className="w-full md:max-w-xs">
                <label className="mb-2 block text-sm font-medium text-gray-700">Search by pincode</label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={(event) => setPincode(normalizePincode(event.target.value))}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {stores.map((store) => {
                const isSelected = selectedStore?.id === store.id;

                return (
                  <Card
                    key={store.id}
                    className={`border-2 p-5 transition-all ${
                      isSelected ? "border-rose-500 bg-rose-50 shadow-sm" : "border-gray-200 hover:border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                          <Badge className={store.stockStatus === "In Stock" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                            {store.stockStatus}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium text-rose-700">{store.area}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{store.address}</p>
                      </div>
                      <Button variant={isSelected ? "default" : "outline"} onClick={() => setSelectedStoreId(store.id)}>
                        {isSelected ? "Selected" : "Use Store"}
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-rose-600" />
                        <span>{store.distance} away</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-rose-600" />
                        <span>{store.eta} travel time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-rose-600" />
                        <span>GST bill mandatory</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="size-4 text-rose-600" />
                        <span>Limit up to Rs {store.reimbursementLimit}</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm">
                      <p className="font-semibold text-gray-900">Available brands</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {store.brands.map((brand) => (
                          <Badge key={brand} variant="outline" className="border-rose-200 text-rose-700">
                            {brand}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-3 text-muted-foreground">{store.payoutWindow}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          <Card className="border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-3">
                <Upload className="size-6 text-rose-700" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Upload GST bill for payout</h2>
                <p className="text-sm text-muted-foreground">
                  The platform validates the uploaded GST bill and transfers the approved amount to the buyer.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleClaimSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Selected store</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedStore?.id ?? ""}
                    onChange={(event) => setSelectedStoreId(event.target.value)}
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} - {store.area}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Invoice / GST bill number</label>
                  <Input
                    placeholder="Ex: GST-APR-2026-114"
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Purchase amount (Rs)</label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 420"
                    value={purchaseAmount}
                    onChange={(event) => setPurchaseAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Buyer UPI / bank reference</label>
                  <Input
                    placeholder="Ex: citizen@upi"
                    value={beneficiaryId}
                    onChange={(event) => setBeneficiaryId(event.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50/60 p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Upload GST bill</label>
                <input
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-700"
                  type="file"
                  onChange={handleBillUpload}
                />
                <p className="mt-2 text-xs text-muted-foreground">Accepted files: PDF, JPG, JPEG, PNG</p>
                {billFileName ? <p className="mt-3 text-sm font-medium text-rose-700">Uploaded: {billFileName}</p> : null}
              </div>

              {claimState ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    claimState.type === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {claimState.message}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estimated platform transfer</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">Rs {estimatedTransfer.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">
                    Amount is capped at the selected store reimbursement limit after bill verification.
                  </p>
                </div>
                <Button className="bg-rose-600 hover:bg-rose-700" type="submit">
                  Submit GST Bill
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Eligibility rules</h2>
            <div className="mt-4 space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-600" />
                <p>Any citizen can purchase sanitary pads from the nearest listed store for urgent need.</p>
              </div>
              <div className="flex gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-rose-600" />
                <p>GST bill upload is mandatory so the portal can validate the purchase and avoid duplicate claims.</p>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <p>Verified claims are transferred to the buyer account based on the approved amount and store limit.</p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Current mapped area</h2>
            <div className="mt-4 rounded-2xl bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-700">
                {zone ? `${zone.city}, ${zone.district}` : "Nearest available service zone"}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {zone?.coverageLabel ?? "Exact local coverage is not configured yet, so nearby partner stores are shown from the broader network."}
              </p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Pincode-aware mapping makes it easier to find the closest store first, then complete the reimbursement flow
              in the same dashboard.
            </p>
          </Card>

          <Card className="border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-bold text-amber-900">Need urgent help instead of reimbursement?</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Use the emergency contacts section when the citizen needs immediate assistance, transport, medical
                  support, or women safety response near the entered pincode.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
