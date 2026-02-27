import crypto from "crypto";

/**
 * Generate a random 6-character uppercase join code.
 * Uses crypto.randomBytes for security — avoids Math.random() bias.
 * Output charset: A-Z and 0-9 (36 chars) → 36^6 = ~2.1 billion combinations.
 *
 * @returns 6-character uppercase alphanumeric join code
 */
export const generateJoinCode = (): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charsetLength = charset.length;
  let code = "";

  // Generate enough random bytes and map each to a charset character
  // We use rejection sampling to avoid modulo bias
  while (code.length < 6) {
    const randomBytes = crypto.randomBytes(1);
    const byte = randomBytes[0];
    // Reject values that would cause modulo bias
    if (byte < Math.floor(256 / charsetLength) * charsetLength) {
      code += charset[byte % charsetLength];
    }
  }

  return code;
};
