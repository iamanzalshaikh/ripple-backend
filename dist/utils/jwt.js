// import jwt from "jsonwebtoken";
// import config from "../config/config.js";
// const ACCESS_EXPIRES_IN = "7d";
// const REFRESH_EXPIRES_IN = "30d";
// // ============================================
// // USER JWT FUNCTIONS
// // ============================================
// export function signUserAccessToken(payload: object) {
//   return jwt.sign(payload, config.JWT_ACCESS_SECRET!, {
//     expiresIn: ACCESS_EXPIRES_IN,
//   });
// }
// export function signUserRefreshToken(payload: object) {
//   return jwt.sign(payload, config.JWT_REFRESH_SECRET!, {
//     expiresIn: REFRESH_EXPIRES_IN,
//   });
// }
// export function verifyUserAccessToken(token: string) {
//   try {
//     return jwt.verify(token, config.JWT_ACCESS_SECRET!);
//   } catch (error) {
//     return null;
//   }
// }
// export function verifyUserRefreshToken(token: string) {
//   try {
//     return jwt.verify(token, config.JWT_REFRESH_SECRET!);
//   } catch (error) {
//     return null;
//   }
// }
import jwt from "jsonwebtoken";
import config from "../config/config.js";
const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";
// ============================================
// SIGN TOKENS
// ============================================
export function signUserAccessToken(userId) {
    const payload = { userId };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
        expiresIn: ACCESS_EXPIRES_IN,
    });
}
export function signUserRefreshToken(userId) {
    const payload = { userId };
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_EXPIRES_IN,
    });
}
// ============================================
// VERIFY TOKENS
// ============================================
export function verifyUserAccessToken(token) {
    try {
        return jwt.verify(token, config.JWT_ACCESS_SECRET);
    }
    catch {
        return null;
    }
}
export function verifyUserRefreshToken(token) {
    try {
        return jwt.verify(token, config.JWT_REFRESH_SECRET);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map