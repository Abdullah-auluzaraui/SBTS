const EARTH_RADIUS_M = 6371000;

/**
 * Haversine distance in meters between two [lat, lng] points.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
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
function bearingTo(lat1, lng1, lat2, lng2) {
  const toRad = d => (d * Math.PI) / 180;
  const toDeg = r => (r * 180) / Math.PI;
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
function bearingDelta(b1, b2) {
  const diff = Math.abs(b1 - b2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Calculate speed in km/h given two positions and timestamps.
 * @param {Object} pos1 - { lat, lng, updatedAt: Date }
 * @param {Object} pos2 - { lat, lng, updatedAt: Date }
 */
function calculateSpeedKmH(pos1, pos2) {
  if (!pos1 || !pos2 || !pos1.updatedAt || !pos2.updatedAt) return 0;
  const timeDiffHours = Math.abs(pos2.updatedAt - pos1.updatedAt) / (1000 * 60 * 60);
  if (timeDiffHours === 0) return 0;
  
  const distanceM = haversineDistance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
  const distanceKm = distanceM / 1000;
  return distanceKm / timeDiffHours;
}

module.exports = { haversineDistance, bearingTo, bearingDelta, calculateSpeedKmH };
