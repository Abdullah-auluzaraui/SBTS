const EARTH_RADIUS_M = 6371000;

/**
 * Haversine distance in meters between two [lat, lng] points.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compass bearing (0–360°) FROM point A TO point B.
 */
export function bearingTo(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Absolute angular difference between two bearings (0–180°).
 */
export function bearingDelta(b1: number, b2: number): number {
  const diff = Math.abs(b1 - b2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

interface GPSPosition {
  lat: number;
  lng: number;
  updatedAt: Date | string | number;
}

/**
 * Calculate speed in km/h given two positions and timestamps.
 * Supports Date instances, ISO string timestamps, or numeric timestamps.
 * @param pos1 - { lat, lng, updatedAt: Date | string | number }
 * @param pos2 - { lat, lng, updatedAt: Date | string | number }
 */
export function calculateSpeedKmH(pos1: GPSPosition, pos2: GPSPosition): number {
  if (!pos1 || !pos2 || !pos1.updatedAt || !pos2.updatedAt) return 0;
  
  const t1 = new Date(pos1.updatedAt).getTime();
  const t2 = new Date(pos2.updatedAt).getTime();
  
  if (isNaN(t1) || isNaN(t2)) return 0;
  
  const timeDiffHours = Math.abs(t2 - t1) / (1000 * 60 * 60);
  if (timeDiffHours === 0) return 0;
  
  const distanceM = haversineDistance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
  const distanceKm = distanceM / 1000;
  return distanceKm / timeDiffHours;
}

