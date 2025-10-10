// server/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    // ✅ Cho phép preflight đi qua, đừng kiểm tra token trên OPTIONS
    if (req.method === "OPTIONS") return next();

    // Lấy token từ Header "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Bạn cần đăng nhập để tiếp tục.",
      });
    }

    // Xác thực token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
      });
    }

    // Tải user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        message: "Phiên đăng nhập không hợp lệ.",
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    // Bất cứ lỗi không mong muốn nào -> chuyển cho error handler
    return next(err);
  }
};

export default protect;
