import axios from "axios";
import twilio from "twilio";
import config from "./config.js";
import logger from "./logger.js";

// TechMore SMS Gateway Integration
// API Documentation: https://www.techmoreindia.com/

const TECHMORE_API_URL = "http://textsms.thetechmore.in/http-tokenkeyapi.php";

// Twilio SMS Integration
// Initialize Twilio client (will be created on first use)
let twilioClient: twilio.Twilio | null = null;

/**
 * Get or create Twilio client instance
 */
function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials are not configured");
    }
    twilioClient = twilio(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_AUTH_TOKEN,
    );
  }
  return twilioClient;
}

/**
 * Format phone number to E.164 format for Twilio
 * Converts 10-digit Indian number to +91XXXXXXXXXX
 * @param phone - Phone number (10-digit or already formatted)
 * @returns Formatted phone number in E.164 format
 */
function formatPhoneForTwilio(phone: string): string {
  // Remove any spaces, dashes, or other characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // If already in E.164 format (starts with +), return as is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // If it's a 10-digit Indian number, add +91 prefix
  if (/^[0-9]{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // If it's 12 digits starting with 91, add + prefix
  if (/^91[0-9]{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Return as is if it doesn't match expected patterns
  return cleaned;
}

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
    const params: any = {
      "authentic-key": config.TECHMORE_AUTH_KEY,
      senderid: config.TECHMORE_SENDER_ID,
      route: config.TECHMORE_ROUTE,
      number: phone,
      message,
    };

    // Add template ID if configured (some TechMore accounts require this)
    if (config.TECHMORE_TEMPLATE_ID) {
      params.templateid = config.TECHMORE_TEMPLATE_ID;
      console.log(`[SMS] Using Template ID: ${config.TECHMORE_TEMPLATE_ID}`);
    }

    // Log request details (without exposing full auth key)
    console.log(`[SMS] Request Details:`);
    console.log(`[SMS] API URL: ${TECHMORE_API_URL}`);
    console.log(`[SMS] Phone: ${phone}`);
    console.log(`[SMS] Sender ID: ${config.TECHMORE_SENDER_ID}`);
    console.log(`[SMS] Route: ${config.TECHMORE_ROUTE}`);
    console.log(`[SMS] Auth Key: ${config.TECHMORE_AUTH_KEY?.substring(0, 10)}...`);
    console.log(`[SMS] Message Length: ${message.length} chars`);
    console.log(`[SMS] Message Preview: ${message.substring(0, 50)}...`);

    console.log(`[SMS] Sending OTP SMS...`);

    // 4️⃣ Call TechMore API
    const response = await axios.get(TECHMORE_API_URL, {
      params,
      timeout: 10000, // 10 seconds
    });
    
    const data = response.data;
    console.log(`[SMS] Full API Response:`, JSON.stringify(data, null, 2));
    console.log(`[SMS] Response Status Code: ${response.status}`);
    console.log(`[SMS] Response Headers:`, JSON.stringify(response.headers, null, 2));

    // 5️⃣ SUCCESS condition (THIS IS IMPORTANT)
    if (response.status === 200 && data?.Status === "Success") {
      console.log(
        `[SMS] ✅ SMS sent successfully. Message ID: ${data["Message-Id"]}`,
      );
      console.log(`[SMS] Response Code: ${data?.Code || "N/A"}`);
      console.log(`[SMS] Description: ${data?.Description || "N/A"}`);
      console.log("\n⚠️  IMPORTANT: If SMS not received, check:");
      console.log("  1. ✅ Template ID: " + (config.TECHMORE_TEMPLATE_ID || "Not set"));
      console.log("  2. ✅ Message must match approved template EXACTLY");
      console.log("  3. ✅ Template must be APPROVED in TechMore dashboard");
      console.log("  4. ✅ Check TechMore dashboard for delivery status");
      console.log("  5. ✅ Verify account balance/credits in TechMore");
      console.log("  6. ✅ Phone number format: " + phone);
      console.log("  7. ✅ Message preview: " + message.substring(0, 60) + "...");
      console.log("\n💡 TROUBLESHOOTING:");
      console.log("  - Template ID: " + config.TECHMORE_TEMPLATE_ID);
      console.log("  - Expected format: 'Your OTP is {#var#}. It is valid for 10 minutes...'");
      console.log("  - Your message: '" + message + "'");
      console.log("  - If template uses {#var#}, ensure message matches EXACTLY");
      console.log("========== SMS SEND SUCCESS ==========\n");
      return true;
    }

    // 6️⃣ API-level failure
    console.error(
      `[SMS] ❌ TechMore API error: ${data?.Description || "Unknown error"}`,
    );
    console.error(`[SMS] Response Code: ${data?.Code || "N/A"}`);
    console.error(`[SMS] Full Response:`, JSON.stringify(data, null, 2));
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
 * Send SMS with fallback: Twilio first (for testing), then Techmore
 * NOTE: Once Twilio is confirmed working, we'll switch to Techmore first, Twilio fallback
 * @param phone - 10-digit mobile number
 * @param message - SMS message content
 * @returns Promise<boolean> - Success status
 */
async function sendSMSWithFallback(
  phone: string,
  message: string,
): Promise<boolean> {
  console.log("\n========== SMS SEND WITH FALLBACK ==========");
  console.log(`[SMS] Testing Twilio first...`);

  // Try Twilio first (for testing)
  const twilioResult = await sendSMSViaTwilio(phone, message);
  if (twilioResult) {
    console.log(`[SMS] ✅ Twilio succeeded, no fallback needed`);
    console.log("===========================================\n");
    return true;
  }

  // Twilio failed, try Techmore as fallback
  console.log(`[SMS] ⚠️  Twilio failed, trying Techmore as fallback...`);
  const techmoreResult = await sendSMS(phone, message);
  if (techmoreResult) {
    console.log(`[SMS] ✅ Techmore fallback succeeded`);
    console.log("===========================================\n");
    return true;
  }

  // Both failed
  console.log(`[SMS] ❌ Both Twilio and Techmore failed`);
  console.log("===========================================\n");
  return false;
}

/**
 * Send Signup OTP SMS (with fallback: Techmore → Twilio)
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendSignupOtpSms = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Your OTP  is ${otp}. It is valid for 10 minutes. 
Please do not share this code with anyone.

HerRidez

TMS `;

  try {
    const success = await sendSMSWithFallback(phone, message);
    if (success) {
      logger.info(`[SMS] Signup OTP sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send signup OTP to ${phone} (both providers failed)`);
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
 * Send Login OTP SMS (with fallback: Techmore → Twilio)
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendLoginOtpSms = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Your OTP  is ${otp}. It is valid for 10 minutes. 
Please do not share this code with anyone.

HerRidez

TMS `;

  try {
    const success = await sendSMSWithFallback(phone, message);
    if (success) {
      logger.info(`[SMS] Login OTP sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send login OTP to ${phone} (both providers failed)`);
    }
    return success;
  } catch (error: any) {
    logger.error(`[SMS] Error sending login OTP to ${phone}: ${error.message}`);
    return false;
  }
};

/**
 * Send Emergency SOS Alert SMS (with fallback: Techmore → Twilio)
 * @param phone - 10-digit mobile number
 * @param message - Alert message
 * @returns Promise<boolean>
 */
export const sendEmergencyAlertSms = async (
  phone: string,
  message: string,
): Promise<boolean> => {
  try {
    const success = await sendSMSWithFallback(phone, message);
    if (success) {
      logger.info(`[SMS] Emergency alert sent to ${phone}`);
    } else {
      logger.error(`[SMS] Failed to send emergency alert to ${phone} (both providers failed)`);
    }
    return success;
  } catch (error: any) {
    logger.error(
      `[SMS] Error sending emergency alert to ${phone}: ${error.message}`,
    );
    return false;
  }
};

// ============================================
// TWILIO SMS IMPLEMENTATION (For Testing)
// ============================================

/**
 * Send SMS via Twilio Gateway
 * @param phone - 10-digit Indian mobile number (will be formatted to +91XXXXXXXXXX)
 * @param message - SMS message content
 * @returns Promise<boolean> - Success status
 */
async function sendSMSViaTwilio(
  phone: string,
  message: string,
): Promise<boolean> {
  try {
    console.log("\n========== TWILIO SMS SEND ATTEMPT ==========");
    console.log(`[TWILIO] Target Phone: ${phone}`);

    // 1️⃣ Validate phone number (accept 10-digit or already formatted)
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (!/^[0-9]{10}$/.test(cleanedPhone) && !cleanedPhone.startsWith("+")) {
      console.error(`[TWILIO] ❌ Invalid phone number format: ${phone}`);
      logger.error(`[TWILIO] Invalid phone number format: ${phone}`);
      return false;
    }

    // 2️⃣ Validate Twilio configuration
    console.log(`[TWILIO] Checking configuration...`);
    console.log(`[TWILIO] TWILIO_ACCOUNT_SID: ${config.TWILIO_ACCOUNT_SID ? "Set" : "❌ MISSING"}`);
    console.log(`[TWILIO] TWILIO_AUTH_TOKEN: ${config.TWILIO_AUTH_TOKEN ? "Set" : "❌ MISSING"}`);
    console.log(`[TWILIO] TWILIO_FROM_NUMBER: ${config.TWILIO_FROM_NUMBER || "❌ MISSING"}`);
    console.log(`[TWILIO] TWILIO_MESSAGING_SERVICE_SID: ${config.TWILIO_MESSAGING_SERVICE_SID || "Not set (optional)"}`);
    
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      console.error(`[TWILIO] ❌ Twilio configuration missing in .env`);
      console.error(`[TWILIO] Please add these to your .env file:`);
      console.error(`[TWILIO] TWILIO_ACCOUNT_SID=your_account_sid`);
      console.error(`[TWILIO] TWILIO_AUTH_TOKEN=your_auth_token`);
      console.error(`[TWILIO] TWILIO_FROM_NUMBER=+your_phone_number`);
      logger.error(`[TWILIO] Twilio configuration missing in .env`);
      return false;
    }

    if (!config.TWILIO_FROM_NUMBER && !config.TWILIO_MESSAGING_SERVICE_SID) {
      console.error(
        `[TWILIO] ❌ Either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be set`,
      );
      logger.error(
        `[TWILIO] Either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID must be set`,
      );
      return false;
    }

    // 3️⃣ Format phone number to E.164 format
    const formattedPhone = formatPhoneForTwilio(phone);
    console.log(`[TWILIO] Formatted Phone: ${formattedPhone}`);

    // 4️⃣ Get Twilio client
    const client = getTwilioClient();

    // 5️⃣ Prepare message options
    const messageOptions: any = {
      to: formattedPhone,
      body: message,
    };

    // Use Messaging Service SID if available, otherwise use From Number
    if (config.TWILIO_MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = config.TWILIO_MESSAGING_SERVICE_SID;
      console.log(`[TWILIO] Using Messaging Service SID`);
    } else {
      messageOptions.from = config.TWILIO_FROM_NUMBER;
      console.log(`[TWILIO] Using From Number: ${config.TWILIO_FROM_NUMBER}`);
    }

    console.log(`[TWILIO] Sending SMS...`);

    // 6️⃣ Send SMS via Twilio
    const response = await client.messages.create(messageOptions);

    // 7️⃣ Check response status
    if (response.status === "queued" || response.status === "sent") {
      console.log(
        `[TWILIO] ✅ SMS sent successfully. Message SID: ${response.sid}`,
      );
      console.log(`[TWILIO] Status: ${response.status}`);
      logger.info(
        `[TWILIO] SMS sent successfully to ${formattedPhone}. Message SID: ${response.sid}`,
      );
      console.log("========== TWILIO SMS SEND SUCCESS ==========\n");
      return true;
    } else {
      console.error(
        `[TWILIO] ❌ SMS status: ${response.status}, Error: ${response.errorMessage || "Unknown"}`,
      );
      logger.error(
        `[TWILIO] SMS failed. Status: ${response.status}, Error: ${response.errorMessage || "Unknown"}`,
      );
      console.log("========== TWILIO SMS SEND FAILED ==========\n");
      return false;
    }
  } catch (error: any) {
    console.error(`[TWILIO] ❌ Exception while sending SMS: ${error.message}`);
    logger.error(`[TWILIO] Error sending SMS: ${error.message}`);

    if (error.code) {
      console.error(`[TWILIO] Error Code: ${error.code}`);
      logger.error(`[TWILIO] Error Code: ${error.code}`);
      
      // Error 20003 = Authentication failed
      if (error.code === 20003) {
        console.error(`[TWILIO] ⚠️  AUTHENTICATION ERROR (20003)`);
        console.error(`[TWILIO] This means your Account SID or Auth Token is incorrect.`);
        console.error(`[TWILIO] Please verify your credentials in Twilio Console:`);
        console.error(`[TWILIO] https://console.twilio.com/us1/account/settings/credentials`);
        console.error(`[TWILIO] Current Account SID: ${config.TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
        console.error(`[TWILIO] Make sure:`);
        console.error(`[TWILIO] 1. Account SID starts with "AC"`);
        console.error(`[TWILIO] 2. Auth Token matches the Account SID`);
        console.error(`[TWILIO] 3. No extra spaces or quotes in .env file`);
      }
    }

    if (error.moreInfo) {
      console.error(`[TWILIO] More Info: ${error.moreInfo}`);
    }

    console.log("========== TWILIO SMS SEND EXCEPTION ==========\n");
    return false;
  }
}

/**
 * Send Signup OTP SMS via Twilio (For Testing)
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendSignupOtpSmsViaTwilio = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Your OTP  is ${otp}. It is valid for 10 minutes. 
Please do not share this code with anyone.

HerRidez

TMS `;

  try {
    const success = await sendSMSViaTwilio(phone, message);
    if (success) {
      logger.info(`[TWILIO] Signup OTP sent to ${phone}`);
    } else {
      logger.error(`[TWILIO] Failed to send signup OTP to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(
      `[TWILIO] Error sending signup OTP to ${phone}: ${error.message}`,
    );
    return false;
  }
};

/**
 * Send Login OTP SMS via Twilio (For Testing)
 * @param phone - 10-digit mobile number
 * @param otp - 6-digit OTP
 * @returns Promise<boolean>
 */
export const sendLoginOtpSmsViaTwilio = async (
  phone: string,
  otp: string,
): Promise<boolean> => {
  const message = `Your OTP  is ${otp}. It is valid for 10 minutes. 
Please do not share this code with anyone.

HerRidez

TMS `;

  try {
    const success = await sendSMSViaTwilio(phone, message);
    if (success) {
      logger.info(`[TWILIO] Login OTP sent to ${phone}`);
    } else {
      logger.error(`[TWILIO] Failed to send login OTP to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(`[TWILIO] Error sending login OTP to ${phone}: ${error.message}`);
    return false;
  }
};

/**
 * Send Emergency SOS Alert SMS via Twilio (For Testing)
 * @param phone - 10-digit mobile number
 * @param message - Alert message
 * @returns Promise<boolean>
 */
export const sendEmergencyAlertSmsViaTwilio = async (
  phone: string,
  message: string,
): Promise<boolean> => {
  try {
    const success = await sendSMSViaTwilio(phone, message);
    if (success) {
      logger.info(`[TWILIO] Emergency alert sent to ${phone}`);
    } else {
      logger.error(`[TWILIO] Failed to send emergency alert to ${phone}`);
    }
    return success;
  } catch (error: any) {
    logger.error(
      `[TWILIO] Error sending emergency alert to ${phone}: ${error.message}`,
    );
    return false;
  }
};
