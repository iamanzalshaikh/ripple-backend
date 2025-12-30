import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes";
import logger from "./config/logger.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
// import { specs } from "./config/swagger.js";

const app = express();

// ============================================
// MIDDLEWARES
// ============================================

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Security Headers
app.use(helmet());

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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
