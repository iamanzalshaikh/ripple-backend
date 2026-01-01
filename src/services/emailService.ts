import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/config.js";
import logger from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: Number(config.SMTP_PORT || 587),
  secure: config.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});



async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
) {
  try {
    const info = await transporter.sendMail({
      from: config.EMAIL_FROM || `"HerRidez" <${config.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error: any) {
    logger.error(`Error sending email to ${to}: ${error.message}`);
    throw error;
  }
}