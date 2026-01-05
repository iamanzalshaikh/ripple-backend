


import { Response } from 'express';
import { AuthRequest } from '../types/auth.types.js';
import User from '../models/user.model.js';
import SOSLog from '../models/soslog.model.js';
import Ride from '../models/ride.model.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import sosQueue from '../queues/sos.queue.js';
import config from '../config/config.js';


export const triggerSOS = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { lat, lng, rideId, notes } = req.body;
      const userId = req.userId;
  
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location (lat, lng) is required'
        });
      }
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
  
      if (user.emergencyContacts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Add emergency contacts first'
        });
      }
  
      const liveShareToken = crypto.randomBytes(4).toString('hex');
  
      const sosLog = new SOSLog({
        userId,
        rideId: rideId || null,
        triggerType: 'manual',
        triggeredAt: new Date(),
        location: { lat, lng },
        status: 'active',
        liveShareToken,
        notes: notes || null,
        alerts: []
      });
  
      await sosLog.save();
      logger.info(`[SOS] 🚨 SOS triggered by user ${userId} at (${lat}, ${lng})`);
  
      // Enqueue alert job
      await sosQueue.add('send-alerts', {
        sosId: sosLog._id.toString(),
        userId: userId,
        location: { lat, lng },
        contacts: user.emergencyContacts
      });
  
      logger.info(`[SOS] ✅ Alert job enqueued`);
  
      if (rideId) {
        await Ride.findByIdAndUpdate(rideId, {
          emergencySosTriggered: true,
          sosLogId: sosLog._id
        });
      }
  
      // Generate backend URL for live tracking
      // For local dev: use BACKEND_URL env var or default to localhost:PORT
      // For production: set BACKEND_URL to your public backend URL
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.PORT || 3000}`;
      const liveUrl = `${backendUrl}/api/v1/safety/live/${liveShareToken}`;

      return res.status(201).json({
        success: true,
        message: 'SOS triggered successfully',
        data: {
          sosId: sosLog._id.toString(),
          liveUrl: liveUrl,
          contactsAlerted: user.emergencyContacts.length,
          status: 'active',
          triggeredAt: sosLog.triggeredAt
        }
      });
    } catch (error: any) {
      logger.error('Error triggering SOS:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  
export const updateSOSLocation = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;
  
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Location (lat, lng) is required',
        });
      }
  
      const sosLog = await SOSLog.findById(id).populate('userId');
      if (!sosLog) {
        return res.status(404).json({
          success: false,
          message: 'SOS not found',
        });
      }
  
      if (sosLog.userId._id.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      if (sosLog.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'SOS is not active',
        });
      }
  
      // ✅ ADD NEW LOCATION TO HISTORY
      sosLog.locationHistory.push({
        lat,
        lng,
        accuracy: undefined,
        timestamp: new Date(),
      });
  
      // ✅ UPDATE CURRENT LOCATION
      sosLog.location = { lat, lng };
  
      // ✅ UPDATE LAST LOCATION UPDATE TIME
      sosLog.lastLocationUpdate = new Date();
  
      await sosLog.save();
  
      logger.info(
        `[SOS] 📍 Location updated for SOS ${id} - Total updates: ${sosLog.locationHistory.length}`
      );
  
      // ✅ GET USER WITH EMERGENCY CONTACTS
      const user = await User.findById(sosLog.userId);
      if (!user || user.emergencyContacts.length === 0) {
        logger.warn(`[SOS] ⚠️ No emergency contacts found for user ${sosLog.userId}`);
        return res.json({
          success: true,
          message: 'Location updated (no contacts to notify)',
          data: {
            sosId: sosLog._id.toString(),
            currentLocation: sosLog.location,
            locationHistory: sosLog.locationHistory,
            lastLocationUpdate: sosLog.lastLocationUpdate,
            totalLocationUpdates: sosLog.locationHistory.length,
            contactsNotified: 0,
          },
        });
      }
  
      // ✅ OPTION 2: NO EMAIL NOTIFICATIONS FOR UPDATES
      // Emergency contacts already received the initial SOS email with live tracking link
      // They can see real-time updates on the live tracking page (refreshes every 5s)
      logger.info(
        `[SOS] 📍 Location updated - Live tracking page will auto-update (no email sent)`
      );
  
      return res.json({
        success: true,
        message: 'Location updated - visible on live tracking page',
        data: {
          sosId: sosLog._id.toString(),
          currentLocation: sosLog.location,
          locationHistory: sosLog.locationHistory,
          lastLocationUpdate: sosLog.lastLocationUpdate,
          totalLocationUpdates: sosLog.locationHistory.length,
          contactsNotified: 0,
        },
      });
    } catch (error: any) {
      logger.error('Error updating SOS location:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  };


  export const resolveSOSAlert = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
  
      const sosLog = await SOSLog.findById(id);
      if (!sosLog) {
        return res.status(404).json({
          success: false,
          message: 'SOS not found'
        });
      }
  
      if (sosLog.userId.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }
  
      sosLog.status = 'resolved';
      sosLog.resolvedAt = new Date();
      await sosLog.save();
  
      logger.info(`[SOS] ✅ SOS ${id} marked as resolved`);
  
      return res.json({
        success: true,
        message: 'SOS marked as resolved',
        data: {
          sosId: sosLog._id.toString(),
          resolvedAt: sosLog.resolvedAt,
          status: 'resolved'
        }
      });
    } catch (error: any) {
      logger.error('Error resolving SOS alert:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
  
  /**
   * ✅ GET /api/v1/safety/sos-history
   */
  export const getSOSHistory = async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;
  
      const sosLogs = await SOSLog.find({ userId: req.userId })
        .sort({ triggeredAt: -1 })
        .skip(skip)
        .limit(limitNum);
  
      const total = await SOSLog.countDocuments({ userId: req.userId });
  
      res.json({
        success: true,
        data: { sosLogs },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error: any) {
      logger.error('Error getting SOS history:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

export const getLiveSOSTracking = async (
    req: any,
    res: Response
  ): Promise<any> => {
    try {
      const { token } = req.params;
  
      // Check if client wants HTML (from browser) or JSON (from API)
      const acceptHeader = req.get('accept') || '';
      const wantsJson = req.query.json === 'true';
      const wantsHtml = acceptHeader.includes('text/html') && !wantsJson;
  
      const sosLog = await SOSLog.findOne({
        liveShareToken: token,
        $or: [
          { status: 'active' },
          {
            resolvedAt: {
              $gt: new Date(Date.now() - 30 * 60 * 1000)
            }
          }
        ]
      }).populate('userId', 'name avatarUrl phone');
  
      if (!sosLog) {
        if (wantsHtml) {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SOS Session Not Found</title>
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    background: linear-gradient(135deg, #FF2FB9, #4DA3FF); 
                    margin: 0; 
                  }
                  .container { 
                    text-align: center; 
                    background: white; 
                    padding: 40px; 
                    border-radius: 12px; 
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
                    max-width: 400px;
                  }
                  h1 { color: #FF2FB9; margin-bottom: 10px; font-size: 24px; }
                  p { color: #666; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🔍 SOS Session Not Found</h1>
                  <p>This SOS session has been resolved or does not exist.</p>
                  <p style="font-size: 12px; color: #999;">Links expire 30 minutes after resolution.</p>
                </div>
              </body>
            </html>
          `);
        }
  
        return res.status(404).json({
          success: false,
          message: 'Live ride not found or expired'
        });
      }
  
      const ride = sosLog.rideId
        ? await Ride.findById(sosLog.rideId).select(
            'distance duration avgSpeed simplifiedPolyline'
          )
        : null;
  
      // ✅ IF BROWSER REQUEST - SERVE HTML PAGE
      if (wantsHtml) {
        const populatedUser = sosLog.userId as any;
        const riderName = populatedUser.name || 'Unknown';
        const riderPhone = populatedUser.phone;
        const riderAvatar = populatedUser.avatarUrl;
        const lat = sosLog.location.lat;
        const lng = sosLog.location.lng;
        const status = sosLog.status;
        const locationHistoryCount = sosLog.locationHistory.length;
        const locationHistoryJson = JSON.stringify(sosLog.locationHistory.map(loc => ({ lat: loc.lat, lng: loc.lng })));
        const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  
        let historyHtml = '';
        sosLog.locationHistory.slice(-5).reverse().forEach((loc, idx) => {
          const updateNum = sosLog.locationHistory.length - idx;
          const time = new Date(loc.timestamp).toLocaleTimeString();
          historyHtml += `
            <div class="history-item">
              <div><strong>Update #${updateNum}</strong></div>
              <div class="coord-value" style="font-size: 11px;">${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</div>
              <div class="history-time">${time}</div>
            </div>
          `;
        });
  
        const avatarHtml = riderAvatar 
          ? `<img src="${riderAvatar}" alt="${riderName}">`
          : '👤';
  
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>HerRidez Live Tracking - ${riderName}</title>
              
              <!-- Leaflet CSS from cdnjs (more reliable) -->
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" crossorigin="anonymous" />
              
              <!-- Leaflet JS from cdnjs -->
              <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" crossorigin="anonymous"></script>
              
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  background: #1A0826; 
                  color: #333;
                }
                
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                
                .header { 
                  background: linear-gradient(135deg, #FF2FB9, #4DA3FF); 
                  color: white; 
                  padding: 30px; 
                  border-radius: 12px; 
                  margin-bottom: 20px; 
                  text-align: center; 
                }
                .header h1 { font-size: 28px; margin-bottom: 10px; }
                .header p { opacity: 0.9; }
                
                .content { display: grid; grid-template-columns: 1fr 350px; gap: 20px; }
                
                .map-container { 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 2px 20px rgba(0,0,0,0.3); 
                  height: 600px; 
                }
                #map { width: 100%; height: 100%; z-index: 1; }
                
                .sidebar { display: flex; flex-direction: column; gap: 20px; }
                
                .card { 
                  background: rgba(255,255,255,0.95); 
                  padding: 20px; 
                  border-radius: 12px; 
                  box-shadow: 0 2px 20px rgba(0,0,0,0.3); 
                }
                
                .rider-info { display: flex; align-items: center; gap: 15px; }
                .rider-avatar { 
                  width: 70px; 
                  height: 70px; 
                  border-radius: 50%; 
                  background: #FF2FB9; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  color: white; 
                  font-size: 32px; 
                  flex-shrink: 0; 
                  overflow: hidden;
                }
                .rider-avatar img { 
                  width: 100%; 
                  height: 100%; 
                  border-radius: 50%; 
                  object-fit: cover; 
                }
                .rider-details h3 { color: #333; margin-bottom: 5px; font-size: 16px; }
                .rider-details p { color: #666; font-size: 13px; margin: 3px 0; }
                
                .status-badge { 
                  display: inline-block; 
                  background: #10B981; 
                  color: white; 
                  padding: 6px 12px; 
                  border-radius: 20px; 
                  font-weight: bold; 
                  font-size: 11px; 
                  margin-top: 8px; 
                }
                .status-badge::before { content: '🟢'; margin-right: 6px; }
                
                .info-section h4 { 
                  color: #333; 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                  font-weight: 600; 
                  border-bottom: 2px solid #FF2FB9; 
                  padding-bottom: 8px; 
                }
                
                .coord { 
                  color: #666; 
                  font-size: 12px; 
                  padding: 10px 0; 
                  border-bottom: 1px solid #eee; 
                  display: flex; 
                  justify-content: space-between; 
                }
                .coord:last-child { border-bottom: none; }
                .coord-label { color: #999; }
                .coord-value { color: #FF2FB9; font-weight: bold; font-family: monospace; }
                
                .history-item { 
                  padding: 10px; 
                  background: #f9f9f9; 
                  border-radius: 6px; 
                  font-size: 11px; 
                  color: #666; 
                  margin-bottom: 8px; 
                  border-left: 3px solid #FF2FB9; 
                }
                .history-time { color: #999; font-size: 10px; }
                
                .update-indicator { 
                  text-align: center; 
                  padding: 10px; 
                  background: #f0f0f0; 
                  border-radius: 6px; 
                  font-size: 12px; 
                  color: #666; 
                  margin-top: 10px; 
                }
                
                @media (max-width: 768px) {
                  .content { grid-template-columns: 1fr; }
                  .map-container { height: 400px; }
                }
                
                .spinner { 
                  display: inline-block; 
                  width: 16px; 
                  height: 16px; 
                  border: 2px solid #f3f3f3; 
                  border-top: 2px solid #FF2FB9; 
                  border-radius: 50%; 
                  animation: spin 1s linear infinite; 
                  margin-right: 8px;
                }
                @keyframes spin { 
                  0% { transform: rotate(0deg); } 
                  100% { transform: rotate(360deg); } 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚨 HerRidez Live Tracking</h1>
                  <p>Real-time location tracking for emergency response</p>
                </div>
  
                <div class="content">
                  <div class="map-container">
                    <div id="map"></div>
                  </div>
  
                  <div class="sidebar">
                    <div class="card">
                      <div class="rider-info">
                        <div class="rider-avatar">
                          ${avatarHtml}
                        </div>
                        <div class="rider-details">
                          <h3>${riderName}</h3>
                          <p>📞 ${riderPhone}</p>
                          <span class="status-badge">${status === 'active' ? 'Active' : 'Resolved'}</span>
                        </div>
                      </div>
                    </div>
  
                    <div class="card">
                      <div class="info-section">
                        <h4>📍 Current Location</h4>
                        <div class="coord">
                          <span class="coord-label">Latitude</span>
                          <span class="coord-value">${lat.toFixed(6)}</span>
                        </div>
                        <div class="coord">
                          <span class="coord-label">Longitude</span>
                          <span class="coord-value">${lng.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
  
                    <div class="card">
                      <div class="info-section">
                        <h4>📍 Recent Updates (${locationHistoryCount})</h4>
                        ${historyHtml}
                      </div>
                    </div>
  
                    <div class="update-indicator">
                      <span class="spinner"></span>Updates every 5s
                    </div>
                  </div>
                </div>
              </div>
  
              <script>
                let map;
                let marker;
                let polyline;
                const token = '${token}';
                const apiUrl = '/api/v1/safety/live/' + token + '?json=true';
                const initialPathCoords = ${locationHistoryJson};
  
                function initMap() {
                  const initialLocation = [${lat}, ${lng}];
  
                  // Initialize Leaflet map with OpenStreetMap tiles
                  map = L.map('map').setView(initialLocation, 16);
  
                  // Add OpenStreetMap tile layer (100% FREE!)
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                  }).addTo(map);
  
                  // Custom red marker icon
                  const redIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  });
  
                  // Add marker
                  marker = L.marker(initialLocation, { icon: redIcon })
                    .addTo(map)
                    .bindPopup('Current Location');
  
                  // Add polyline for path
                  const pathLatLngs = initialPathCoords.map(coord => [coord.lat, coord.lng]);
                  polyline = L.polyline(pathLatLngs, {
                    color: '#FF2FB9',
                    weight: 3,
                    opacity: 0.7
                  }).addTo(map);
  
                  // Fit bounds if there's a path
                  if (pathLatLngs.length > 0) {
                    map.fitBounds(polyline.getBounds());
                  }
                }
  
                let updateInterval = null;

                async function updateLocation() {
                  // Don't update if map/marker not initialized yet
                  if (!map || !marker) {
                    console.log('Map not ready, skipping update');
                    return;
                  }

                  try {
                    const response = await fetch(apiUrl);
                    const result = await response.json();

                    if (result.success && result.data) {
                      const currentLocation = result.data.location;
                      const locationHistory = result.data.locationHistory || [];

                      if (currentLocation) {
                        const newLatLng = [currentLocation.lat, currentLocation.lng];
                        
                        // Update marker position
                        marker.setLatLng(newLatLng);
                        
                        // Center map on new location (smooth pan)
                        map.panTo(newLatLng);
                      }

                      if (locationHistory && locationHistory.length > 0 && polyline) {
                        // Update polyline path
                        const pathLatLngs = locationHistory.map(loc => [loc.lat, loc.lng]);
                        polyline.setLatLngs(pathLatLngs);
                        
                        // Fit bounds to show entire path
                        if (pathLatLngs.length > 1) {
                          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                        }
                      }
                    }
                  } catch (error) {
                    console.error('Error updating location:', error);
                  }
                }

                // Initialize map when page loads
                window.addEventListener('load', function() {
                  initMap();
                  
                  // Start update interval AFTER map is initialized (wait 1 second to be safe)
                  setTimeout(function() {
                    // Update immediately
                    updateLocation();
                    
                    // Then update every 5 seconds
                    updateInterval = setInterval(updateLocation, 5000);
                  }, 1000);
                });
              </script>
            </body>
          </html>
        `;
  
        return res.send(html);
      }
  
      // ✅ IF API REQUEST - RETURN JSON
      const populatedUser = sosLog.userId as any;
      return res.json({
        success: true,
        data: {
          sosId: sosLog._id.toString(),
          riderName: populatedUser?.name || 'Anonymous',
          riderAvatar: populatedUser?.avatarUrl,
          status: sosLog.status,
          triggeredAt: sosLog.triggeredAt,
          resolvedAt: sosLog.resolvedAt,
          location: sosLog.location,
          locationHistory: sosLog.locationHistory,
          ride: ride
            ? {
                distance: ride.distance,
                duration: ride.duration,
                avgSpeed: ride.avgSpeed,
                polyline: ride.simplifiedPolyline
              }
            : null,
          updatedAt: sosLog.updatedAt
        }
      });
    } catch (error: any) {
      logger.error('Error getting live SOS tracking:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };