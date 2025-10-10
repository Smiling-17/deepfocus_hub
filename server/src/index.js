// server/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import statRoutes from "./routes/statRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ------------------------ CORS (hỗ trợ nhiều origin) ----------------------- */
const allowList = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// đảm bảo proxy cache theo Origin an toàn
app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

const corsOptions = {
  origin(origin, cb) {
    // Cho phép request không có Origin (curl, server-to-server)
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// nếu cần, bật preflight cho mọi route
app.options("*", cors(corsOptions));

/* ------------------------------- Middlewares ------------------------------- */
app.use(express.json({ limit: "1mb" })); // parse JSON body

/* --------------------------------- Routes --------------------------------- */
app.get("/", (req, res) => {
  res.json({ message: "DeepFocus Hub API đang hoạt động." });
});

app.use("/api/users", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/insights", insightRoutes);

/* --------------------------- 404 & error handler --------------------------- */
app.use(notFound);
app.use(errorHandler);

/* ------------------------------ Start server ------------------------------ */
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ Máy chủ đang lắng nghe tại cổng ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Không thể khởi động máy chủ:", error);
    process.exit(1);
  }
};

startServer();

// Bắt các lỗi không được catch để tránh crash âm thầm
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
