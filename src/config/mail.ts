

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

async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  try {
    const info = await transporter.sendMail({
      from: config.EMAIL_FROM || `"HerRidez" <${config.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error: any) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    throw error;
  }
}

// ============================================
// SIGNUP OTP EMAIL
// ============================================

export const sendSignupOtpEmail = async (
  to: string,
  otp: string | number,
  phone: string
) => {
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

  return sendEmail(
    to,
    "🏍️ HerRidez - Verify Your Phone Number (OTP Valid for 10 Minutes)",
    html
  );
};

// ============================================
// LOGIN OTP EMAIL
// ============================================

export const sendLoginOtpEmail = async (
  to: string,
  otp: string | number,
  phone: string
) => {
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

  return sendEmail(
    to,
    "🏍️ HerRidez - Your Login Code (OTP Valid for 10 Minutes)",
    html
  );
};