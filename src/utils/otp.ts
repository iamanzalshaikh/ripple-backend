import bcrypt from "bcryptjs";
import logger from "../config/logger.js";

/**
 * Generate a 6-digit OTP
 * @returns string - 6-digit OTP
 */
export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.debug(`[OTP] Generated OTP: ${otp}`);
  return otp;
}

/**
 * Hash OTP using bcrypt
 * @param otp - Plain text OTP
 * @returns Promise<string> - Hashed OTP
 */
export async function hashOTP(otp: string): Promise<string> {
  try {
    const saltRounds = 10;
    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    logger.debug(`[OTP] OTP hashed successfully`);
    return hashedOTP;
  } catch (error: any) {
    logger.error(`[OTP] Error hashing OTP: ${error.message}`);
    throw new Error("Failed to hash OTP");
  }
}

/**
 * Verify OTP against hash
 * @param otp - Plain text OTP entered by user
 * @param hash - Hashed OTP stored in database
 * @returns Promise<boolean> - True if OTP matches
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(otp, hash);
    logger.debug(`[OTP] OTP verification result: ${isMatch}`);
    return isMatch;
  } catch (error: any) {
    logger.error(`[OTP] Error verifying OTP: ${error.message}`);
    return false;
  }
}

/**
 * Check if OTP has expired
 * @param expiryDate - Expiry date of the OTP
 * @returns boolean - True if expired
 */
export function isOTPExpired(expiryDate: Date): boolean {
  const now = Date.now();
  const expiry = new Date(expiryDate).getTime();
  const expired = now > expiry;
  
  if (expired) {
    logger.debug(`[OTP] OTP expired. Current: ${now}, Expiry: ${expiry}`);
  }
  
  return expired;
}

/**
 * Calculate OTP expiry time
 * @param minutes - Number of minutes until expiry (default: 10)
 * @returns number - Timestamp of expiry
 */
export function calculateOTPExpiry(minutes: number = 10): number {
  return Date.now() + minutes * 60 * 1000;
}
