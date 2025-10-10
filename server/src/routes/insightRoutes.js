import express from "express";
import { generateInsights } from "../controllers/insightController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/analyze", generateInsights);

export default router;
