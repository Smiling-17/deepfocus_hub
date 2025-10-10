import jwt from "jsonwebtoken";
import { User } from "../models/User.js";   // ✅ named import (khớp với export)

export const protect = async (req, res, next) => {
  try {
    // Cho preflight qua
    if (req.method === "OPTIONS") return next();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default protect;
