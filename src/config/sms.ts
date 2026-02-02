import axios from "axios";
import config from "./config.js";
import logger from "./logger.js";

// TechMore SMS Gateway Integration
// API Documentation: https://www.techmoreindia.com/

const TECHMORE_API_URL = "http://textsms.thetechmore.in/http-tokenkeyapi.php";

// /**
//  * Send SMS via TechMore Gateway
//  * @param phone - 10-digit Indian mobile number
//  * @param message - SMS message content
//  * @returns Promise<boolean> - Success status
//  */
// async function sendSMS(phone: string, message: string): Promise<boolean> {
//   try {
//     console.log("\n========== SMS SEND ATTEMPT DEBUG ==========");
//     console.log(`[SMS DEBUG] Target Phone: ${phone}`);
//     console.log(`[SMS DEBUG] Message Length: ${message.length} characters`);
//     console.log(`[SMS DEBUG] Message Preview: ${message.substring(0, 50)}...`);

//     // Validate phone number
//     if (!/^[0-9]{10}$/.test(phone)) {
//       logger.error(`[SMS] Invalid phone number format: ${phone}`);
//       console.log(`[SMS DEBUG] ❌ Phone validation failed - must be 10 digits`);
//       return false;
//     }
//     console.log(`[SMS DEBUG] ✅ Phone validation passed`);

//     // Validate TechMore configuration
//     console.log("\n[SMS DEBUG] Checking TechMore Configuration from .env:");
//     console.log(
//       `[SMS DEBUG] TECHMORE_AUTH_KEY: ${config.TECHMORE_AUTH_KEY ? `Set (${config.TECHMORE_AUTH_KEY.substring(0, 10)}...)` : "❌ MISSING"}`,
//     );
//     console.log(
//       `[SMS DEBUG] TECHMORE_SENDER_ID: ${config.TECHMORE_SENDER_ID || "❌ MISSING"}`,
//     );
//     console.log(
//       `[SMS DEBUG] TECHMORE_ROUTE: ${config.TECHMORE_ROUTE || "❌ MISSING"}`,
//     );

//     if (
//       !config.TECHMORE_AUTH_KEY ||
//       !config.TECHMORE_SENDER_ID ||
//       !config.TECHMORE_ROUTE
//     ) {
//       logger.error(
//         `[SMS] TechMore configuration is missing. Please check your .env file.`,
//       );
//       logger.error(
//         `[SMS] TECHMORE_AUTH_KEY: ${config.TECHMORE_AUTH_KEY ? "Set" : "Missing"}`,
//       );
//       logger.error(
//         `[SMS] TECHMORE_SENDER_ID: ${config.TECHMORE_SENDER_ID ? "Set" : "Missing"}`,
//       );
//       logger.error(
//         `[SMS] TECHMORE_ROUTE: ${config.TECHMORE_ROUTE ? "Set" : "Missing"}`,
//       );
//       return false;
//     }
//     console.log(`[SMS DEBUG] ✅ All credentials present`);

//     // Prepare API parameters
//     // const params = {
//     //   tokenkey: config.TECHMORE_AUTH_KEY,
//     //   sender: config.TECHMORE_SENDER_ID,
//     //   mobile: phone,
//     //   message: message,
//     //   route: config.TECHMORE_ROUTE,
//     // };

//     const params = {
//       "authentic-key": config.TECHMORE_AUTH_KEY,
//       senderid: config.TECHMORE_SENDER_ID,
//       route: config.TECHMORE_ROUTE,
//       number: phone,
//       message,
//     };

//     console.log("\n[SMS DEBUG] API Request Details:");
//     console.log(`[SMS DEBUG] API URL: ${TECHMORE_API_URL}`);
//     console.log(`[SMS DEBUG] Request Parameters:`, {
//       authkey: config.TECHMORE_AUTH_KEY.substring(0, 10) + "...",
//       sender: params.sender,
//       mobile: params.mobile,
//       message: params.message.substring(0, 30) + "...",
//       route: params.route,
//     });

