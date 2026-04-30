import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, MapPin, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

import { apiRequest } from "@/src/lib/api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

type ComplaintCreateResponse =
  | {
      id?: string;
      success?: boolean;
      data?: { id?: string };
      complaint?: { id?: string };
    }
  | undefined
  | null;

type AddressFormState = {
  houseNo: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  pincode: string;
};

const categories = [
  "Infrastructure",
  "Electricity",
  "Water Supply",
  "Sanitation",
  "Roads",
  "Street Lights",
  "Drainage",
  "Parks & Gardens",
  "Public Safety",
  "Others"
];

const priorities = ["Low", "Medium", "High"];

function buildFullAddress(address: AddressFormState) {
  return [
    address.houseNo,
    address.street,
    address.landmark,
    address.area,
    address.city,
    address.pincode
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

function estimateUrgency(description: string, priority: string) {
  if (priority === "High") {
    return 90;
  }

  const text = description.toLowerCase();

  if (text.includes("danger") || text.includes("accident") || text.includes("urgent")) {
    return 86;
  }

  if (priority === "Low") {
    return 48;
  }

  return 68;
}

function validateComplaintForm(
  formData: {
    title: string;
    description: string;
    latitude: string;
    longitude: string;
  },
  address: AddressFormState,
  hasImage: boolean
) {
  const trimmedTitle = formData.title.trim();
  const trimmedDescription = formData.description.trim();
  const trimmedHouseNo = address.houseNo.trim();
  const trimmedStreet = address.street.trim();
  const trimmedArea = address.area.trim();
  const trimmedCity = address.city.trim();
  const trimmedPincode = address.pincode.trim();
  const hasLatitude = Boolean(formData.latitude.trim());
  const hasLongitude = Boolean(formData.longitude.trim());

  if (!hasImage) {
    return "Please upload a complaint photo.";
  }

  if (trimmedTitle.length < 5) {
    return "Complaint title must be at least 5 characters.";
  }

  if (trimmedDescription.length < 10) {
    return "Description must be at least 10 characters.";
  }

  if (!trimmedHouseNo) {
    return "House / Shop / Plot No. is required.";
  }

  if (trimmedStreet.length < 2) {
    return "Street / Road must be at least 2 characters.";
  }

  if (trimmedArea.length < 2) {
    return "Area / Locality must be at least 2 characters.";
  }

  if (trimmedCity.length < 2) {
    return "City must be at least 2 characters.";
  }

  if (!/^\d{6}$/.test(trimmedPincode)) {
    return "Pincode must be a valid 6-digit number.";
  }

  if (hasLatitude !== hasLongitude) {
    return "Both latitude and longitude are required for GPS location.";
  }

  return null;
}

export default function FileComplaint() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    latitude: "",
    longitude: ""
  });
  const [address, setAddress] = useState<AddressFormState>({
    houseNo: "",
    street: "",
    landmark: "",
    area: "",
    city: "",
    pincode: ""
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

  const fullAddress = useMemo(() => buildFullAddress(address), [address]);
  const aiCategory = formData.category || "General civic issue";
  const urgencyScore = estimateUrgency(formData.description, formData.priority);

  const updateAddress = (key: keyof AddressFormState, value: string) => {
    setAddress((currentAddress) => ({
      ...currentAddress,
      [key]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setImage(selectedFile);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS location is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((currentForm) => ({
          ...currentForm,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        toast.success("GPS location captured successfully.");
      },
      () => {
        toast.error("Unable to capture the current location.");
      }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationMessage = validateComplaintForm(formData, address, Boolean(image));

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = new FormData();
      payload.set("title", formData.title.trim());
      payload.set("description", formData.description.trim());
      payload.set("priority", formData.priority);
      payload.set("pincode", address.pincode.trim());
      payload.set("locationAddress", fullAddress);

      if (formData.category.trim()) {
        payload.set("category", formData.category.trim());
      }

      payload.set(
        "structuredAddress",
        JSON.stringify({
          houseNo: address.houseNo.trim(),
          street: address.street.trim(),
          landmark: address.landmark.trim() || undefined,
          area: address.area.trim(),
          city: address.city.trim(),
          pincode: address.pincode.trim()
        })
      );

      if (formData.latitude && formData.longitude) {
        payload.set("latitude", formData.latitude);
        payload.set("longitude", formData.longitude);
      }

      payload.append("images", image);

      const res = await apiRequest<ComplaintCreateResponse>("/complaints", {
        method: "POST",
        body: payload
      });

      console.log("API RESPONSE:", res);

      const complaintId = res?.id ?? res?.data?.id ?? res?.complaint?.id;

      if (!complaintId) {
        toast.error("Complaint was submitted, but the complaint ID was missing from the response.");
        return;
      }

      toast.success("Complaint successfully filed and sent to the admin queue.");
      navigate(`/public/complaint/${complaintId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Complaint could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">File a Complaint</h1>
          <p className="text-muted-foreground">
            Submit a complaint with address details, pincode, photo evidence, and GPS location.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <Card className="border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Complaint Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter a short title for the issue"
                  value={formData.title}
                  minLength={5}
                  onChange={(event) =>
                    setFormData((currentForm) => ({
                      ...currentForm,
                      title: event.target.value
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Describe where the problem is, how serious it is, and how it affects the public..."
                  value={formData.description}
                  minLength={10}
                  onChange={(event) =>
                    setFormData((currentForm) => ({
                      ...currentForm,
                      description: event.target.value
                    }))
                  }
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((currentForm) => ({
                        ...currentForm,
                        category: value
                      }))
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData((currentForm) => ({
                        ...currentForm,
                        priority: value
                      }))
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-5 text-blue-700" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">AI filing snapshot</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-blue-100 text-blue-700 shadow-none">
                        Category: {aiCategory}
                      </Badge>
                      <Badge
                        className={`border-0 shadow-none ${
                          urgencyScore >= 80
                            ? "bg-red-100 text-red-700"
                            : urgencyScore >= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        <AlertTriangle className="mr-1 size-3.5" />
                        Urgency {urgencyScore}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="image">Upload Complaint Photo *</Label>
                <div className="mt-2">
                  <label
                    htmlFor="image"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-blue-400"
                  >
                    {imagePreview ? (
                      <div className="w-full space-y-4">
                        <img
                          src={imagePreview}
                          alt="Complaint preview"
                          className="h-64 w-full rounded-2xl object-cover"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{image?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Photo preview ready. Click to replace image.
                            </p>
                          </div>
                          <Badge className="border-0 bg-emerald-100 text-emerald-700 shadow-none">
                            Preview ready
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto mb-3 size-8 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">
                          Click to upload photo
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          JPG, PNG, WEBP up to 10MB
                        </p>
                      </div>
                    )}
                  </label>
                  <input
                    id="image"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-950">Address Details</h2>
                    <p className="text-sm text-muted-foreground">
                      The exact location will be saved for the citizen record and sent to the admin queue with the pincode.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={detectLocation}>
                    <MapPin className="mr-2 size-4" />
                    Detect GPS
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="houseNo">House / Shop / Plot No *</Label>
                    <Input
                      id="houseNo"
                      value={address.houseNo}
                      minLength={1}
                      onChange={(event) => updateAddress("houseNo", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="street">Street / Road *</Label>
                    <Input
                      id="street"
                      value={address.street}
                      minLength={2}
                      onChange={(event) => updateAddress("street", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      value={address.landmark}
                      onChange={(event) => updateAddress("landmark", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="area">Area / Locality *</Label>
                    <Input
                      id="area"
                      value={address.area}
                      minLength={2}
                      onChange={(event) => updateAddress("area", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={address.city}
                      minLength={2}
                      onChange={(event) => updateAddress("city", event.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={address.pincode}
                      onChange={(event) => updateAddress("pincode", event.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                  <p className="font-semibold text-gray-900">Saved location preview</p>
                  <p className="mt-2 text-muted-foreground">
                    {fullAddress || "The full address preview will appear here once the details are entered."}
                  </p>
                  {formData.latitude && formData.longitude ? (
                    <p className="mt-2 text-xs text-blue-700">
                      GPS: {formData.latitude}, {formData.longitude}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  <Camera className="mr-2 size-4" />
                  {isSubmitting ? "Submitting..." : "Submit Complaint"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/public")}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-950">What happens next</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl bg-blue-50 px-4 py-3">
                  Your complaint will appear immediately in `My Complaints`.
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  The complaint will appear in the admin queue with the pincode.
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  Once assigned, you will be able to chat with the employee and view work progress.
                </div>
              </div>
            </Card>

            <Card className="border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-950">Helpful tip</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Even if you do not upload multiple angles of the same issue, please include at least one clear photo,
                the exact area, and the pincode. This helps the admin assign the correct employee more quickly.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
