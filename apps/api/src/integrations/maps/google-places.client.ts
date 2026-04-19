import axios from "axios";

import { env } from "config/env";
import { logger } from "utils/logger";

export type GooglePlaceType = "police" | "hospital" | "fire_station";

export interface NearbyPlaceResult {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  type: GooglePlaceType;
}

export class GooglePlacesClient {
  async searchNearby(input: {
    latitude: number;
    longitude: number;
    type: GooglePlaceType;
    radius?: number;
    limit?: number;
    languageCode?: string;
  }) {
    if (!env.GOOGLE_MAPS_API_KEY.trim()) {
      return [] as NearbyPlaceResult[];
    }

    try {
      const response = await axios.post<{
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          nationalPhoneNumber?: string;
          location?: { latitude?: number; longitude?: number };
          googleMapsUri?: string;
        }>;
      }>(
        env.GOOGLE_PLACES_BASE_URL,
        {
          includedTypes: [input.type],
          maxResultCount: input.limit ?? 5,
          rankPreference: "DISTANCE",
          languageCode: input.languageCode?.trim() || "en",
          locationRestriction: {
            circle: {
              center: {
                latitude: input.latitude,
                longitude: input.longitude
              },
              radius: input.radius ?? env.GOOGLE_PLACES_RADIUS_METERS
            }
          }
        },
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location,places.googleMapsUri"
          }
        }
      );

      return (
        response.data.places?.map((place, index) => ({
          id: place.id || `${input.type}-${index}`,
          name: place.displayName?.text?.trim() || "Emergency Service",
          address: place.formattedAddress?.trim() || "Address unavailable",
          phone: place.nationalPhoneNumber?.trim() || null,
          latitude: place.location?.latitude ?? null,
          longitude: place.location?.longitude ?? null,
          mapsUrl: place.googleMapsUri?.trim() || null,
          type: input.type
        })) ?? []
      );
    } catch (error) {
      logger.warn(
        {
          error,
          type: input.type,
          latitude: input.latitude,
          longitude: input.longitude
        },
        "Google Places nearby search failed. Falling back to default emergency support data."
      );

      return [] as NearbyPlaceResult[];
    }
  }
}
