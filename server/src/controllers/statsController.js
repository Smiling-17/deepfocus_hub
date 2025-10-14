import dayjs from "../utils/dayjs.js";
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

    const now = dayjs();
    const monthStart = now.startOf("month");
    const monthEnd = now.endOf("month");

    const isWithinCurrentMonth = (date) => {
      const target = dayjs(date);
      return (
        target.isSame(monthStart, "month") && target.isSame(monthStart, "year")
      );
    };

    const monthlySessions = sessions.filter((session) =>
      isWithinCurrentMonth(session.endTime || session.startTime)
    );

    const monthlyTasks = tasks.filter((task) =>
      task.startTime ? isWithinCurrentMonth(task.startTime) : false
    );

    const monthlyMinutes = monthlySessions.reduce(
      (sum, session) =>
        sum + (session.durationCompleted || session.durationSet || 0),
      0
    );
    const monthlyHours = Number((monthlyMinutes / 60).toFixed(1));
    const monthlyCompletedSessions = monthlySessions.length;
    const monthlyRatings = monthlySessions
      .filter((session) => session.focusRating)
      .map((session) => session.focusRating);
    const monthlyAverageRating =
      monthlyRatings.length > 0
        ? Number(
            (
              monthlyRatings.reduce((sum, rating) => sum + rating, 0) /
              monthlyRatings.length
            ).toFixed(2)
          )
        : null;
    const monthlyPoints = monthlySessions.reduce(
      (sum, session) => sum + (session.pointsEarned || 0),
      0
    );
    const monthlyDistractionCount = monthlySessions.reduce(
      (sum, session) => sum + (session.distractionTimestamps?.length || 0),
      0
    );

    const { currentStreak, longestStreak } = calculateStreaks(sessions);

    const monthlyStats = {
      totalMinutes: monthlyMinutes,
      totalHours: monthlyHours,
      completedSessions: monthlyCompletedSessions,
      averageRating: monthlyAverageRating,
      totalPoints: monthlyPoints,
      distractionCount: monthlyDistractionCount,
      maxRating: monthlyRatings.length ? Math.max(...monthlyRatings) : 0,
      longSessionCount: monthlySessions.filter(
        (session) => (session.durationSet || 0) >= 60
      ).length
    };

    const heatmap = buildHeatmap(monthlySessions);
    const weeklyBreakdown = buildWeeklyBreakdown(monthlySessions);
    const ratingDistribution = buildRatingDistribution(monthlySessions);
    const focusWindows = buildFocusWindows(monthlySessions);

    const monthlyTaskSummary = {
      total: monthlyTasks.length,
      completed: monthlyTasks.filter((task) => task.isCompleted).length,
      upcoming: monthlyTasks.filter((task) =>
        dayjs(task.startTime).isAfter(now, "minute")
      ).length,
      overdue: monthlyTasks.filter(
        (task) =>
          !task.isCompleted && dayjs(task.endTime).isBefore(now, "minute")
      ).length
    };

    const overallRatings = sessions
      .filter((session) => session.focusRating)
      .map((session) => session.focusRating);
    const badges = calculateBadges({
      currentStreak,
      longestStreak,
      totalPoints: sessions.reduce(
        (sum, session) => sum + (session.pointsEarned || 0),
        0
      ),
      maxRating: overallRatings.length ? Math.max(...overallRatings) : 0,
      longSessionCount: sessions.filter(
        (session) => (session.durationSet || 0) >= 60
      ).length
    });

    return res.json({
      metrics: {
        ...monthlyStats,
        currentStreak,
        longestStreak,
        averageDistractions:
          monthlyCompletedSessions > 0
            ? Number(
                (monthlyDistractionCount / monthlyCompletedSessions).toFixed(2)
              )
            : 0,
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        }
      },
      heatmap,
      weeklyBreakdown,
      ratingDistribution,
      focusWindows,
      badges,
      taskSummary: monthlyTaskSummary,
      recentSessions: sessions.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
};
