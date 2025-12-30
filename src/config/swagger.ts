import swaggerJsdoc from "swagger-jsdoc";
import config from "./config.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HerRidez API",
      version: "1.0.0",
      description:
        "API documentation for HerRidez - Women-Only Superbike Community Platform",
      contact: {
        name: "HerRidez Support",
        email: "support@herridez.com",
        url: "https://herridez.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Local Development Server",
      },
      {
        url: `${process.env.API_URL || "https://api.herridez.com"}`,
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token for authentication",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
          description: "JWT token in cookie",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            error: {
              type: "string",
              example: "Error details (only in development)",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },
            phone: {
              type: "string",
              example: "9876543210",
            },
            email: {
              type: "string",
              example: "user@example.com",
            },
            name: {
              type: "string",
              example: "Jane Doe",
            },
            handle: {
              type: "string",
              example: "janedoe",
            },
            verified: {
              type: "boolean",
              example: true,
            },
            verificationStatus: {
              type: "string",
              enum: ["unverified", "pending", "approved", "rejected"],
              example: "approved",
            },
            avatarUrl: {
              type: "string",
              example: "https://s3.example.com/avatar.jpg",
            },
            onboardingCompleted: {
              type: "boolean",
              example: false,
            },
            role: {
              type: "string",
              enum: ["rider", "creator", "brand_partner", "admin", "super_admin", "moderator"],
              example: "rider",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Login successful!",
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                accessToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
                refreshToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
              },
            },
          },
        },
        OTP: {
          type: "object",
          properties: {
            code: {
              type: "string",
              example: "123456",
            },
            attempts: {
              type: "number",
              example: 0,
            },
            maxAttempts: {
              type: "number",
              example: 5,
            },
            isUsed: {
              type: "boolean",
              example: false,
            },
            expiresAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "System",
        description: "System health check",
      },
      {
        name: "Auth",
        description: "Authentication endpoints (Signup & Login with OTP)",
      },
      {
        name: "Bike",
        description: "Bike/Garage management endpoints",
      },
      {
        name: "Profile",
        description: "User profile endpoints",
      },
      {
        name: "Ride",
        description: "Ride tracking and management",
      },
      {
        name: "SOS",
        description: "Emergency SOS features",
      },
      {
        name: "Post",
        description: "Feed posts and content",
      },
      {
        name: "Event",
        description: "Events and group rides",
      },
      {
        name: "Group",
        description: "Community groups",
      },
      {
        name: "Listing",
        description: "Marketplace listings",
      },
      {
        name: "Badge",
        description: "Badges and achievements",
      },
      {
        name: "Challenge",
        description: "Riding challenges",
      },
      {
        name: "Creator",
        description: "Creator program",
      },
      {
        name: "Sponsorship",
        description: "Brand sponsorship partnerships",
      },
      {
        name: "Upload",
        description: "File upload endpoints",
      },
      {
        name: "Notification",
        description: "Push notifications",
      },
      {
        name: "Admin",
        description: "Admin panel endpoints",
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
  ],
};

export const specs = swaggerJsdoc(options);