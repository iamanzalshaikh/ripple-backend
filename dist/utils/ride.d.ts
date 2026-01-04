/**
 * Calculate distance between array of points using Haversine formula
 * @param points Array of {lat, lng}
 * @returns Distance in kilometers
 */
export declare const calculateDistance: (points: Array<{
    lat: number;
    lng: number;
}>) => number;
/**
 * Simplify polyline using Ramer-Douglas-Peucker algorithm
 * @param points Array of {lat, lng}
 * @param epsilon Tolerance (0.0001 ≈ 11 meters at equator)
 * @returns Simplified polyline
 *
 * Example:
 * 100 GPS points → 15 simplified points
 */
export declare const simplifyPolyline: (points: Array<{
    lat: number;
    lng: number;
}>, epsilon?: number) => Array<{
    lat: number;
    lng: number;
}>;
/**
 * Calculate ride statistics
 * @param points Array of GPS points
 * @returns Object with distance, duration, avgSpeed, maxSpeed
 */
export declare const calculateStats: (points: any[]) => {
    distance: number;
    duration: number;
    avgSpeed: number;
    maxSpeed: number;
};
/**
 * Get elevation gain (approximation using lat/lng)
 * For accurate elevation, use external API like Google Elevation
 * @param points Array of GPS points
 * @returns Elevation gain in meters
 */
export declare const estimateElevationGain: (points: any[]) => number;
//# sourceMappingURL=ride.d.ts.map