//     logger.info(`[SMS] Sending SMS to ${phone}...`);
//     console.log(`[SMS DEBUG] Making HTTP GET request with 10s timeout...`);

//     // Make API request
//     const response = await axios.get(TECHMORE_API_URL, {
//       params,
//       timeout: 10000, // 10 second timeout
//     });

//     console.log(`\n[SMS DEBUG] Response received!`);
//     console.log(`[SMS DEBUG] Response Status: ${response.status}`);
//     console.log(`[SMS DEBUG] Response Headers:`, response.headers);

//     // TechMore API returns HTTP 200 even on errors, check response data
//     const responseData = response.data;
//     const responseString = String(responseData).trim();

//     console.log(`[SMS DEBUG] Response Data: ${responseString}`);
//     console.log(`[SMS DEBUG] Response Data Type: ${typeof responseData}`);
//     console.log(
//       `[SMS DEBUG] Response Data (JSON):`,
//       JSON.stringify(responseData, null, 2),
//     );

//     // TechMore success responses typically contain message ID (numeric)
//     // Error responses contain error messages (non-numeric)
//     if (response.status === 200) {
//       // Check if response is a numeric message ID (success) or error message
//       if (/^\d+$/.test(responseString)) {
//         logger.info(
//           `[SMS] ✅ SMS sent successfully to ${phone}. Message ID: ${responseString}`,
//         );
//         console.log(`[SMS DEBUG] ✅ SUCCESS - Message ID: ${responseString}`);
//         console.log("========== SMS SEND SUCCESS ==========\n");
//         return true;
//       } else {
//         // Response contains error message
//         logger.error(
//           `[SMS] ❌ TechMore API error for ${phone}: ${responseString}`,
//         );
//         console.log(`[SMS DEBUG] ❌ API returned error: ${responseString}`);
//         console.log("========== SMS SEND FAILED ==========\n");
//         return false;
//       }
//     } else {
//       logger.error(
//         `[SMS] ❌ Failed to send SMS to ${phone}. HTTP Status: ${response.status}`,
//       );
//       console.log(`[SMS DEBUG] ❌ Unexpected HTTP status: ${response.status}`);
//       console.log("========== SMS SEND FAILED ==========\n");
//       return false;
//     }
//   } catch (error: any) {
//     console.log("\n[SMS DEBUG] ❌ EXCEPTION CAUGHT:");
//     console.log(`[SMS DEBUG] Error Type: ${error.constructor.name}`);
//     console.log(`[SMS DEBUG] Error Message: ${error.message}`);
//     console.log(`[SMS DEBUG] Error Code: ${error.code || "N/A"}`);

//     logger.error(`[SMS] ❌ Error sending SMS to ${phone}: ${error.message}`);

//     if (error.response) {
//       console.log(
//         `[SMS DEBUG] Error Response Status: ${error.response.status}`,
//       );
//       console.log(`[SMS DEBUG] Error Response Data:`, error.response.data);
//       logger.error(`[SMS] Response status: ${error.response.status}`);
//       logger.error(
//         `[SMS] Response data: ${JSON.stringify(error.response.data)}`,
//       );
//     }
//     if (error.request) {
//       console.log(`[SMS DEBUG] Request was made but no response received`);
//       console.log(`[SMS DEBUG] This usually means:`);
//       console.log(`[SMS DEBUG]   - DNS lookup failed (domain doesn't exist)`);
//       console.log(`[SMS DEBUG]   - Network connectivity issues`);
//       console.log(`[SMS DEBUG]   - Firewall blocking the request`);
//       console.log(`[SMS DEBUG]   - Server is down`);
//       logger.error(
//         `[SMS] No response received from TechMore API. Check network connection.`,
//       );
//     }
//     if (!error.response && !error.request) {
//       console.log(
//         `[SMS DEBUG] Error occurred during request setup:`,
//         error.message,
//       );
//     }

