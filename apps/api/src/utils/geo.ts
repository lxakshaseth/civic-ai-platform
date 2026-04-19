const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const isValidLatitude = (value: number) => value >= -90 && value <= 90;

export const isValidLongitude = (value: number) => value >= -180 && value <= 180;

export const calculateDistanceKm = (
  first?: { latitude?: number | null; longitude?: number | null },
  second?: { latitude?: number | null; longitude?: number | null }
) => {
  if (
    first?.latitude == null ||
    first.longitude == null ||
    second?.latitude == null ||
    second.longitude == null
  ) {
    return null;
  }

  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const latitudeA = toRadians(first.latitude);
  const latitudeB = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const buildAreaKey = (
  locationAddress?: string | null,
  latitude?: number | null,
  longitude?: number | null,
  precision = 2
) => {
  if (locationAddress?.trim()) {
    const normalized = locationAddress
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return normalized.slice(0, 2).join(", ");
  }

  if (latitude != null && longitude != null) {
    return `${latitude.toFixed(precision)},${longitude.toFixed(precision)}`;
  }

  return "Unknown";
};

