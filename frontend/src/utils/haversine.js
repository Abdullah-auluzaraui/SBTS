const R = 6371000; // Earth radius in metres

/**
 * Returns the great-circle distance in metres between two GPS points.
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in metres
 */
/**
 * Shortest distance in metres from point P to segment A→B.
 * Uses equirectangular projection centred on P — accurate for distances < ~10 km.
 */
export const pointToSegmentMeters = (pLat, pLng, aLat, aLng, bLat, bLng) => {
    const toRad  = Math.PI / 180;
    const cosLat = Math.cos(pLat * toRad);
    const sx     = cosLat * toRad * R; // lng → metres
    const sy     = toRad * R;          // lat → metres

    const px = pLng * sx, py = pLat * sy;
    const ax = aLng * sx, ay = aLat * sy;
    const bx = bLng * sx, by = bLat * sy;

    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);

    const t  = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
};

export const haversineMeters = (lat1, lng1, lat2, lng2) => {
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
