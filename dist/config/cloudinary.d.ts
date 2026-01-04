import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";
declare const uploadOnCloudinary: (fileBuffer: Buffer, folder?: string) => Promise<string | null>;
export { uploadOnCloudinary, cloudinary };
//# sourceMappingURL=cloudinary.d.ts.map