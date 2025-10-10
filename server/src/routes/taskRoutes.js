import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  toggleTaskCompletion,
  deleteTask
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.patch("/:id/complete", toggleTaskCompletion);
router.delete("/:id", deleteTask);

export default router;
