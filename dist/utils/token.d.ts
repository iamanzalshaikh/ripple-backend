/**
 * Generate random secure token for live ride sharing
 * @param length Token length (default: 32 characters)
 * @returns Random alphanumeric token
 *
 * Example:
 * generateToken() → "abc123xyz789..."
 * generateToken(16) → "short_token_here"
 */
export declare const generateToken: (length?: number) => string;
/**
 * Generate cryptographically secure token (more secure version)
 * @param length Token length in bytes
 * @returns Hex-encoded random token
 *
 * Example:
 * generateSecureToken(16) → "a1b2c3d4e5f6g7h8..."
 * Better for sensitive operations
 */
export declare const generateSecureToken: (length?: number) => string;
/**
 * Verify token format
 * @param token Token to verify
 * @returns True if token is valid format
 */
export declare const isValidToken: (token: string) => boolean;
/**
 * Generate unique ride ID prefix
 * @returns Prefix like "RIDE_20240101_ABC123"
 */
export declare const generateRidePrefix: () => string;
//# sourceMappingURL=token.d.ts.map