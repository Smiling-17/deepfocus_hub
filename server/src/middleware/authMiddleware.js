// server/src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

/**
 * Lấy JWT từ Authorization header hoặc cookie header (không phụ thuộc cookie-parser)
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const tokenPair = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("token="));
    if (tokenPair) {
      return decodeURIComponent(tokenPair.split("=")[1] || "");
    }
  }

  return null;
}

export const protect = async (req, res, next) => {
  try {
    if (req.method === "OPTIONS") {
      return next();
    }

    const token = extractToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ message: "Bạn cần đăng nhập để tiếp tục." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." });
    }

    const userId =
      decoded?.userId || decoded?.id || decoded?._id || decoded?.sub;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Token không chứa user id hợp lệ." });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Phiên đăng nhập không hợp lệ." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export default protect;
