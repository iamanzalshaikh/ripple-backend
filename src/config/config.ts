import "dotenv/config";

// import all env files
export default {
  PORT: process.env.PORT!,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI!,
  FRONTEND_URL: process.env.FRONTEND_URL!,
  MASTER_URL: process.env.MASTER_URL!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ADMIN_ACCESS_SECRET: process.env.JWT_ADMIN_ACCESS_SECRET!,
  JWT_ADMIN_REFRESH_SECRET: process.env.JWT_ADMIN_REFRESH_SECRET!,
  SMTP_HOST: process.env.SMTP_HOST!,
  SMTP_PORT: process.env.SMTP_PORT!,
  SMTP_USER: process.env.SMTP_USER!,
  SMTP_PASS: process.env.SMTP_PASS!,
  EMAIL_FROM: process.env.EMAIL_FROM!,
  AWS_REGION: process.env.AWS_REGION!,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME!,
  REDIS_URL: process.env.REDIS_URL!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
};
