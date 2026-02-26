import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    searchYouTubeVideos,
    getFavorites,
    addFavorite,
    removeFavorite
} from "../controllers/youtubeController.js";

const router = express.Router();

router.use(protect);

router.get("/search", searchYouTubeVideos);
router.get("/favorites", getFavorites);
router.post("/favorites", addFavorite);
router.delete("/favorites/:videoId", removeFavorite);

export default router;
