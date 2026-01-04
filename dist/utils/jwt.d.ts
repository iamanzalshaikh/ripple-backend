import { JwtPayload } from "jsonwebtoken";
export interface UserTokenPayload extends JwtPayload {
    userId: string;
}
export declare function signUserAccessToken(userId: string): string;
export declare function signUserRefreshToken(userId: string): string;
export declare function verifyUserAccessToken(token: string): UserTokenPayload | null;
export declare function verifyUserRefreshToken(token: string): UserTokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map