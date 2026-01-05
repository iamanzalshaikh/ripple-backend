import RideEvent from '../models/rideEvent.model';
import RideEventParticipant from '../models/rideEventParticipant.model';
import ChatMessage from '../models/chatMessage.model';
import User from '../models/user.model';
import redisClient from '../config/redis';
import logger from '../config/logger';
import rideEventQueue from '../queues/rideEvent.queue';
import { calculateDistance, simplifyPolyline, calculateStats, estimateElevationGain, calculateEstimatedDuration, formatDistance, formatDuration, formatSpeed, calculateRideDifficulty, getDifficultyLabel } from '../utils/ride';
export const createRideEvent = (req, res) => {
    (async () => {
        try {
            const { title, description, route, scheduledAt, rules, minRidingHours, bikeTypes, maxParticipants, timezone, eventType = 'ride', privacy = 'public' } = req.body;
            const organizerId = req.userId;
            logger.info(`[createRideEvent] User ${organizerId} creating: ${title}`);
            // Validation
            if (!title || !route || !scheduledAt) {
                return res.status(400).json({
                    success: false,
                    error: 'Title, route, and scheduledAt required'
                });
            }
            if (!route.polyline || route.polyline.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Route must have at least 2 points'
                });
            }
            // Check organizer eligibility
            const organizer = await User.findById(organizerId);
            if (!organizer) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            if (!organizer.verified) {
                return res.status(403).json({ success: false, error: 'Must be verified to organize' });
            }
            if (organizer.ridingHours < 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Need 0+ riding hours to organize'
                });
            }
            // ==================== CALCULATE DISTANCE & STATS USING YOUR UTILS ====================
            const totalDistance = calculateDistance(route.polyline);
            const elevation = estimateElevationGain(route.polyline);
            const estimatedDuration = calculateEstimatedDuration(totalDistance, 25);
            const difficulty = calculateRideDifficulty(totalDistance, elevation, 25);
            // Simplify polyline for storage (reduces data by ~80%)
            const simplifiedPolyline = simplifyPolyline(route.polyline, 0.0001);
            // Create ride event
            const rideEvent = new RideEvent({
                title,
                description,
                organizerId,
                route: {
                    startPoint: route.startPoint,
                    endPoint: route.endPoint,
                    waypoints: route.waypoints || [],
                    polyline: simplifiedPolyline, // Use simplified polyline
                    distance: totalDistance,
                    estimatedDuration,
                    elevation,
                    difficulty
                },
                scheduledAt: new Date(scheduledAt),
                rules: rules || ['Helmet mandatory'],
                minRidingHours: minRidingHours || 0,
                bikeTypes: bikeTypes || [],
                maxParticipants: maxParticipants || 50,
                timezone: timezone || 'Asia/Kolkata',
                eventType,
                privacy,
                status: 'scheduled', // ✅ CHANGED: Auto-scheduled instead of draft
                safetyLevel: 'high',
                chatRoomId: `event-${Date.now()}`,
                participants: [
                    {
                        userId: organizerId,
                        status: 'joined',
                        joinedAt: new Date()
                    }
                ]
            });
            await rideEvent.save();
            logger.info(`[createRideEvent] Ride ${rideEvent._id} created and SCHEDULED - Distance: ${totalDistance.toFixed(2)}km, Elevation: ${elevation}m`);
            return res.status(201).json({
                success: true,
                data: {
                    rideEventId: rideEvent._id,
                    title: rideEvent.title,
                    distance: formatDistance(totalDistance),
                    duration: formatDuration(estimatedDuration * 60), // convert to seconds
                    elevation: `${elevation}m`,
                    difficulty: getDifficultyLabel(difficulty),
                    eventType,
                    privacy,
                    status: rideEvent.status // ✅ Will show "scheduled"
                }
            });
        }
        catch (error) {
            logger.error(`[createRideEvent] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/ride-events
 * List nearby group rides
 */
export const listRideEvents = (req, res) => {
    (async () => {
        try {
            const { lat, lng, radius = 50, difficulty, status = 'scheduled', page = 1, limit = 10 } = req.query;
            let query = { status };
            if (lat && lng) {
                const latNum = parseFloat(lat);
                const lngNum = parseFloat(lng);
                const radiusMeters = parseInt(radius) * 1000;
                query['route.startPoint'] = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
                        $maxDistance: radiusMeters
                    }
                };
            }
            if (difficulty) {
                query['route.difficulty'] = difficulty;
            }
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(50, parseInt(limit) || 10);
            const skip = (pageNum - 1) * limitNum;
            const rides = await RideEvent.find(query)
                .populate('organizerId', 'name avatarUrl verified ridingHours')
                .sort({ scheduledAt: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
            const total = await RideEvent.countDocuments(query);
            const enriched = rides.map((ride) => ({
                ...ride,
                participantCount: ride.participants.length,
                spotsAvailable: ride.maxParticipants - ride.participants.length
            }));
            logger.info(`[listRideEvents] Retrieved ${rides.length} rides`);
            return res.json({
                success: true,
                data: enriched,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            logger.error(`[listRideEvents] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/ride-events/:id
 * Get ride detail
 */
export const getRideEventDetail = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const ride = await RideEvent.findById(id)
                .populate('organizerId', 'name avatarUrl verified ridingHours')
                .populate('participants.userId', 'name avatarUrl')
                .lean();
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            const isOrganizer = ride.organizerId._id.toString() === userId;
            const isParticipant = ride.participants.some((p) => p.userId._id.toString() === userId);
            return res.json({
                success: true,
                data: {
                    ...ride,
                    participantCount: ride.participants.length,
                    spotsAvailable: ride.maxParticipants - ride.participants.length,
                    isOrganizer,
                    isParticipant,
                    canJoin: ride.status === 'scheduled' &&
                        ride.participants.length < ride.maxParticipants &&
                        !isParticipant
                }
            });
        }
        catch (error) {
            logger.error(`[getRideEventDetail] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * POST /api/v1/ride-events/:id/rsvp
 * Join a group ride
 */
export const rsvpRideEvent = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { bikeId } = req.body;
            logger.info(`[rsvpRideEvent] User ${userId} RSVP to ${id}`);
            if (!bikeId) {
                return res.status(400).json({ success: false, error: 'bikeId required' });
            }
            const ride = await RideEvent.findById(id);
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            if (!user.verified) {
                return res.status(403).json({ success: false, error: 'Must be verified' });
            }
            if (user.ridingHours < ride.minRidingHours) {
                return res.status(403).json({
                    success: false,
                    error: `Need ${ride.minRidingHours}+ hours. You have ${user.ridingHours}`
                });
            }
            const alreadyJoined = ride.participants.some((p) => p.userId.toString() === userId);
            if (alreadyJoined) {
                return res.status(400).json({ success: false, error: 'Already joined' });
            }
            if (ride.participants.length >= ride.maxParticipants) {
                return res.status(400).json({ success: false, error: 'Ride is full' });
            }
            ride.participants.push({
                userId: userId,
                status: 'rsvp',
                joinedAt: new Date(),
                bikeId: bikeId
            });
            await ride.save();
            // Create participant record
            await RideEventParticipant.create({
                rideEventId: id,
                userId,
                bikeId,
                finishedRide: false,
                crashDetected: false,
                sosTriggered: false
            });
            // Update Redis
            await redisClient.setEx(`ride-event-${id}:participants`, 3600, JSON.stringify(ride.participants));
            logger.info(`[rsvpRideEvent] RSVP successful for ride ${id}`);
            return res.json({
                success: true,
                data: {
                    rideEventId: ride._id,
                    status: 'rsvp',
                    message: 'RSVP successful!'
                }
            });
        }
        catch (error) {
            logger.error(`[rsvpRideEvent] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * POST /api/v1/ride-events/:id/start
 * Start group ride (Organizer only)
 */
export const startRideEvent = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const organizerId = req.userId;
            logger.info(`[startRideEvent] Starting ride ${id}`);
            const ride = await RideEvent.findById(id);
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            if (ride.organizerId.toString() !== organizerId) {
                return res.status(403).json({ success: false, error: 'Only organizer can start' });
            }
            ride.status = 'live';
            ride.liveStartedAt = new Date();
            ride.participants = ride.participants.map((p) => ({
                ...p,
                status: 'joined'
            }));
            await ride.save();
            // Initialize Redis storage
            await redisClient.setEx(`ride-event-${id}:locations`, 86400, JSON.stringify({}));
            await redisClient.setEx(`ride-event-${id}:stats`, 86400, JSON.stringify({
                startedAt: ride.liveStartedAt,
                totalDistance: 0,
                avgGroupSpeed: 0,
                maxSpeed: 0
            }));
            logger.info(`[startRideEvent] Ride ${id} is LIVE`);
            return res.json({
                success: true,
                data: {
                    rideEventId: ride._id,
                    status: 'live',
                    startedAt: ride.liveStartedAt
                }
            });
        }
        catch (error) {
            logger.error(`[startRideEvent] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
    ;
};
export const streamRideEventLocation = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { chunk } = req.body;
            if (!Array.isArray(chunk) || chunk.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid chunk' });
            }
            const ride = await RideEvent.findOne({ _id: id, status: 'live' });
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not live' });
            }
            const isParticipant = ride.participants.some((p) => p.userId.toString() === userId);
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Not a participant' });
            }
            // Store current location
            const lastPoint = chunk[chunk.length - 1];
            const userLocation = {
                userId,
                lat: lastPoint.lat,
                lng: lastPoint.lng,
                speed: lastPoint.speed || 0,
                timestamp: lastPoint.timestamp || Date.now()
            };
            const locationsKey = `ride-event-${id}:locations`;
            const locations = await redisClient.get(locationsKey);
            const locationData = locations ? JSON.parse(locations) : {};
            locationData[userId] = userLocation;
            await redisClient.setEx(locationsKey, 86400, JSON.stringify(locationData));
            // ==================== CALCULATE DISTANCE USING YOUR UTILS ====================
            const statsKey = `ride-event-${id}:user-${userId}:stats`;
            const existingStats = await redisClient.get(statsKey);
            const userStats = existingStats ? JSON.parse(existingStats) : {
                points: [],
                speeds: [],
                totalDistance: 0,
                maxSpeed: 0,
                avgSpeed: 0
            };
            // Add new points to tracking
            chunk.forEach((point) => {
                userStats.points.push({
                    lat: point.lat,
                    lng: point.lng,
                    timestamp: point.timestamp,
                    speed: point.speed || 0
                });
                if (point.speed) {
                    userStats.speeds.push(point.speed);
                }
            });
            // ==================== CALCULATE STATS USING YOUR calculateStats ====================
            if (userStats.points.length >= 2) {
                const stats = calculateStats(userStats.points);
                userStats.totalDistance = stats.distance;
                userStats.maxSpeed = stats.maxSpeed;
                userStats.avgSpeed = stats.avgSpeed;
            }
            await redisClient.setEx(statsKey, 86400, JSON.stringify(userStats));
            logger.info(`[streamRideEventLocation] User ${userId} - Distance: ${userStats.totalDistance.toFixed(2)}km, Avg Speed: ${userStats.avgSpeed.toFixed(2)} km/h, Max Speed: ${userStats.maxSpeed.toFixed(2)} km/h`);
            return res.json({
                success: true,
                data: {
                    pointsReceived: chunk.length,
                    totalDistance: formatDistance(userStats.totalDistance),
                    avgSpeed: formatSpeed(userStats.avgSpeed),
                    maxSpeed: formatSpeed(userStats.maxSpeed),
                    stored: true
                }
            });
        }
        catch (error) {
            logger.error(`[streamRideEventLocation] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
export const getRideEventLive = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const ride = await RideEvent.findById(id).lean();
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            const locationsKey = `ride-event-${id}:locations`;
            const locationsData = await redisClient.get(locationsKey);
            const locations = locationsData ? JSON.parse(locationsData) : {};
            // Get all participant stats
            const participants = await Promise.all(ride.participants.map(async (p) => {
                const statsKey = `ride-event-${id}:user-${p.userId}:stats`;
                const statsData = await redisClient.get(statsKey);
                const stats = statsData ? JSON.parse(statsData) : { totalDistance: 0, avgSpeed: 0, maxSpeed: 0 };
                return {
                    userId: p.userId,
                    status: p.status,
                    distance: formatDistance(stats.totalDistance),
                    avgSpeed: formatSpeed(stats.avgSpeed),
                    maxSpeed: formatSpeed(stats.maxSpeed)
                };
            }));
            const messages = await ChatMessage.find({ rideEventId: id })
                .populate('senderId', 'name avatarUrl')
                .sort({ timestamp: -1 })
                .limit(20)
                .lean();
            logger.info(`[getRideEventLive] Fetched live data for ride ${id}`);
            return res.json({
                success: true,
                data: {
                    rideEventId: ride._id,
                    title: ride.title,
                    status: ride.status,
                    eventType: ride.eventType || 'group_ride',
                    totalDistance: formatDistance(ride.route.distance),
                    estimatedDuration: formatDuration(ride.route.estimatedDuration * 60),
                    difficulty: getDifficultyLabel(ride.route.difficulty),
                    participantCount: ride.participants.length,
                    participantStats: participants,
                    locations: Object.values(locations),
                    messages: messages.reverse(),
                    liveStartedAt: ride.liveStartedAt
                }
            });
        }
        catch (error) {
            logger.error(`[getRideEventLive] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/ride-events/:id/summary
 * Get completed ride summary with all stats
 */
export const getRideEventSummary = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const ride = await RideEvent.findById(id).populate('organizerId', 'name avatarUrl').lean();
            if (!ride || ride.status !== 'completed') {
                return res.status(404).json({ success: false, error: 'Ride not completed' });
            }
            const participantStats = await RideEventParticipant.find({ rideEventId: id }).lean();
            const finishedCount = participantStats.filter((p) => p.finishedRide).length;
            const avgSpeed = participantStats.reduce((sum, p) => sum + (p.avgSpeed || 0), 0) /
                participantStats.length || 0;
            const maxSpeed = Math.max(...participantStats.map((p) => p.maxSpeed || 0), 0);
            const totalElevation = participantStats.reduce((sum, p) => sum + (p.elevation || 0), 0) /
                participantStats.length || 0;
            const userStats = participantStats.find((p) => p.userId.toString() === userId);
            logger.info(`[getRideEventSummary] Summary for ride ${id}`);
            return res.json({
                success: true,
                data: {
                    ride: {
                        title: ride.title,
                        distance: formatDistance(ride.route.distance),
                        duration: formatDuration(ride.route.estimatedDuration * 60),
                        elevation: `${ride.route.elevation}m`,
                        difficulty: getDifficultyLabel(ride.route.difficulty),
                        participants: ride.participants.length,
                        finished: finishedCount,
                        organizer: ride.organizerId
                    },
                    groupStats: {
                        avgDistance: formatDistance(participantStats.reduce((sum, p) => sum + (p.distance || 0), 0) /
                            participantStats.length || 0),
                        avgSpeed: formatSpeed(avgSpeed),
                        maxSpeed: formatSpeed(maxSpeed),
                        avgElevation: `${Math.round(totalElevation)}m`
                    },
                    yourStats: userStats
                        ? {
                            distance: formatDistance(userStats.distance ?? 0),
                            duration: formatDuration(userStats.duration ?? 0),
                            avgSpeed: formatSpeed(userStats.avgSpeed ?? 0),
                            maxSpeed: formatSpeed(userStats.maxSpeed ?? 0),
                            elevation: `${userStats.elevation ?? 0}m`,
                            calories: `${userStats.calories ?? 0}`,
                            completed: userStats.finishedRide,
                            rating: userStats.riderRating || null
                        }
                        : null,
                    badges: ride.badgeRewards || []
                }
            });
        }
        catch (error) {
            logger.error(`[getRideEventSummary] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * POST /api/v1/ride-events/:id/end
 * End group ride (Organizer only)
 */
export const endRideEvent = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const organizerId = req.userId;
            logger.info(`[endRideEvent] Ending ride ${id}`);
            const ride = await RideEvent.findById(id);
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            if (ride.organizerId.toString() !== organizerId) {
                return res.status(403).json({ success: false, error: 'Only organizer can end' });
            }
            ride.status = 'completed';
            ride.liveEndedAt = new Date();
            await ride.save();
            // Queue background job
            await rideEventQueue.add('process-group-ride', { rideEventId: ride._id }, { priority: 1 });
            // Cleanup Redis
            await redisClient.del(`ride-event-${id}:locations`);
            await redisClient.del(`ride-event-${id}:stats`);
            await redisClient.del(`ride-event-${id}:participants`);
            logger.info(`[endRideEvent] Ride ${id} completed`);
            return res.json({
                success: true,
                data: {
                    rideEventId: ride._id,
                    status: 'completed',
                    endedAt: ride.liveEndedAt
                }
            });
        }
        catch (error) {
            logger.error(`[endRideEvent] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * POST /api/v1/ride-events/:id/rate/:targetUserId
 * Rate another rider
 */
export const rateRider = (req, res) => {
    (async () => {
        try {
            const { id, targetUserId } = req.params;
            const userId = req.userId;
            const { rating, feedback } = req.body;
            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
            }
            await RideEventParticipant.updateOne({ rideEventId: id, userId: targetUserId }, {
                riderRating: rating,
                feedback,
                ratedBy: userId,
                ratedAt: new Date()
            });
            logger.info(`[rateRider] ${userId} rated ${targetUserId}`);
            return res.json({
                success: true,
                data: { message: 'Rating saved' }
            });
        }
        catch (error) {
            logger.error(`[rateRider] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
export const sendChatMessage = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { text } = req.body;
            if (!text || text.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'Message cannot be empty' });
            }
            if (text.length > 500) {
                return res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
            }
            const ride = await RideEvent.findById(id);
            if (!ride) {
                return res.status(404).json({ success: false, error: 'Ride not found' });
            }
            const isParticipant = ride.participants.some((p) => p.userId.toString() === userId);
            if (!isParticipant) {
                return res.status(403).json({ success: false, error: 'Not a participant' });
            }
            const sender = await User.findById(userId).select('name avatarUrl').lean();
            const message = await ChatMessage.create({
                rideEventId: id,
                roomType: 'event',
                senderId: userId,
                text: text.trim(),
                timestamp: new Date()
            });
            logger.info(`[sendChatMessage] Message sent in ride ${id}`);
            return res.status(201).json({
                success: true,
                data: {
                    _id: message._id,
                    rideEventId: message.rideEventId,
                    senderId: userId,
                    senderName: sender?.name,
                    senderAvatar: sender?.avatarUrl,
                    text: message.text,
                    timestamp: message.timestamp
                }
            });
        }
        catch (error) {
            logger.error(`[sendChatMessage] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/ride-events/:id/chat
 * Get chat messages (COMPLETE)
 */
export const getChatMessages = (req, res) => {
    (async () => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, parseInt(limit) || 50);
            const skip = (pageNum - 1) * limitNum;
            const messages = await ChatMessage.find({ rideEventId: id })
                .populate('senderId', 'name avatarUrl')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
            const total = await ChatMessage.countDocuments({ rideEventId: id });
            logger.info(`[getChatMessages] Retrieved messages for ride ${id}`);
            return res.json({
                success: true,
                data: messages.reverse(),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            logger.error(`[getChatMessages] Error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
    })();
};
//# sourceMappingURL=rideEvent.controller.js.map