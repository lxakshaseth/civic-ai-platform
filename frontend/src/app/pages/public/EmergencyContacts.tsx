import { useState } from "react";
import { AlertCircle, Clock, Heart, MapPin, Phone, Shield } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  defaultSupportPincode,
  getNationalEmergencyContacts,
  getNearestEmergencyContacts,
  getSupportZone,
  normalizePincode,
} from "../../data/citizenSupport";

export default function EmergencyContacts() {
  const [pincode, setPincode] = useState(defaultSupportPincode);

  const normalizedPincode = normalizePincode(pincode);
  const zone = getSupportZone(normalizedPincode);
  const contacts = getNearestEmergencyContacts(normalizedPincode);
  const nationalContacts = getNationalEmergencyContacts();

  return (
    <div className="space-y-8 p-8">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-700 text-white shadow-xl">
        <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1.35fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
              <Shield className="size-4" />
              Pincode-based Emergency Contacts
            </div>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Show the nearest emergency support for the entered pincode</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 md:text-base">
              The portal surfaces the closest emergency contacts so citizens can quickly reach women helplines,
              ambulance coordination, and district response teams from the same dashboard.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {nationalContacts.map((contact) => (
                <div key={contact.phone} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">{contact.label}</p>
                  <p className="mt-2 text-2xl font-bold">{contact.phone}</p>
                  <p className="mt-2 text-sm leading-6 text-blue-50">{contact.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Nearest zone</p>
            <h2 className="mt-3 text-2xl font-bold">
              {zone ? `${zone.city}, ${zone.state}` : "National support fallback"}
            </h2>
            <p className="mt-2 text-sm text-blue-100">
              {zone?.coverageLabel ?? "The nearest mapped emergency directory is shown until a local pincode cluster is configured."}
            </p>
            <div className="mt-5 rounded-2xl border border-white/15 bg-slate-950/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Search pincode</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                className="mt-3 border-white/20 bg-white/10 text-white placeholder:text-blue-200"
                placeholder="Enter 6-digit pincode"
                value={pincode}
                onChange={(event) => setPincode(normalizePincode(event.target.value))}
              />
              <p className="mt-3 text-sm text-blue-100">
                {normalizedPincode.length === 6
                  ? `Showing response points closest to ${normalizedPincode}.`
                  : "Enter the full 6-digit pincode to narrow to the nearest contacts."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1.55fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-gray-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Nearest emergency directory</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contacts are prioritized for the entered pincode so the user sees the closest relevant support first.
                </p>
              </div>
              <div className="w-full md:max-w-xs">
                <label className="mb-2 block text-sm font-medium text-gray-700">Pincode lookup</label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={(event) => setPincode(normalizePincode(event.target.value))}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="border-2 border-gray-200 p-5 hover:border-blue-200">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
                        <Badge className="bg-blue-100 text-blue-700">{contact.department}</Badge>
                        <Badge variant="outline" className="border-green-200 text-green-700">
                          {contact.availability}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-blue-700" />
                          <span>{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-blue-700" />
                          <span>{contact.responseTime}</span>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <MapPin className="size-4 text-blue-700" />
                          <span>{contact.address}</span>
                        </div>
                      </div>
                      {contact.secondaryPhone ? (
                        <p className="mt-3 text-sm text-muted-foreground">Alternate line: {contact.secondaryPhone}</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {contact.services.map((service) => (
                          <Badge key={service} variant="outline" className="border-blue-200 text-blue-700">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                        <Button className="w-full bg-blue-700 hover:bg-blue-800">
                          <Phone className="mr-2 size-4" />
                          Call Now
                        </Button>
                      </a>
                      {contact.secondaryPhone ? (
                        <a href={`tel:${contact.secondaryPhone.replace(/\s/g, "")}`}>
                          <Button variant="outline" className="w-full">
                            Alternate Line
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3">
                <MapPin className="size-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Local response summary</h2>
                <p className="text-sm text-muted-foreground">Nearest support grouped by your pincode zone</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-800">
                {zone ? `${zone.city}, ${zone.district}` : "Nearest available emergency cluster"}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {zone?.note ?? "Closest emergency contacts are shown from the broader portal directory."}
              </p>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex gap-3">
                <Shield className="mt-0.5 size-4 shrink-0 text-blue-700" />
                <p>Women assistance, medical support, and district emergency contacts remain visible in one place.</p>
              </div>
              <div className="flex gap-3">
                <Heart className="mt-0.5 size-4 shrink-0 text-rose-600" />
                <p>Use this section for urgent help when immediate support matters more than standard complaint filing.</p>
              </div>
            </div>
          </Card>

          <Card className="border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Use the right line quickly</h2>
            <div className="mt-4 space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
                <p>Use `112` for immediate emergency dispatch when life, safety, or severe threat is involved.</p>
              </div>
              <div className="flex gap-3">
                <Heart className="mt-0.5 size-4 shrink-0 text-rose-600" />
                <p>Use `181` for women safety support, crisis intervention, and assisted coordination.</p>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-green-600" />
                <p>Use `108` for ambulance and medical routing when health support is needed urgently.</p>
              </div>
            </div>
          </Card>

          <Card className="border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-bold text-amber-900">For portal demo</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Local directory cards are displayed from the mapped portal dataset so users can preview how nearest
                  emergency support will appear by pincode.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
