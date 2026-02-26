import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { searchYouTubeVideos } from "../controllers/youtubeController.js";

const router = express.Router();

router.use(protect);

router.get("/search", searchYouTubeVideos);

export default router;
