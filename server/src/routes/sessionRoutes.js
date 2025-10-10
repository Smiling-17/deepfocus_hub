import express from "express";
import {
  getActiveSession,
  startSession,
  logPauseEvent,
  logDistraction,
  updateQuickNotes,
  completeSession,
  submitReview,
  getSessionHistory,
  getSessionById
} from "../controllers/sessionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/active", getActiveSession);
router.get("/history", getSessionHistory);
router.get("/:id", getSessionById);
router.post("/", startSession);
router.patch("/:id/pause", logPauseEvent);
router.patch("/:id/distraction", logDistraction);
router.patch("/:id/notes", updateQuickNotes);
router.patch("/:id/complete", completeSession);
router.post("/:id/rating", submitReview);

export default router;
