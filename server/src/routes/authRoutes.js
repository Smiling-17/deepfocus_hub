import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const router = express.Router();

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res, next) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      res.status(400);
      return res.json({
        message: "Vui lòng điền đầy đủ thông tin."
      });
    }

    if (password.length < 6) {
      res.status(400);
      return res.json({
        message: "Mật khẩu phải có ít nhất 6 ký tự."
      });
    }

    if (password !== confirmPassword) {
      res.status(400);
      return res.json({
        message: "Mật khẩu xác nhận không khớp."
      });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      res.status(409);
      return res.json({
        message: "Tên đăng nhập này đã được sử dụng."
      });
    }

    const user = await User.create({
      username: username.trim(),
      password
    });

    const token = createToken(user._id);

    res.status(201).json({
      message: "Đăng ký thành công.",
      token,
      user: {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400);
      return res.json({
        message: "Vui lòng điền đầy đủ thông tin."
      });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      res.status(401);
      return res.json({
        message: "Tên đăng nhập hoặc mật khẩu không chính xác."
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return res.json({
        message: "Tên đăng nhập hoặc mật khẩu không chính xác."
      });
    }

    const token = createToken(user._id);

    res.json({
      message: "Đăng nhập thành công.",
      token,
      user: {
        id: user._id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
