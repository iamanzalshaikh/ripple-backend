// // ==================== utils/ride.utils.ts ====================

// /**
//  * Calculate distance between array of points using Haversine formula
//  * @param points Array of {lat, lng}
//  * @returns Distance in kilometers
//  */
// export const calculateDistance = (points: Array<{ lat: number; lng: number }>): number => {
//     if (points.length < 2) return 0;
  
//     const R = 6371; // Earth's radius in km
//     let totalDistance = 0;
  
//     for (let i = 0; i < points.length - 1; i++) {
//       const lat1 = (points[i].lat * Math.PI) / 180;
//       const lat2 = (points[i + 1].lat * Math.PI) / 180;
//       const deltaLat = ((points[i + 1].lat - points[i].lat) * Math.PI) / 180;
//       const deltaLng = ((points[i + 1].lng - points[i].lng) * Math.PI) / 180;
  
//       const a =
//         Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
//         Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       totalDistance += R * c;
//     }
  
//     return totalDistance;
//   };
  
//   /**
//    * Simplify polyline using Ramer-Douglas-Peucker algorithm
//    * @param points Array of {lat, lng}
//    * @param epsilon Tolerance (0.0001 ≈ 11 meters at equator)
//    * @returns Simplified polyline
//    * 
//    * Example:
//    * 100 GPS points → 15 simplified points
//    */
//   export const simplifyPolyline = (
//     points: Array<{ lat: number; lng: number }>,
//     epsilon: number = 0.0001
//   ): Array<{ lat: number; lng: number }> => {
//     if (points.length <= 2) return points;
  
//     /**
//      * Calculate perpendicular distance from point to line
//      */
//     const getDistance = (point: any, lineStart: any, lineEnd: any): number => {
//       const x = point.lng;
//       const y = point.lat;
//       const x1 = lineStart.lng;
//       const y1 = lineStart.lat;
//       const x2 = lineEnd.lng;
//       const y2 = lineEnd.lat;
  
//       const A = x - x1;
//       const B = y - y1;
//       const C = x2 - x1;
//       const D = y2 - y1;
  
//       const dot = A * C + B * D;
//       const lenSq = C * C + D * D;
//       let param = -1;
  
//       if (lenSq !== 0) param = dot / lenSq;
  
//       let xx, yy;
//       if (param < 0) {
//         xx = x1;
//         yy = y1;
//       } else if (param > 1) {
//         xx = x2;
//         yy = y2;
//       } else {
//         xx = x1 + param * C;
//         yy = y1 + param * D;
//       }
  
//       const dx = x - xx;
//       const dy = y - yy;
//       return Math.sqrt(dx * dx + dy * dy);
//     };
  
//     /**
//      * Recursive Douglas-Peucker simplification
//      */
//     const douglasPeucker = (pts: any[], eps: number): any[] => {
//       let maxDist = 0;
//       let maxIndex = 0;
  
//       for (let i = 1; i < pts.length - 1; i++) {
//         const dist = getDistance(pts[i], pts[0], pts[pts.length - 1]);
//         if (dist > maxDist) {
//           maxDist = dist;
//           maxIndex = i;
//         }
//       }
  
//       if (maxDist > eps) {
//         const left = douglasPeucker(pts.slice(0, maxIndex + 1), eps);
//         const right = douglasPeucker(pts.slice(maxIndex), eps);
//         return left.slice(0, -1).concat(right);
//       } else {
//         return [pts[0], pts[pts.length - 1]];
//       }
//     };
  
//     return douglasPeucker(points, epsilon);
//   };
  
//   /**
//    * Calculate ride statistics
//    * @param points Array of GPS points
//    * @returns Object with distance, duration, avgSpeed, maxSpeed
//    */
//   export const calculateStats = (points: any[]) => {
//     if (points.length === 0) {
//       return { distance: 0, duration: 0, avgSpeed: 0, maxSpeed: 0 };
//     }
  
//     const polyline = points.map((p: any) => ({ lat: p.lat, lng: p.lng }));
//     const distance = calculateDistance(polyline);
//     const duration = Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000);
//     const speeds = points.map((p: any) => p.speed * 3.6); // m/s to km/h
//     const maxSpeed = Math.max(...speeds);
//     const avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;
  
//     return {
//       distance: parseFloat(distance.toFixed(2)),
//       duration,
//       avgSpeed: parseFloat(avgSpeed.toFixed(2)),
//       maxSpeed: parseFloat(maxSpeed.toFixed(2))
//     };
//   };
  
