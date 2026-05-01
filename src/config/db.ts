import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds to select a server
      connectTimeoutMS: 20000, // 20 seconds for initial connection
      socketTimeoutMS: 45000, // 45 seconds for inactive sockets
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
