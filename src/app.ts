import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.js";
import config from "./config/config.js";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import logger from "./config/logger.js";
import { ApiError } from "./utils/http.js";

const app: express.Express = express();

app.use(
  cors({
    origin:
      config.NODE_ENV === "development" ? true : config.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(helmet());
app.use(
  morgan(config.NODE_ENV === "development" ? "dev" : "combined", {
    stream: {
      write: (msg) => logger.info(msg.trim()),
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1", apiRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error: req.originalUrl,
  });
});

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const isApiError = err instanceof ApiError;
    const status = isApiError ? err.statusCode : 500;

    const message = isApiError
      ? err.message
      : "Internal Server Error";

    const details =
      config.NODE_ENV === "development"
        ? err instanceof Error
          ? err.message
          : String(err)
        : undefined;

    logger.error("Unhandled error", err);
    res.status(status).json({
      success: false,
      message,
      ...(details ? { error: details } : {}),
    });
  },
);

export default app;
