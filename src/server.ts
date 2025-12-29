import { createServer } from "http";
import app from "./app";
import connectDB from "./config/db";
import config from "./config/config";
import { connectRedis } from "./config/redis";


const startServer = async () => {
  await connectDB();

  await connectRedis();

  const httpServer = createServer(app);

  httpServer.listen(config.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
  });
};

startServer();