//   /**
//    * Get elevation gain (approximation using lat/lng)
//    * For accurate elevation, use external API like Google Elevation
//    * @param points Array of GPS points
//    * @returns Elevation gain in meters
//    */
//   export const estimateElevationGain = (points: any[]): number => {
//     // Simplified: use lat as proxy (real implementation needs elevation data)
//     let gain = 0;
//     for (let i = 1; i < points.length; i++) {
//       const latDiff = points[i].lat - points[i - 1].lat;
//       if (latDiff > 0) {
//         gain += latDiff * 111000; // 1 degree ≈ 111km
//       }
//     }
//     return Math.round(gain);
//   };

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
export const calculateDistance = (points: Array<{ lat: number; lng: number }>): number => {
  if (points.length < 2) return 0;

  const R = 6371; // Earth's radius in km
  let totalDistance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const lat1 = (points[i].lat * Math.PI) / 180;
    const lat2 = (points[i + 1].lat * Math.PI) / 180;
    const deltaLat = ((points[i + 1].lat - points[i].lat) * Math.PI) / 180;
    const deltaLng = ((points[i + 1].lng - points[i].lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
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
 */
export const simplifyPolyline = (
  points: Array<{ lat: number; lng: number }>,
  epsilon: number = 0.0001
): Array<{ lat: number; lng: number }> => {
  if (points.length <= 2) return points;

  const getDistance = (point: any, lineStart: any, lineEnd: any): number => {
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

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const douglasPeucker = (pts: any[], eps: number): any[] => {
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
    } else {
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
export const calculateStats = (points: any[]) => {
  if (points.length === 0) {
    return { distance: 0, duration: 0, avgSpeed: 0, maxSpeed: 0 };
  }

  const polyline = points.map((p: any) => ({ lat: p.lat, lng: p.lng }));
  const distance = calculateDistance(polyline);
  const duration = Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000);
  const speeds = points.map((p: any) => p.speed * 3.6); // m/s to km/h
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;

  return {
    distance: parseFloat(distance.toFixed(2)),
    duration,
    avgSpeed: parseFloat(avgSpeed.toFixed(2)),
    maxSpeed: parseFloat(maxSpeed.toFixed(2))
  };
};

/**
 * Get elevation gain (approximation using lat/lng)
 * @param points Array of GPS points
 * @returns Elevation gain in meters
 */
export const estimateElevationGain = (points: any[]): number => {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const latDiff = points[i].lat - points[i - 1].lat;
    if (latDiff > 0) {
      gain += latDiff * 111000; // 1 degree ≈ 111km
    }
  }
  return Math.round(gain);
};

// ==================== NEW FORMATTING HELPERS (ADD THESE) ====================

/**
 * Calculate average speed from distance and duration
 * @param distanceKm - Distance in kilometers
 * @param durationSeconds - Duration in seconds
 * @returns Average speed in km/h
 */
export const calculateAvgSpeed = (distanceKm: number, durationSeconds: number): number => {
  if (durationSeconds === 0) return 0;
  const durationHours = durationSeconds / 3600;
  return parseFloat((distanceKm / durationHours).toFixed(2));
};

/**
 * Calculate calories burned based on MET (Metabolic Equivalent)
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h
 * @param riderWeightKg - Rider weight (default 65kg)
 * @returns Estimated calories burned
 */
export const calculateCalories = (
  distanceKm: number,
  avgSpeedKmh: number,
  riderWeightKg: number = 65
): number => {
  if (distanceKm === 0 || avgSpeedKmh === 0) return 0;

  let met = 4;
  if (avgSpeedKmh < 10) met = 3.5;
  else if (avgSpeedKmh < 15) met = 4;
  else if (avgSpeedKmh < 20) met = 6;
  else if (avgSpeedKmh < 25) met = 8;
  else if (avgSpeedKmh < 30) met = 10;
  else if (avgSpeedKmh < 35) met = 12;
  else met = 15;

  const durationHours = distanceKm / avgSpeedKmh;
  return Math.round(met * riderWeightKg * durationHours);
};

/**
 * Calculate estimated duration for a ride
 * @param distanceKm - Distance in kilometers
 * @param avgSpeedKmh - Average speed in km/h (default 25)
 * @returns Duration in minutes
 */
export const calculateEstimatedDuration = (
  distanceKm: number,
  avgSpeedKmh: number = 25
): number => {
  if (avgSpeedKmh === 0) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * Calculate ride difficulty
 * @param distanceKm - Total distance
 * @param elevationGainM - Total elevation gain in meters
 * @param avgSpeedKmh - Average speed
 * @returns 'beginner' | 'intermediate' | 'advanced'
 */
export const calculateRideDifficulty = (
  distanceKm: number,
  elevationGainM: number,
  avgSpeedKmh: number
): 'beginner' | 'intermediate' | 'advanced' => {
  let score = 0;

  if (distanceKm < 20) score += 10;
  else if (distanceKm < 50) score += 20;
  else if (distanceKm < 100) score += 30;
  else score += 40;

  if (elevationGainM < 200) score += 10;
  else if (elevationGainM < 500) score += 20;
  else if (elevationGainM < 1000) score += 30;
  else score += 40;

  if (avgSpeedKmh < 15) score += 5;
  else if (avgSpeedKmh < 20) score += 10;
  else if (avgSpeedKmh < 25) score += 15;
  else score += 20;

  if (score < 30) return 'beginner';
  if (score < 70) return 'intermediate';
  return 'advanced';
};

// ==================== FORMATTING HELPERS ====================

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Format duration for display
 */
export const formatDuration = (durationSeconds: number): string => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

/**
 * Format speed for display
 */
export const formatSpeed = (speedKmh: number): string => {
  return `${speedKmh.toFixed(1)} km/h`;
};

/**
 * Get difficulty label with emoji
 */
export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'beginner':
      return '🟢 Beginner';
    case 'intermediate':
      return '🟡 Intermediate';
    case 'advanced':
      return '🔴 Advanced';
    default:
      return difficulty;
  }
};