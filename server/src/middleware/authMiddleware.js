import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Bạn cần đăng nhập để tiếp tục."
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(401).json({
          message: "Phiên đăng nhập không hợp lệ."
        });
      }

      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ."
      });
    }
  } catch (error) {
    next(error);
  }
};
