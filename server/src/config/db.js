import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`Đã kết nối MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error("Không thể kết nối MongoDB:", error.message);
    process.exit(1);
  }
};
