/**
 * OTP utilities — stub. Wire SMS/email providers here (Ridez-style OTP flows).
 */
export const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  const n = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1));
  return String(n);
}
