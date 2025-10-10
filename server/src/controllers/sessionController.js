import dayjs from "dayjs";
import { DeepWorkSession } from "../models/DeepWorkSession.js";
import { Task } from "../models/Task.js";

const MAX_PAUSES = 2;
const MAX_PAUSE_SECONDS = 180;

export const getActiveSession = async (req, res, next) => {
  try {
    const session = await DeepWorkSession.findOne({
      userId: req.user._id,
      status: "in_progress"
    })
      .populate("taskId", "title startTime endTime project")
      .lean();

    if (!session) {
      return res.json(null);
    }

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id
    })
      .populate("taskId", "title startTime endTime project")
      .lean();

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm việc."
      });
    }

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const startSession = async (req, res, next) => {
  try {
    const { taskId, goal, durationMinutes = 50, startTime } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({
        message: "Mục tiêu phiên làm việc không được để trống."
      });
    }

    if (durationMinutes < 10 || durationMinutes > 240) {
      return res.status(400).json({
        message: "Thời lượng cần nằm trong khoảng 10 đến 240 phút."
      });
    }

    const existingActive = await DeepWorkSession.findOne({
      userId: req.user._id,
      status: "in_progress"
    });

    if (existingActive) {
      return res.status(400).json({
        message: "Bạn đang có một phiên Deep Work đang diễn ra."
      });
    }

    let relatedTask = null;
    if (taskId) {
      relatedTask = await Task.findOne({
        _id: taskId,
        userId: req.user._id
      });

      if (!relatedTask) {
        return res.status(404).json({
          message: "Không tìm thấy nhiệm vụ liên quan."
        });
      }
    }

    const session = await DeepWorkSession.create({
      userId: req.user._id,
      taskId: relatedTask?._id,
      goal: goal.trim(),
      durationSet: durationMinutes,
      startTime: startTime && dayjs(startTime).isValid()
        ? dayjs(startTime).toDate()
        : new Date()
    });

    return res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

export const logPauseEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startedAt, endedAt } = req.body;

    if (!startedAt || !endedAt) {
      return res.status(400).json({
        message: "Vui lòng cung cấp thời gian bắt đầu và kết thúc tạm dừng."
      });
    }

    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id,
      status: "in_progress"
    });

    if (!session) {
      return res.status(404).json({
        message: "Phiên làm việc không tồn tại hoặc đã kết thúc."
      });
    }

    if (session.pauseEvents.length >= MAX_PAUSES) {
      return res.status(400).json({
        message: "Bạn chỉ có thể tạm dừng tối đa 2 lần cho mỗi phiên."
      });
    }

    const start = dayjs(startedAt);
    const end = dayjs(endedAt);

    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return res.status(400).json({
        message: "Thời gian tạm dừng không hợp lệ."
      });
    }

    const diffSeconds = end.diff(start, "second");
    if (diffSeconds > MAX_PAUSE_SECONDS) {
      return res.status(400).json({
        message: "Mỗi lần tạm dừng tối đa 3 phút."
      });
    }

    session.pauseEvents.push({
      startedAt: start.toDate(),
      endedAt: end.toDate(),
      durationSeconds: diffSeconds
    });

    await session.save();

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const logDistraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timestamp } = req.body;

    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id,
      status: "in_progress"
    });

    if (!session) {
      return res.status(404).json({
        message: "Phiên làm việc không tồn tại hoặc đã kết thúc."
      });
    }

    const distractionTime = timestamp && dayjs(timestamp).isValid()
      ? dayjs(timestamp).toDate()
      : new Date();

    session.distractionTimestamps.push(distractionTime);
    await session.save();

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const updateQuickNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quickNotes = "" } = req.body;

    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id,
      status: { $in: ["in_progress", "completed"] }
    });

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm việc."
      });
    }

    session.quickNotes = quickNotes.slice(0, 2000);
    await session.save();

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { endTime, durationCompleted, quickNotes } = req.body;

    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id,
      status: "in_progress"
    });

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên làm việc đang diễn ra."
      });
    }

    const end = endTime && dayjs(endTime).isValid()
      ? dayjs(endTime).toDate()
      : new Date();

    session.endTime = end;
    session.durationCompleted =
      typeof durationCompleted === "number" && durationCompleted >= 0
        ? Math.min(durationCompleted, session.durationSet)
        : session.durationSet;
    session.quickNotes = quickNotes !== undefined ? quickNotes.slice(0, 2000) : session.quickNotes;
    session.status = "completed";

    await session.save();

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const submitReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { focusRating } = req.body;

    if (!focusRating || focusRating < 1 || focusRating > 5) {
      return res.status(400).json({
        message: "Vui lòng chọn mức đánh giá từ 1 đến 5 sao."
      });
    }

    const session = await DeepWorkSession.findOne({
      _id: id,
      userId: req.user._id,
      status: "completed"
    });

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy phiên cần đánh giá."
      });
    }

    session.focusRating = focusRating;
    const basePoints = session.durationCompleted || session.durationSet;
    session.pointsEarned = Math.round(basePoints + focusRating * 5);

    await session.save();

    return res.json(session);
  } catch (error) {
    next(error);
  }
};

export const getSessionHistory = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const sessions = await DeepWorkSession.find({
      userId: req.user._id,
      status: "completed"
    })
      .sort({ endTime: -1 })
      .limit(limit)
      .lean();

    return res.json(sessions);
  } catch (error) {
    next(error);
  }
};
