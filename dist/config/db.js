import mongoose from "mongoose";
import config from "./config.js";
const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("✅ MongoDB connected");
    }
    catch (error) {
        console.error("❌ MongoDB connection failed", error);
        process.exit(1);
    }
};
export default connectDB;
//# sourceMappingURL=db.js.map