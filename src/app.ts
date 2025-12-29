import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import routes from "./routes";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/v1", routes);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

export default app;
