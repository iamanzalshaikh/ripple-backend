import nodemailer from "nodemailer";
import config from "../config/config.js";
import logger from "../config/logger.js";
const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: Number(config.SMTP_PORT || 587),
    secure: config.SMTP_SECURE === "true",
    auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
    },
});
async function sendEmail(to, subject, html) {
    try {
        const info = await transporter.sendMail({
            from: config.EMAIL_FROM || `"HerRidez" <${config.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        logger.info(`Email sent to ${to}: ${info.messageId}`);
        return info;
    }
    catch (error) {
        logger.error(`Error sending email to ${to}: ${error.message}`);
        throw error;
    }
}
// ============================================
// SIGNUP OTP EMAIL
// ============================================
export const sendSignupOtpEmail = async (to, otp, phone) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
      <div style="background: linear-gradient(135deg, #FF2FB9, #4DA3FF); padding: 30px; border-radius: 12px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🏍️ HerRidez</h1>
        <p style="color: white; margin: 5px 0;">Ride. Connect. Empower.</p>
      </div>

      <div style="background: white; padding: 40px; border-radius: 12px; margin-top: 20px;">
        <h2 style="color: #1A0826; font-size: 22px;">Welcome to HerRidez!</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          We're thrilled to have you join our women-only superbike community.
        </p>

        <p style="color: #666; font-size: 14px;">
          <strong>Phone:</strong> ${phone}
        </p>

        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          Use this OTP to verify your phone number:
        </p>

        <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; text-align: center; border-left: 4px solid #FF2FB9;">
          <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">Your Verification Code</p>
          <div style="background: white; color: #FF2FB9; padding: 15px 30px; display: inline-block; border-radius: 8px; letter-spacing: 6px; font-size: 40px; font-weight: bold; border: 2px solid #FF2FB9;">
            ${otp}
          </div>
          <p style="color: #FF2FB9; font-size: 13px; margin: 15px 0 0 0; font-weight: bold;">
            ⏱️ Valid for 10 minutes
          </p>
        </div>

        <div style="background: #FFF5F9; padding: 15px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #FF2FB9;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>⚠️ Security Tip:</strong> Never share this OTP with anyone.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px; margin: 5px 0;">
          © 2025 HerRidez. All rights reserved.
        </p>
      </div>
    </div>
  `;
    return sendEmail(to, "🏍️ HerRidez - Verify Your Phone Number (OTP Valid for 10 Minutes)", html);
};
// ============================================
// LOGIN OTP EMAIL
// ============================================
export const sendLoginOtpEmail = async (to, otp, phone) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4DA3FF, #FF2FB9); padding: 30px; border-radius: 12px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🏍️ HerRidez</h1>
        <p style="color: white; margin: 5px 0;">Ride. Connect. Empower.</p>
      </div>

      <div style="background: white; padding: 40px; border-radius: 12px; margin-top: 20px;">
        <h2 style="color: #1A0826; font-size: 22px;">Welcome Back! 👋</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.6;">
          Your login verification code is ready.
        </p>

        <p style="color: #666; font-size: 14px;">
          <strong>Phone:</strong> ${phone}
        </p>

        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
          Your one-time password (OTP):
        </p>

        <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; text-align: center; border-left: 4px solid #4DA3FF;">
          <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">Your Login Code</p>
          <div style="background: white; color: #4DA3FF; padding: 15px 30px; display: inline-block; border-radius: 8px; letter-spacing: 6px; font-size: 40px; font-weight: bold; border: 2px solid #4DA3FF;">
            ${otp}
          </div>
          <p style="color: #4DA3FF; font-size: 13px; margin: 15px 0 0 0; font-weight: bold;">
            ⏱️ Valid for 10 minutes
          </p>
        </div>

        <div style="background: #F0F4FF; padding: 15px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #4DA3FF;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>🔒 Security:</strong> If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px; margin: 5px 0;">
          © 2025 HerRidez. All rights reserved.
        </p>
      </div>
    </div>
  `;
    return sendEmail(to, "🏍️ HerRidez - Your Login Code (OTP Valid for 10 Minutes)", html);
};
export const sendEmailAlert = async (email, options) => {
    try {
        const { contactName, location, liveUrl, isLocationUpdate = false, updateNumber = 0, } = options;
        const mapsLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
        let html;
        if (isLocationUpdate) {
            // ✅ LOCATION UPDATE EMAIL
            html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1A0826, #2A1640); padding: 0; margin: 0;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FF2FB9, #4DA3FF); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">📍 LOCATION UPDATE</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">HerRidez Safety System</p>
            <p style="color: rgba(255,255,255,0.7); margin: 5px 0 0 0; font-size: 14px;">Update #${updateNumber}</p>
          </div>

          <!-- Content -->
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Greeting -->
            <div style="background: rgba(255,255,255,0.05); border-left: 4px solid #FF2FB9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #F6F7FB; font-size: 16px; margin: 0;">
                Hi <strong>${contactName}</strong>,
              </p>
              <p style="color: #BBB; font-size: 14px; margin: 10px 0 0 0; line-height: 1.6;">
                A new location update has been received from the SOS alert.
              </p>
            </div>

            <!-- Location Card -->
            <div style="background: rgba(255,47,185,0.1); border: 2px solid #FF2FB9; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                📍 Updated Location
              </p>
              
              <div style="background: rgba(26,8,38,0.5); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="color: #4DA3FF; font-size: 13px; margin: 5px 0;">
                  <strong>Latitude:</strong> ${location.lat.toFixed(6)}
                </p>
                <p style="color: #4DA3FF; font-size: 13px; margin: 5px 0;">
                  <strong>Longitude:</strong> ${location.lng.toFixed(6)}
                </p>
              </div>

              <!-- Map Link Button -->
              <a href="${mapsLink}" style="display: inline-block; background: #FF2FB9; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 10px;">
                📍 Open in Google Maps
              </a>
            </div>

            <!-- Live Tracking Card -->
            <div style="background: rgba(77,163,255,0.1); border: 2px solid #4DA3FF; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                🔴 Live Tracking
              </p>
              
              <p style="color: #BBB; font-size: 13px; margin: 0 0 15px 0;">
                Monitor the rider's live location in real-time:
              </p>

              <!-- CTA Button -->
              <a href="${liveUrl}" style="display: inline-block; background: #4DA3FF; color: #000; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center;">
                🔴 VIEW LIVE TRACKING
              </a>
            </div>

            <!-- Footer Info -->
            <div style="background: rgba(255,255,255,0.02); border-top: 1px solid #444; padding: 20px 0; text-align: center;">
              <p style="color: #666; font-size: 11px; margin: 0;">
                This is an automated location update from HerRidez.
                <br/>Do not reply to this email.
              </p>
              <p style="color: #444; font-size: 10px; margin: 10px 0 0 0;">
                © 2025 HerRidez - Women's Superbike Community
                <br/>Ride. Connect. Empower. 🏍️
              </p>
            </div>
          </div>
        </div>
      `;
        }
        else {
            // ✅ INITIAL SOS ALERT EMAIL
            html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1A0826, #2A1640); padding: 0; margin: 0;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FF2FB9, #4DA3FF); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">🚨 SOS EMERGENCY ALERT</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">HerRidez Safety System</p>
          </div>

          <!-- Content -->
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Greeting -->
            <div style="background: rgba(255,255,255,0.05); border-left: 4px solid #FF2FB9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #F6F7FB; font-size: 16px; margin: 0;">
                Hi <strong>${contactName}</strong>,
              </p>
              <p style="color: #BBB; font-size: 14px; margin: 10px 0 0 0; line-height: 1.6;">
                A HerRidez rider has triggered an emergency SOS alert. 
                <br/>Please respond immediately if you can help.
              </p>
            </div>

            <!-- Location Card -->
            <div style="background: rgba(255,47,185,0.1); border: 2px solid #FF2FB9; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                📍 Emergency Location
              </p>
              
              <div style="background: rgba(26,8,38,0.5); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="color: #4DA3FF; font-size: 13px; margin: 5px 0;">
                  <strong>Latitude:</strong> ${location.lat.toFixed(4)}
                </p>
                <p style="color: #4DA3FF; font-size: 13px; margin: 5px 0;">
                  <strong>Longitude:</strong> ${location.lng.toFixed(4)}
                </p>
              </div>

              <!-- Map Link Button -->
              <a href="${mapsLink}" style="display: inline-block; background: #FF2FB9; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 10px;">
                📍 Open in Google Maps
              </a>
            </div>

            <!-- Live Tracking Card -->
            <div style="background: rgba(77,163,255,0.1); border: 2px solid #4DA3FF; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
                🔴 Live Tracking Link
              </p>
              
              <p style="color: #BBB; font-size: 13px; margin: 0 0 15px 0;">
                You can monitor the rider's live location in real-time:
              </p>

              <!-- CTA Button -->
              <a href="${liveUrl}" style="display: inline-block; background: #4DA3FF; color: #000; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center;">
                🔴 VIEW LIVE TRACKING
              </a>

              <p style="color: #666; font-size: 11px; margin: 15px 0 0 0;">
                This link will be active until the rider marks themselves as safe.
              </p>
            </div>

            <!-- Emergency Response -->
            <div style="background: rgba(255,149,0,0.1); border-left: 4px solid #FF9500; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                ⚠️ If You Can Help
              </p>
              <p style="color: #BBB; font-size: 13px; margin: 0; line-height: 1.6;">
                If you're nearby and can help, please:
                <br/>1️⃣ Check the live location link above
                <br/>2️⃣ Proceed safely to the location
                <br/>3️⃣ Contact emergency services if needed
              </p>
            </div>

            <!-- Contact List -->
            <div style="background: rgba(26,8,38,0.5); border: 1px solid #444; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
                📞 Emergency Services (India)
              </p>
              <p style="color: #BBB; font-size: 13px; margin: 0;">
                🚑 Ambulance: <strong style="color: #FF2FB9;">102</strong>
                <br/>🚗 Traffic Police: <strong style="color: #FF2FB9;">100</strong>
                <br/>📞 General Emergency: <strong style="color: #FF2FB9;">112</strong>
              </p>
            </div>

            <!-- Footer Info -->
            <div style="background: rgba(255,255,255,0.02); border-top: 1px solid #444; padding: 20px 0; text-align: center;">
              <p style="color: #666; font-size: 11px; margin: 0;">
                This is an automated emergency alert from HerRidez.
                <br/>Do not reply to this email.
              </p>
              <p style="color: #444; font-size: 10px; margin: 10px 0 0 0;">
                © 2025 HerRidez - Women's Superbike Community
                <br/>Ride. Connect. Empower. 🏍️
              </p>
            </div>
          </div>
        </div>
      `;
        }
        const subject = isLocationUpdate
            ? `📍 LOCATION UPDATE - SOS Alert (Update #${updateNumber})`
            : `🚨 SOS EMERGENCY ALERT - HerRidez Rider Needs Help`;
        logger.info(`[EMAIL] Sending ${isLocationUpdate ? 'location update' : 'SOS alert'} to ${email}...`);
        await sendEmail(email, subject, html);
        logger.info(`[EMAIL] ✅ Email sent to ${email}`);
        return true;
    }
    catch (error) {
        logger.error(`[EMAIL] ❌ Error sending email to ${email}: ${error.message}`);
        return false;
    }
};
//# sourceMappingURL=mail.js.map