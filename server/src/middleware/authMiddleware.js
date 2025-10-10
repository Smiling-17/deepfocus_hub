// server/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

/**
 * Lấy JWT từ request: ưu tiên Authorization: Bearer <token>,
 * fallback cookie 'token' (nếu bạn set cookie khi đăng nhập).
 */
function extractToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  // Nếu bạn không dùng cookie cho auth thì dòng dưới vẫn an toàn (sẽ undefined)
  return req.cookies?.token || null;
}

export const protect = async (req, res, next) => {
  try {
    // ✅ Không kiểm tra token cho preflight
    if (req.method === "OPTIONS") return next();

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục." });
    }

    // Xác thực token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });
    }

    // Chấp nhận nhiều khóa id trong payload
    const userId = decoded?.userId || decoded?.id || decoded?._id || decoded?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Token không chứa user id hợp lệ." });
    }

    // Tải user
    const user = await User.findById(userId).select("-password");
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
