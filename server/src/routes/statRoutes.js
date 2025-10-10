import express from "express";
import { getOverviewStats } from "../controllers/statsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/overview", getOverviewStats);

export default router;