//     console.log(`[SMS DEBUG] Full Error Stack:`, error.stack);
//     console.log("========== SMS SEND EXCEPTION ==========\n");
//     return false;
//   }
// }

/**
 * Send SMS via TechMore Gateway
 * @param phone - 10-digit Indian mobile number
 * @param message - SMS message content
 * @returns Promise<boolean> - Success status
 */

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    console.log("\n========== SMS SEND ATTEMPT ==========");
    console.log(`[SMS] Target Phone: ${phone}`);

    // 1️⃣ Validate phone number
    if (!/^[0-9]{10}$/.test(phone)) {
      console.error(`[SMS] ❌ Invalid phone number: ${phone}`);
      return false;
    }

    // 2️⃣ Validate environment variables
    if (
      !config.TECHMORE_AUTH_KEY ||
      !config.TECHMORE_SENDER_ID ||
      !config.TECHMORE_ROUTE
    ) {
      console.error(`[SMS] ❌ TechMore configuration missing in .env`);
      return false;
    }

    // 3️⃣ Prepare TechMore parameters (Token Key API)
    const params = {
      "authentic-key": config.TECHMORE_AUTH_KEY,
      senderid: config.TECHMORE_SENDER_ID,
      route: config.TECHMORE_ROUTE,
      number: phone,
      message,
    };

    console.log(`[SMS] Sending OTP SMS...`);

    // 4️⃣ Call TechMore API
    const response = await axios.get(TECHMORE_API_URL, {
      params,
      timeout: 10000, // 10 seconds
    });

    const data = response.data;

    console.log(`[SMS] API Response:`, data);

    // 5️⃣ SUCCESS condition (THIS IS IMPORTANT)
    if (response.status === 200 && data?.Status === "Success") {
      console.log(
        `[SMS] ✅ SMS sent successfully. Message ID: ${data["Message-Id"]}`,
      );
      console.log("========== SMS SEND SUCCESS ==========\n");
      return true;
    }

    // 6️⃣ API-level failure
    console.error(
      `[SMS] ❌ TechMore API error: ${data?.Description || "Unknown error"}`,
    );
    console.log("========== SMS SEND FAILED ==========\n");
    return false;
  } catch (error: any) {
    console.error(`[SMS] ❌ Exception while sending SMS: ${error.message}`);

    if (error.response) {
      console.error(
        `[SMS] API Response Error:`,
        JSON.stringify(error.response.data),
      );
    }

    console.log("========== SMS SEND EXCEPTION ==========\n");
    return false;
  }
}

/**
 * Send Signup OTP SMS
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendSignupOtpSms = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Welcome to HerRidez! Your verification OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone. - HerRidez`;

  try {
    const success = await sendSMS(phone, message);
    if (success) {
      logger.info(`[SMS] Signup OTP sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send signup OTP to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(
      `[SMS] Error sending signup OTP to ${phone}: ${error.message}`,
    );
    return false;
  }
};

/**
 * Send Login OTP SMS
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendLoginOtpSms = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Your HerRidez login OTP is: ${otp}. Valid for 10 minutes. Do not share this code. If you did not request this, please ignore. - HerRidez`;

  try {
    const success = await sendSMS(phone, message);
    if (success) {
      logger.info(`[SMS] Login OTP sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send login OTP to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(`[SMS] Error sending login OTP to ${phone}: ${error.message}`);
    return false;
  }
};

/**
 * Send Emergency SOS Alert SMS
 * @param phone - 10-digit mobile number
 * @param message - Alert message
 * @returns Promise<boolean>
 */
export const sendEmergencyAlertSms = async (
  phone: string,
  message: string,
): Promise<boolean> => {
  try {
    const success = await sendSMS(phone, message);
    if (success) {
      logger.info(`[SMS] Emergency alert sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send emergency alert to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(
      `[SMS] Error sending emergency alert to ${phone}: ${error.message}`,
    );
    return false;
  }
};
