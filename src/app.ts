// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import cookieParser from "cookie-parser";
// import apiRoutes from "./routes";
// import logger from "./config/logger.js";
// import swaggerUi from "swagger-ui-express";
// import { specs } from "./config/swagger.js";
// // import { specs } from "./config/swagger.js";

// const app = express();

// // ============================================
// // MIDDLEWARES
// // ============================================

// // CORS
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow mobile apps & server-to-server (no origin)
//       if (!origin) return callback(null, true);

//       const allowedOrigins = [
//         "http://localhost:3000",
//         "http://localhost:8081",
//         "http://localhost:19006",
//       ];

//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//   })
// );

// // Security Headers with relaxed CSP for map resources
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           "https://cdnjs.cloudflare.com",
//           "https://unpkg.com"
//         ],
//         styleSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           "https://cdnjs.cloudflare.com",
//           "https://unpkg.com"
//         ],
//         imgSrc: [
//           "'self'",
//           "data:",
//           "https:",
//           "http:",
//           "blob:"
//         ],
//         connectSrc: ["'self'"],
//         fontSrc: ["'self'", "data:"],
//         objectSrc: ["'none'"],
//         mediaSrc: ["'self'"],
//         frameSrc: ["'none'"],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//   })
// );

// // Body Parser
// app.use(express.json());
// app.use(express.urlencoded({ limit: "10mb", extended: true }));

// // Cookie Parser
// app.use(cookieParser());

// // ============================================
// // API ROUTES
// // ============================================

// app.use("/api/v1", apiRoutes);

// // ============================================
// // SWAGGER DOCUMENTATION
// // ============================================

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// // ============================================
// // 404 HANDLER
// // ============================================

// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//     route: req.originalUrl,
//   });
// });

// // ============================================
// // ERROR HANDLER (Global)
// // ============================================

// app.use(
//   (
//     err: any,
//     req: express.Request,
//     res: express.Response,
//     next: express.NextFunction
//   ) => {
//     logger.error(`Error: ${err.message}`);

//     res.status(err.statusCode || 500).json({
//       success: false,
//       message: err.message || "Internal Server Error",
//       error: process.env.NODE_ENV === "development" ? err.message : undefined,
//     });
//   }
// );

// export default app;

// ==========================================
// File: src/app.ts (UPDATED - ADD POST + NOTIFICATION ROUTES)
// ==========================================
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.js";
import logger from "./config/logger.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";

// ✅ END NEW IMPORTS

const app: express.Express = express();
// ============================================
// MIDDLEWARES
// ============================================

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Security Headers with relaxed CSP for map resources
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com",
        ],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Cookie Parser
app.use(cookieParser());

// ============================================
// API ROUTES
// ============================================

app.use("/api/v1", apiRoutes);

// ============================================
// SWAGGER DOCUMENTATION
// ============================================

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    route: req.originalUrl,
  });
});

// ============================================
// ERROR HANDLER (Global)
// ============================================

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(`Error: ${err.message}`);

    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export default app;
