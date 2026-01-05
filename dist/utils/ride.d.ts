/**
 * ✅ COMPLETE RIDE UTILITIES
 * File: src/utils/ride.ts (or ride.utils.ts)
 *
 * ADD THESE FUNCTIONS TO YOUR EXISTING FILE
 * Your existing functions stay EXACTLY as they are
 */
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
 * @param points Array of GPS points
 * @returns Elevation gain in meters
 */
export declare const estimateElevationGain: (points: any[]) => number;
/**
 * Calculate average speed from distance and duration
 * @param distanceKm - Distance in kilometers
 * @param durationSeconds - Duration in seconds
 * @returns Average speed in km/h
 */
export declare const calculateAvgSpeed: (distanceKm: number, durationSeconds: number) => number;
/**
 * Calculate calories burned based on MET (Metabolic Equivalent)
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h
 * @param riderWeightKg - Rider weight (default 65kg)
 * @returns Estimated calories burned
 */
export declare const calculateCalories: (distanceKm: number, avgSpeedKmh: number, riderWeightKg?: number) => number;
/**
 * Calculate estimated duration for a ride
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h (default 25)
 * @returns Duration in minutes
 */
export declare const calculateEstimatedDuration: (distanceKm: number, avgSpeedKmh?: number) => number;
/**
 * Calculate ride difficulty
 * @param distanceKm - Total distance
 * @param elevationGainM - Total elevation gain in meters
 * @param avgSpeedKmh - Average speed
 * @returns 'beginner' | 'intermediate' | 'advanced'
 */
export declare const calculateRideDifficulty: (distanceKm: number, elevationGainM: number, avgSpeedKmh: number) => "beginner" | "intermediate" | "advanced";
/**
 * Format distance for display
 */
export declare const formatDistance: (distanceKm: number) => string;
/**
 * Format duration for display
 */
export declare const formatDuration: (durationSeconds: number) => string;
/**
 * Format speed for display
 */
export declare const formatSpeed: (speedKmh: number) => string;
/**
 * Get difficulty label with emoji
 */
export declare const getDifficultyLabel: (difficulty: string) => string;
//# sourceMappingURL=ride.d.ts.map