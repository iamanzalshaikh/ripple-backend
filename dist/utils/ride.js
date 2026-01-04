// ==================== utils/ride.utils.ts ====================
/**
 * Calculate distance between array of points using Haversine formula
 * @param points Array of {lat, lng}
 * @returns Distance in kilometers
 */
export const calculateDistance = (points) => {
    if (points.length < 2)
        return 0;
    const R = 6371; // Earth's radius in km
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const lat1 = (points[i].lat * Math.PI) / 180;
        const lat2 = (points[i + 1].lat * Math.PI) / 180;
        const deltaLat = ((points[i + 1].lat - points[i].lat) * Math.PI) / 180;
        const deltaLng = ((points[i + 1].lng - points[i].lng) * Math.PI) / 180;
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
    }
    return totalDistance;
};
/**
 * Simplify polyline using Ramer-Douglas-Peucker algorithm
 * @param points Array of {lat, lng}
 * @param epsilon Tolerance (0.0001 ≈ 11 meters at equator)
 * @returns Simplified polyline
 *
 * Example:
 * 100 GPS points → 15 simplified points
 */
export const simplifyPolyline = (points, epsilon = 0.0001) => {
    if (points.length <= 2)
        return points;
    /**
     * Calculate perpendicular distance from point to line
     */
    const getDistance = (point, lineStart, lineEnd) => {
        const x = point.lng;
        const y = point.lat;
        const x1 = lineStart.lng;
        const y1 = lineStart.lat;
        const x2 = lineEnd.lng;
        const y2 = lineEnd.lat;
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0)
            param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    };
    /**
     * Recursive Douglas-Peucker simplification
     */
    const douglasPeucker = (pts, eps) => {
        let maxDist = 0;
        let maxIndex = 0;
        for (let i = 1; i < pts.length - 1; i++) {
            const dist = getDistance(pts[i], pts[0], pts[pts.length - 1]);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }
        if (maxDist > eps) {
            const left = douglasPeucker(pts.slice(0, maxIndex + 1), eps);
            const right = douglasPeucker(pts.slice(maxIndex), eps);
            return left.slice(0, -1).concat(right);
        }
        else {
            return [pts[0], pts[pts.length - 1]];
        }
    };
    return douglasPeucker(points, epsilon);
};
/**
 * Calculate ride statistics
 * @param points Array of GPS points
 * @returns Object with distance, duration, avgSpeed, maxSpeed
 */
export const calculateStats = (points) => {
    if (points.length === 0) {
        return { distance: 0, duration: 0, avgSpeed: 0, maxSpeed: 0 };
    }
    const polyline = points.map((p) => ({ lat: p.lat, lng: p.lng }));
    const distance = calculateDistance(polyline);
    const duration = Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000);
    const speeds = points.map((p) => p.speed * 3.6); // m/s to km/h
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    return {
        distance: parseFloat(distance.toFixed(2)),
        duration,
        avgSpeed: parseFloat(avgSpeed.toFixed(2)),
        maxSpeed: parseFloat(maxSpeed.toFixed(2))
    };
};
/**
 * Get elevation gain (approximation using lat/lng)
 * For accurate elevation, use external API like Google Elevation
 * @param points Array of GPS points
 * @returns Elevation gain in meters
 */
export const estimateElevationGain = (points) => {
    // Simplified: use lat as proxy (real implementation needs elevation data)
    let gain = 0;
    for (let i = 1; i < points.length; i++) {
        const latDiff = points[i].lat - points[i - 1].lat;
        if (latDiff > 0) {
            gain += latDiff * 111000; // 1 degree ≈ 111km
        }
    }
    return Math.round(gain);
};
//# sourceMappingURL=ride.js.map