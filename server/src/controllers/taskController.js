import dayjs from "dayjs";
import { Task } from "../models/Task.js";

const parseDateRange = ({ date, from, to }) => {
  if (date) {
    const day = dayjs(date);
    if (!day.isValid()) {
      return null;
    }
    return {
      start: day.startOf("day").toDate(),
      end: day.endOf("day").toDate()
    };
  }

  const start = from ? dayjs(from) : null;
  const end = to ? dayjs(to) : null;

  if (from && (!start || !start.isValid())) {
    return null;
  }

  if (to && (!end || !end.isValid())) {
    return null;
  }

  if (start && end) {
    return {
      start: start.startOf("minute").toDate(),
      end: end.endOf("minute").toDate()
    };
  }

  if (start && !end) {
    return {
      start: start.startOf("minute").toDate(),
      end: dayjs(start).endOf("day").toDate()
    };
  }

  if (!start && end) {
    return {
      start: dayjs(end).startOf("day").toDate(),
      end: end.endOf("minute").toDate()
    };
  }

  const today = dayjs();
  return {
    start: today.startOf("day").toDate(),
    end: today.endOf("day").toDate()
  };
};

export const createTask = async (req, res, next) => {
  try {
    const { title, startTime, endTime, project = "" } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin nhiệm vụ."
      });
    }

    const start = dayjs(startTime);
    const end = dayjs(endTime);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        message: "Thời gian bắt đầu hoặc kết thúc không hợp lệ."
      });
    }

    if (end.isBefore(start)) {
      return res.status(400).json({
        message: "Thời gian kết thúc phải sau thời gian bắt đầu."
      });
    }

    const task = await Task.create({
      userId: req.user._id,
      title: title.trim(),
      startTime: start.toDate(),
      endTime: end.toDate(),
      project: project?.trim() || ""
    });

    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const range = parseDateRange(req.query);

    if (!range) {
      return res.status(400).json({
        message: "Khoảng thời gian không hợp lệ."
      });
    }

    const tasks = await Task.find({
      userId: req.user._id,
      startTime: { $lte: range.end },
      endTime: { $gte: range.start }
    })
      .sort({ startTime: 1 })
      .lean();

    return res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, project } = req.body;

    const task = await Task.findOne({ _id: id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({
        message: "Không tìm thấy nhiệm vụ."
      });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          message: "Tiêu đề không được để trống."
        });
      }
      task.title = title.trim();
    }

    if (startTime !== undefined) {
      const start = dayjs(startTime);
      if (!start.isValid()) {
        return res.status(400).json({
          message: "Thời gian bắt đầu không hợp lệ."
        });
      }
      task.startTime = start.toDate();
    }

    if (endTime !== undefined) {
      const end = dayjs(endTime);
      if (!end.isValid()) {
        return res.status(400).json({
          message: "Thời gian kết thúc không hợp lệ."
        });
      }
      task.endTime = end.toDate();
    }

    if (startTime !== undefined && endTime !== undefined) {
      if (dayjs(task.endTime).isBefore(dayjs(task.startTime))) {
        return res.status(400).json({
          message: "Thời gian kết thúc phải sau thời gian bắt đầu."
        });
      }
    }

    if (project !== undefined) {
      task.project = project?.trim() || "";
    }

    await task.save();

    return res.json(task);
  } catch (error) {
    next(error);
  }
};

export const toggleTaskCompletion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        message: "Không tìm thấy nhiệm vụ."
      });
    }

    task.isCompleted = Boolean(isCompleted);
    await task.save();

    return res.json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({
        message: "Không tìm thấy nhiệm vụ."
      });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
