// server/src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

process.env.TZ = process.env.TZ || "Asia/Ho_Chi_Minh";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import statRoutes from "./routes/statRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import youtubeRoutes from "./routes/youtubeRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- BẮT BUỘC khi chạy sau proxy (Render) -------------------- */
app.set("trust proxy", 1);

/* ------------------------ CORS (hỗ trợ nhiều origin) ------------------------ */
const allowList = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

// Thêm các origin mặc định nếu không có CLIENT_ORIGIN
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://deepfocushub-smiling.vercel.app"
];

const allAllowedOrigins = allowList.length > 0 ? allowList : defaultOrigins;

console.log("🌐 Allowed CORS origins:", allAllowedOrigins);

// đảm bảo proxy/CDN cache an toàn theo Origin
app.use((_, res, next) => {
  res.header("Vary", "Origin");
  next();
});

const corsOptions = {
  origin(origin, cb) {
    // Cho phép request không có Origin (curl, server-to-server)
    if (!origin) return cb(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (allAllowedOrigins.includes(normalizedOrigin)) return cb(null, true);
    console.log("❌ CORS blocked origin:", normalizedOrigin);
    // KHÔNG ném error để tránh 500 ở preflight
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// xử lý preflight cho mọi route
app.options("*", cors(corsOptions));

/* ------------------------------- Middlewares ------------------------------- */
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Nếu vẫn còn OPTIONS lọt xuống dưới, trả 204 để không đi qua middleware khác
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    console.log("🔄 Handling OPTIONS request for:", req.path);
    return res.sendStatus(204);
  }
  next();
});

/* --------------------------------- Routes --------------------------------- */
app.get("/", (_req, res) => {
  res.json({ message: "DeepFocus Hub API đang hoạt động." });
});

// Debug middleware để log tất cả requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

app.use("/api/users", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/youtube", youtubeRoutes);

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

/* --------- Bắt các lỗi không được catch để tránh crash âm thầm --------- */
process.on("unhandledRejection", err => {
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", err => {
  console.error("Uncaught Exception:", err);
});
