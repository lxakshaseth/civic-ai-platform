import { UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import {
  GooglePlacesClient,
  type GooglePlaceType
} from "integrations/maps/google-places.client";
import { AppError } from "shared/errors/app-error";
import { calculateDistanceKm } from "utils/geo";

type Actor = {
  id: string;
  role: UserRole;
};

const QUICK_CONTACTS = [
  {
    id: "all-emergency",
    label: "All Emergencies",
    number: "112",
    description: "National emergency response support"
  },
  {
    id: "police",
    label: "Police",
    number: "100",
    description: "Police control room"
  },
  {
    id: "ambulance",
    label: "Ambulance",
    number: "108",
    description: "Emergency ambulance service"
  },
  {
    id: "fire",
    label: "Fire",
    number: "101",
    description: "Fire and rescue"
  },
  {
    id: "women-helpline",
    label: "Women Helpline",
    number: "1091",
    description: "Women safety support"
  }
] as const;

const FALLBACK_SERVICES: Record<
  GooglePlaceType,
  Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
  }>
> = {
  police: [
    {
      id: "fallback-police-dispatch",
      name: "Police Emergency Dispatch",
      address: "Location access unavailable. Use quick dial for the nearest police response unit.",
      phone: "112"
    },
    {
      id: "fallback-police-control",
      name: "Police Control Room",
      address: "Use the emergency line to reach the fastest available police support.",
      phone: "100"
    }
  ],
  hospital: [
    {
      id: "fallback-hospital-ambulance",
      name: "Emergency Ambulance Dispatch",
      address: "Location access unavailable. Call the ambulance line for the nearest available hospital support.",
      phone: "108"
    },
    {
      id: "fallback-hospital-support",
      name: "Nearest Hospital Support",
      address: "Use the ambulance line or local hospital emergency desk for immediate guidance.",
      phone: "108"
    }
  ],
  fire_station: [
    {
      id: "fallback-fire-dispatch",
      name: "Fire Emergency Dispatch",
      address: "Location access unavailable. Call the fire helpline for the closest fire response team.",
      phone: "101"
    },
    {
      id: "fallback-fire-control",
      name: "Fire Control Room",
      address: "Use quick dial to connect with the nearest fire and rescue support.",
      phone: "101"
    }
  ]
};

export class EmergencyService {
  constructor(private readonly placesClient: GooglePlacesClient = new GooglePlacesClient()) {}

  async getNearby(actor: Actor, input: {
    lat?: number;
    lng?: number;
    pincode?: string;
    language?: "en" | "hi" | "mr";
  }) {
    if (actor.role !== UserRole.CITIZEN) {
      throw new AppError("Forbidden", StatusCodes.FORBIDDEN, "FORBIDDEN");
    }

    const hasCoordinates = typeof input.lat === "number" && typeof input.lng === "number";

    if (hasCoordinates) {
      const [police, hospital, fire] = await Promise.all([
        this.searchByType("police", input),
        this.searchByType("hospital", input),
        this.searchByType("fire_station", input)
      ]);

      if (police.length || hospital.length || fire.length) {
        return {
          mode: "nearby" as const,
          location: {
            latitude: input.lat!,
            longitude: input.lng!
          },
          services: {
            police,
            hospital,
            fire
          },
          quickContacts: QUICK_CONTACTS.map((contact) => ({
            ...contact,
            tel: `tel:${contact.number}`
          }))
        };
      }
    }

    return {
      mode: "fallback" as const,
      location: null,
      services: {
        police: this.buildFallbackList("police"),
        hospital: this.buildFallbackList("hospital"),
        fire: this.buildFallbackList("fire_station")
      },
      quickContacts: QUICK_CONTACTS.map((contact) => ({
        ...contact,
        tel: `tel:${contact.number}`
      }))
    };
  }

  private async searchByType(
    type: GooglePlaceType,
    input: {
      lat?: number;
      lng?: number;
      language?: "en" | "hi" | "mr";
    }
  ) {
    const places = await this.placesClient.searchNearby({
      latitude: input.lat!,
      longitude: input.lng!,
      type,
      languageCode: input.language
    });

    return places
      .map((place) => ({
        id: place.id,
        type: this.mapPlaceType(type),
        name: place.name,
        address: place.address,
        phone: place.phone,
        latitude: place.latitude,
        longitude: place.longitude,
        distanceKm: Number(
          (
            calculateDistanceKm(
              {
                latitude: input.lat!,
                longitude: input.lng!
              },
              {
                latitude: place.latitude,
                longitude: place.longitude
              }
            ) ?? 0
          ).toFixed(2)
        ),
        mapsUrl:
          place.mapsUrl ||
          (place.latitude != null && place.longitude != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
            : null),
        source: "google"
      }))
      .sort((first, second) => first.distanceKm - second.distanceKm);
  }

  private buildFallbackList(type: GooglePlaceType) {
    return FALLBACK_SERVICES[type].map((service) => ({
      id: service.id,
      type: this.mapPlaceType(type),
      name: service.name,
      address: service.address,
      phone: service.phone,
      latitude: null,
      longitude: null,
      distanceKm: null,
      mapsUrl: null,
      source: "fallback"
    }));
  }

  private mapPlaceType(type: GooglePlaceType) {
    switch (type) {
      case "police":
        return "police";
      case "hospital":
        return "hospital";
      default:
        return "fire";
    }
  }
}
