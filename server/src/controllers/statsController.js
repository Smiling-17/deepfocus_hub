import dayjs from "dayjs";
import { DeepWorkSession } from "../models/DeepWorkSession.js";
import { Task } from "../models/Task.js";
import {
  buildHeatmap,
  buildWeeklyBreakdown,
  buildRatingDistribution,
  calculateStreaks,
  buildFocusWindows,
  calculateBadges
} from "../utils/statUtils.js";

export const getOverviewStats = async (req, res, next) => {
  try {
    const [sessions, tasks] = await Promise.all([
      DeepWorkSession.find({
        userId: req.user._id,
        status: "completed"
      })
        .sort({ endTime: -1 })
        .lean(),
      Task.find({ userId: req.user._id }).lean()
    ]);

    const totalMinutes = sessions.reduce(
      (sum, session) =>
        sum + (session.durationCompleted || session.durationSet || 0),
      0
    );
    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const completedSessions = sessions.length;
    const ratings = sessions
      .filter((session) => session.focusRating)
      .map((session) => session.focusRating);
    const averageRating =
      ratings.length > 0
        ? Number(
            (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)
          )
        : null;
    const totalPoints = sessions.reduce(
      (sum, session) => sum + (session.pointsEarned || 0),
      0
    );
    const distractionCount = sessions.reduce(
      (sum, session) => sum + (session.distractionTimestamps?.length || 0),
      0
    );
    const { currentStreak, longestStreak } = calculateStreaks(sessions);

    const stats = {
      totalMinutes,
      totalHours,
      completedSessions,
      averageRating,
      totalPoints,
      distractionCount,
      currentStreak,
      longestStreak,
      maxRating: ratings.length ? Math.max(...ratings) : 0,
      longSessionCount: sessions.filter(
        (session) => (session.durationSet || 0) >= 60
      ).length
    };

    const heatmap = buildHeatmap(sessions);
    const weeklyBreakdown = buildWeeklyBreakdown(sessions);
    const ratingDistribution = buildRatingDistribution(sessions);
    const focusWindows = buildFocusWindows(sessions);
    const badges = calculateBadges(stats);

    const taskSummary = {
      total: tasks.length,
      completed: tasks.filter((task) => task.isCompleted).length,
      upcoming: tasks.filter((task) =>
        dayjs(task.startTime).isAfter(dayjs(), "minute")
      ).length,
      overdue: tasks.filter(
        (task) =>
          !task.isCompleted && dayjs(task.endTime).isBefore(dayjs(), "minute")
      ).length
    };

    return res.json({
      metrics: {
        ...stats,
        averageDistractions:
          completedSessions > 0
            ? Number((distractionCount / completedSessions).toFixed(2))
            : 0
      },
      heatmap,
      weeklyBreakdown,
      ratingDistribution,
      focusWindows,
      badges,
      taskSummary,
      recentSessions: sessions.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
};
