// ============================================
// File: routes/public.routes.ts (NEW FILE)
// ============================================
import { Router } from 'express';
import SOSLog from '../models/soslog.model.js';
import logger from '../config/logger.js';
const router = Router();
/**
 * ✅ GET /live/:token
 * PUBLIC endpoint - serves HTML live tracking page
 * NO authentication required
 */
router.get('/live/:token', async (req, res) => {
    try {
        const { token } = req.params;
        // Verify SOS exists and is active or recently resolved
        const sosLog = await SOSLog.findOne({
            liveShareToken: token,
            $or: [
                { status: 'active' },
                {
                    resolvedAt: {
                        $gt: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
                    }
                }
            ]
        }).populate('userId', 'name avatarUrl phone');
        if (!sosLog) {
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
        logger.info(`[LIVE TRACKING] Serving live tracking page for SOS ${sosLog._id}`);
        const populatedUser = sosLog.userId;
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
          <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}"></script>
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
            #map { width: 100%; height: 100%; }
            
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
            const apiUrl = '/api/v1/safety/live/' + token;
            const initialPathCoords = ${locationHistoryJson};

            function initMap() {
              const initialLocation = {
                lat: ${lat},
                lng: ${lng}
              };

              map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: initialLocation,
                mapTypeId: 'roadmap'
              });

              marker = new google.maps.Marker({
                position: initialLocation,
                map: map,
                title: 'Current Location',
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              });

              polyline = new google.maps.Polyline({
                path: initialPathCoords,
                geodesic: true,
                strokeColor: '#FF2FB9',
                strokeOpacity: 0.7,
                strokeWeight: 3,
                map: map
              });

              if (initialPathCoords.length > 0) {
                const bounds = new google.maps.LatLngBounds();
                initialPathCoords.forEach(point => bounds.extend(point));
                map.fitBounds(bounds);
              }
            }

            async function updateLocation() {
              try {
                const response = await fetch(apiUrl);
                const result = await response.json();

                if (result.success && result.data) {
                  const currentLocation = result.data.currentLocation;
                  const locationHistory = result.data.locationHistory;

                  marker.setPosition({
                    lat: currentLocation.lat,
                    lng: currentLocation.lng
                  });

                  const path = locationHistory.map(loc => ({
                    lat: loc.lat,
                    lng: loc.lng
                  }));
                  polyline.setPath(path);

                  map.setCenter({
                    lat: currentLocation.lat,
                    lng: currentLocation.lng
                  });
                }
              } catch (error) {
                console.error('Error updating location:', error);
              }
            }

            window.addEventListener('load', initMap);
            setInterval(updateLocation, 5000);
          </script>
        </body>
      </html>
    `;
        return res.send(html);
    }
    catch (error) {
        logger.error('Error serving live tracking page:', error.message);
        return res.status(500).send('Error loading live tracking page');
    }
});
export default router;
//# sourceMappingURL=public.routes.js.map