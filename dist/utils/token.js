// ==================== utils/token.utils.ts ====================
import crypto from 'crypto';
/**
 * Generate random secure token for live ride sharing
 * @param length Token length (default: 32 characters)
 * @returns Random alphanumeric token
 *
 * Example:
 * generateToken() → "abc123xyz789..."
 * generateToken(16) → "short_token_here"
 */
export const generateToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
/**
 * Generate cryptographically secure token (more secure version)
 * @param length Token length in bytes
 * @returns Hex-encoded random token
 *
 * Example:
 * generateSecureToken(16) → "a1b2c3d4e5f6g7h8..."
 * Better for sensitive operations
 */
export const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};
/**
 * Verify token format
 * @param token Token to verify
 * @returns True if token is valid format
 */
export const isValidToken = (token) => {
    return typeof token === 'string' && token.length >= 16 && token.length <= 64;
};
/**
 * Generate unique ride ID prefix
 * @returns Prefix like "RIDE_20240101_ABC123"
 */
export const generateRidePrefix = () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = generateToken(6);
    return `RIDE_${dateStr}_${random}`;
};
//# sourceMappingURL=token.js.map